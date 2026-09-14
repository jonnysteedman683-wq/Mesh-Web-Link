import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  User, 
  LogIn, 
  LogOut, 
  Sparkles, 
  Database, 
  Key, 
  CheckCircle2, 
  AlertCircle,
  Radio
} from 'lucide-react';
import { 
  auth, 
  signInWithGoogle, 
  signInAsGuest, 
  signOutUser, 
  subscribeToAuth 
} from '../services/firebase';
import { User as FirebaseUser } from 'firebase/auth';

export const FirebaseAuthBar: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [callsign, setCallsign] = useState<string>('COMMANDER');
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      setCurrentUser(user);
      if (user) {
        setCallsign(
          user.displayName
            ? user.displayName.toUpperCase().replace(/\s+/g, '-')
            : `OPERATOR-${user.uid.slice(0, 5).toUpperCase()}`
        );
      }
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.warn('Google Sign-in popup error:', err);
      setAuthError(err?.message || 'Authentication cancelled');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGuestSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await signInAsGuest(`TAC-OPERATOR-${Math.floor(1000 + Math.random() * 9000)}`);
    } catch (err: any) {
      console.warn('Guest sign-in error:', err);
      setAuthError(err?.message || 'Guest login failed');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.warn('Sign out error:', err);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {currentUser ? (
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-lg px-2.5 py-1">
          <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-400 flex items-center justify-center text-indigo-300 font-mono text-[10px] font-bold overflow-hidden">
            {currentUser.photoURL ? (
              <img src={currentUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-3 h-3" />
            )}
          </div>
          <div className="flex flex-col text-left">
            <span className="font-mono text-[11px] font-bold text-slate-200 leading-tight">
              {callsign}
            </span>
            <span className="font-mono text-[9px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-2.5 h-2.5" /> AUTHENTICATED
            </span>
          </div>
          <button
            onClick={handleSignOut}
            className="ml-1 p-1 text-slate-400 hover:text-rose-400 transition-colors"
            title="Sign Out of Mesh Fabric"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-lg text-xs font-mono font-medium border border-indigo-400/40 shadow-sm transition-all"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Google Sign-In</span>
          </button>
          <button
            onClick={handleGuestSignIn}
            disabled={isSigningIn}
            className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-mono border border-slate-700 transition-colors"
            title="Fast Anonymous Auth"
          >
            Guest Auth
          </button>
        </div>
      )}

      {authError && (
        <span className="text-[10px] text-rose-400 font-mono hidden md:inline truncate max-w-[150px]" title={authError}>
          {authError}
        </span>
      )}
    </div>
  );
};
