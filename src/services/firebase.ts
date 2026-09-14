import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInAnonymously, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  getDocFromServer,
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  Firestore
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Use custom firestore databaseId if specified in config, otherwise default
let db: Firestore;
try {
  if (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)') {
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } else {
    db = getFirestore(app);
  }
} catch {
  db = getFirestore(app);
}

export { app, auth, db };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Hardened Security Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection check as required by Firebase skill
export async function validateConnectionToFirestore() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Client offline or waiting for Firebase connectivity.");
    }
  }
}
validateConnectionToFirestore();

// Auth helper methods
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  await recordUserProfile(result.user);
  return result.user;
}

export async function signInAsGuest(callsign?: string) {
  const result = await signInAnonymously(auth);
  await recordUserProfile(result.user, callsign || 'TACTICAL-GUEST');
  return result.user;
}

export async function signOutUser() {
  await fbSignOut(auth);
}

export function subscribeToAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function recordUserProfile(user: User, customCallsign?: string) {
  const userPath = `users/${user.uid}`;
  try {
    const userRef = doc(db, 'users', user.uid);
    const existing = await getDoc(userRef);
    if (!existing.exists()) {
      await setDoc(userRef, {
        userId: user.uid,
        email: user.email || 'anonymous@mesh.link',
        displayName: user.displayName || customCallsign || 'Operator',
        callsign: customCallsign || (user.displayName ? user.displayName.toUpperCase().replace(/\s+/g, '-') : `COMMANDER-${user.uid.slice(0, 4).toUpperCase()}`),
        clearanceLevel: 'LEVEL_4_SECRET',
        photoURL: user.photoURL || '',
        createdAt: Date.now(),
        lastLoginAt: Date.now()
      });
    } else {
      await setDoc(userRef, { lastLoginAt: Date.now() }, { merge: true });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, userPath);
  }
}

// Firestore direct helpers for Directives & Telemetry
export async function saveDirectiveToCloud(directive: any, userId?: string) {
  const currentUid = userId || auth.currentUser?.uid;
  if (!currentUid) {
    console.warn('Authentication required to persist directives under hardened security rules.');
    return false;
  }
  const targetId = directive.id || `dir-${Date.now()}`;
  const dPath = `directives/${targetId}`;
  try {
    const dRef = doc(db, 'directives', targetId);
    await setDoc(dRef, {
      ...directive,
      id: targetId,
      userId: currentUid,
      savedAt: Date.now()
    }, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, dPath);
  }
}

export async function saveTelemetryToCloud(telemetry: any, userId?: string) {
  const currentUid = userId || auth.currentUser?.uid;
  if (!currentUid) {
    console.warn('Authentication required to persist telemetry logs under hardened security rules.');
    return false;
  }
  const targetId = telemetry.id || `telem-${Date.now()}`;
  const tPath = `telemetry_logs/${targetId}`;
  try {
    const tRef = doc(db, 'telemetry_logs', targetId);
    await setDoc(tRef, {
      ...telemetry,
      id: targetId,
      userId: currentUid,
      recordedAt: Date.now()
    }, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, tPath);
  }
}

export async function saveChatMessageToCloud(sessionId: string, message: any) {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) {
    console.warn('Authentication required to save chat messages under hardened security rules.');
    return false;
  }
  const sessionPath = `chat_sessions/${sessionId}`;
  const msgCollPath = `chat_sessions/${sessionId}/messages`;
  try {
    // Ensure parent chat_session document exists first to fulfill Master Gate rule
    const sessionRef = doc(db, 'chat_sessions', sessionId);
    await setDoc(sessionRef, {
      id: sessionId,
      userId: currentUid,
      title: message.role === 'user' ? (message.content?.slice(0, 48) || 'Tactical Session') : 'Tactical Chat Session',
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    }, { merge: true });

    const coll = collection(db, 'chat_sessions', sessionId, 'messages');
    await addDoc(coll, {
      ...message,
      sessionId,
      userId: currentUid,
      createdAt: Date.now()
    });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, msgCollPath);
  }
}

export function subscribeToSessionMessages(sessionId: string, callback: (messages: any[]) => void) {
  const path = `chat_sessions/${sessionId}/messages`;
  const coll = collection(db, 'chat_sessions', sessionId, 'messages');
  const q = query(coll, orderBy('timestamp', 'asc'), limit(100));
  return onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(msgs);
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, path);
  });
}
