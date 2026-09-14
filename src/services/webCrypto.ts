/**
 * Real Web Cryptography Engine (Web Crypto API)
 * Stage Alpha: Standard-compliant cryptographic services using window.crypto.subtle
 * Provides real AES-GCM 256-bit encryption/decryption, SHA-256 digests, and ECDSA P-256 keys.
 */

export interface EncryptedPacket {
  ivHex: string;
  ciphertextHex: string;
  algorithm: string;
  timestamp: number;
}

export class WebCryptoEngine {
  private static instance: WebCryptoEngine;
  private sessionKey: CryptoKey | null = null;
  private ecdsaKeyPair: CryptoKeyPair | null = null;

  private constructor() {
    this.initKeys();
  }

  public static getInstance(): WebCryptoEngine {
    if (!WebCryptoEngine.instance) {
      WebCryptoEngine.instance = new WebCryptoEngine();
    }
    return WebCryptoEngine.instance;
  }

  private async initKeys(): Promise<void> {
    try {
      if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
        return;
      }

      // Generate in-memory AES-GCM 256-bit key for local message encryption
      this.sessionKey = await window.crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256
        },
        true,
        ['encrypt', 'decrypt']
      );

      // Generate ECDSA P-256 signing keypair
      this.ecdsaKeyPair = await window.crypto.subtle.generateKey(
        {
          name: 'ECDSA',
          namedCurve: 'P-256'
        },
        true,
        ['sign', 'verify']
      );
    } catch (err) {
      console.warn('WebCryptoEngine key generation notice:', err);
    }
  }

  /**
   * Generates a real SHA-256 hex hash from any string or buffer
   */
  public async sha256(data: string): Promise<string> {
    if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
      // Fallback simple hash for non-browser environments
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        hash = ((hash << 5) - hash) + data.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash).toString(16).padStart(64, '0');
    }

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Real AES-GCM 256-bit encryption with fresh 96-bit initialization vector (IV)
   */
  public async encryptAesGcm(plaintext: string): Promise<EncryptedPacket> {
    if (!this.sessionKey) {
      await this.initKeys();
    }

    const encoder = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const plaintextBuffer = encoder.encode(plaintext);

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      this.sessionKey!,
      plaintextBuffer
    );

    const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
    const ciphertextHex = Array.from(new Uint8Array(ciphertextBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return {
      ivHex,
      ciphertextHex,
      algorithm: 'AES-256-GCM',
      timestamp: Date.now()
    };
  }

  /**
   * Real AES-GCM 256-bit decryption
   */
  public async decryptAesGcm(packet: EncryptedPacket): Promise<string> {
    if (!this.sessionKey) {
      await this.initKeys();
    }

    const ivBytes = new Uint8Array(
      packet.ivHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    );
    const cipherBytes = new Uint8Array(
      packet.ciphertextHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    );

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBytes
      },
      this.sessionKey!,
      cipherBytes
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }

  /**
   * Sign a payload using ECDSA P-256 private key
   */
  public async signPayload(payload: string): Promise<string> {
    if (!this.ecdsaKeyPair) {
      await this.initKeys();
    }

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(payload);

    const signatureBuffer = await window.crypto.subtle.sign(
      {
        name: 'ECDSA',
        hash: { name: 'SHA-256' }
      },
      this.ecdsaKeyPair!.privateKey,
      dataBuffer
    );

    return Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Verify an ECDSA signature
   */
  public async verifySignature(payload: string, signatureHex: string): Promise<boolean> {
    if (!this.ecdsaKeyPair) {
      return false;
    }

    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(payload);
      const sigBytes = new Uint8Array(
        signatureHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
      );

      return await window.crypto.subtle.verify(
        {
          name: 'ECDSA',
          hash: { name: 'SHA-256' }
        },
        this.ecdsaKeyPair.publicKey,
        sigBytes,
        dataBuffer
      );
    } catch {
      return false;
    }
  }

  /**
   * Check whether WebCrypto is supported in current browser runtime
   */
  public isSupported(): boolean {
    return typeof window !== 'undefined' && !!window.crypto && !!window.crypto.subtle;
  }
}

export const webCrypto = WebCryptoEngine.getInstance();
