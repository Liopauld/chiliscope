/**
 * Firebase Configuration (Mobile)
 * ================================
 *
 * Uses the Firebase JS SDK which works in Expo Go without native modules.
 * Google Sign-In uses expo-auth-session to get an ID token,
 * then signs in to Firebase with GoogleAuthProvider.credential().
 */

import { initializeApp, getApps } from 'firebase/app';
import {
  initializeAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  onAuthStateChanged,
  sendPasswordResetEmail as firebaseSendPasswordReset,
  sendEmailVerification,
  type User as FirebaseUser,
} from 'firebase/auth';
// @ts-ignore – getReactNativePersistence is exported from the internal package
import { getReactNativePersistence } from '@firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';

// Complete any pending auth sessions (required for Expo web browser redirect)
WebBrowser.maybeCompleteAuthSession();

const firebaseConfig = {
  apiKey: 'AIzaSyAvZhPw38elm8iaFxmieAymSzuCbyGCP1E',
  authDomain: 'chiliscope-65628.firebaseapp.com',
  projectId: 'chiliscope-65628',
  storageBucket: 'chiliscope-65628.firebasestorage.app',
  messagingSenderId: '289964730591',
  appId: '1:289964730591:web:4988fe229fe3128b8ca16a',
};

// Prevent re-initialization on hot reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Use React Native persistence so the Firebase session survives app restarts
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

// ── Helper functions ────────────────────────────────────────────

/** Sign in with email & password */
export async function firebaseEmailLogin(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

/** Register with email & password */
export async function firebaseEmailRegister(
  email: string,
  password: string,
  displayName: string,
) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  return cred;
}

/**
 * Sign in to Firebase using a Google ID token obtained from expo-auth-session.
 * Called from the LoginScreen after the Google OAuth hook completes.
 */
export async function signInWithGoogleIdToken(idToken: string) {
  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, credential);
}

/** Sign out */
export async function firebaseLogout() {
  return signOut(auth);
}

/** Send email verification to current user */
export async function sendVerificationEmail() {
  const user = auth.currentUser;
  if (!user) throw new Error('No user signed in');
  return sendEmailVerification(user);
}

/** Send a password reset email */
export async function resetPassword(email: string) {
  return firebaseSendPasswordReset(auth, email);
}

/** Get current user's Firebase ID token (to send to backend) */
export async function getFirebaseIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

/** Force-refresh the ID token */
export async function refreshFirebaseIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken(true);
}

export { auth, onAuthStateChanged };
export type { FirebaseUser };
