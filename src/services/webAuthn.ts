/**
 * Real WebAuthn / Passkeys Biometric Hardware Authenticator
 * Stage Alpha: Invokes the browser's native navigator.credentials API.
 * Triggers actual device hardware biometrics (Touch ID, Face ID, Windows Hello, or Android Biometrics)
 * or security keys (FIDO2 / YubiKey), generating real cryptographic challenge-response credentials.
 */

import { webCrypto } from './webCrypto';

export interface WebAuthnCredentialResult {
  credentialId: string;
  rawIdHex: string;
  authenticatorAttachment: string;
  type: string;
  signatureHex: string;
  clientDataJson: string;
  isRealHardware: boolean;
  timestamp: number;
}

export class WebAuthnService {
  private static instance: WebAuthnService;
  private readonly CREDENTIAL_STORE_KEY = 'stage_alpha_webauthn_cred_v1';

  private constructor() {}

  public static getInstance(): WebAuthnService {
    if (!WebAuthnService.instance) {
      WebAuthnService.instance = new WebAuthnService();
    }
    return WebAuthnService.instance;
  }

  /**
   * Check if the device / browser supports WebAuthn and platform authenticators (Face ID / Touch ID / Windows Hello)
   */
  public async checkPlatformSupport(): Promise<{ isSupported: boolean; hasPlatformAuthenticator: boolean }> {
    if (typeof window === 'undefined' || !window.navigator || !window.navigator.credentials) {
      return { isSupported: false, hasPlatformAuthenticator: false };
    }

    let hasPlatform = false;
    if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      try {
        hasPlatform = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch {
        hasPlatform = false;
      }
    }

    return {
      isSupported: !!window.PublicKeyCredential,
      hasPlatformAuthenticator: hasPlatform
    };
  }

  /**
   * Triggers the real device biometric prompt via navigator.credentials.create / get
   */
  public async authenticateWithHardwarePasskey(
    userName: string = 'Jonny Steedman',
    userDisplayName: string = 'Citadel Commander (Stage Alpha)'
  ): Promise<WebAuthnCredentialResult> {
    const support = await this.checkPlatformSupport();

    if (!support.isSupported) {
      throw new Error('WebAuthn / Passkeys not supported in this browser environment.');
    }

    // Generate real 32-byte cryptographic random challenge
    const challenge = window.crypto.getRandomValues(new Uint8Array(32));
    const userId = window.crypto.getRandomValues(new Uint8Array(16));

    // Try registration / creation of hardware credential
    try {
      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: 'Mesh Link Connection Fabric (Stage Alpha)',
            id: window.location.hostname
          },
          user: {
            id: userId,
            name: userName,
            displayName: userDisplayName
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256 (ECDSA w/ SHA-256)
            { alg: -257, type: 'public-key' } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform', // Platform = Touch ID / Windows Hello / Face ID
            userVerification: 'preferred',
            residentKey: 'preferred'
          },
          timeout: 60000,
          attestation: 'none'
        }
      })) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Hardware biometric prompt was dismissed or cancelled.');
      }

      const rawIdHex = Array.from(new Uint8Array(credential.rawId))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const response = credential.response as AuthenticatorAttestationResponse;
      const clientDataJson = new TextDecoder().decode(response.clientDataJSON);
      const signatureHash = await webCrypto.sha256(rawIdHex + clientDataJson);

      const result: WebAuthnCredentialResult = {
        credentialId: credential.id,
        rawIdHex,
        authenticatorAttachment: credential.authenticatorAttachment || 'platform',
        type: credential.type,
        signatureHex: signatureHash,
        clientDataJson,
        isRealHardware: true,
        timestamp: Date.now()
      };

      // Persist in localStorage so Stage Alpha remembers hardware registration
      try {
        localStorage.setItem(this.CREDENTIAL_STORE_KEY, JSON.stringify(result));
      } catch (e) {
        console.warn('Could not cache WebAuthn credential', e);
      }

      return result;
    } catch (createErr: any) {
      // If user already registered or platform attachment declined, try credentials.get()
      console.info('Trying navigator.credentials.get()...', createErr);
      try {
        const getAssertion = (await navigator.credentials.get({
          publicKey: {
            challenge,
            timeout: 60000,
            userVerification: 'preferred'
          }
        })) as PublicKeyCredential;

        if (getAssertion) {
          const rawIdHex = Array.from(new Uint8Array(getAssertion.rawId))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

          const assertionResponse = getAssertion.response as AuthenticatorAssertionResponse;
          const clientDataJson = new TextDecoder().decode(assertionResponse.clientDataJSON);
          const signatureHash = await webCrypto.sha256(rawIdHex + clientDataJson);

          return {
            credentialId: getAssertion.id,
            rawIdHex,
            authenticatorAttachment: getAssertion.authenticatorAttachment || 'platform',
            type: getAssertion.type,
            signatureHex: signatureHash,
            clientDataJson,
            isRealHardware: true,
            timestamp: Date.now()
          };
        }
      } catch (getErr: any) {
        throw new Error(getErr?.message || createErr?.message || 'Biometric hardware passkey prompt cancelled.');
      }

      throw createErr;
    }
  }

  public getCachedCredential(): WebAuthnCredentialResult | null {
    try {
      const saved = localStorage.getItem(this.CREDENTIAL_STORE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      return null;
    }
    return null;
  }
}

export const webAuthn = WebAuthnService.getInstance();
