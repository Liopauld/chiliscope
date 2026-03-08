/**
 * Firebase Configuration
 * ======================
 *
 * Initializes Firebase app and exports auth instance.
 * All config values are loaded from environment variables.
 *
 * Create a `.env` file in the frontend root with:
 *   VITE_FIREBASE_API_KEY=...
 *   VITE_FIREBASE_AUTH_DOMAIN=...
 *   VITE_FIREBASE_PROJECT_ID=...
 *   VITE_FIREBASE_STORAGE_BUCKET=...
 *   VITE_FIREBASE_MESSAGING_SENDER_ID=...
 *   VITE_FIREBASE_APP_ID=...
 */

import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail as firebaseSendPasswordReset,
  fetchSignInMethodsForEmail,
  type User as FirebaseUser,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const googleProvider = new GoogleAuthProvider()

// ── Helper functions ────────────────────────────────────────────

/** Sign in with email & password */
export async function firebaseEmailLogin(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password)
}

/** Register with email & password */
export async function firebaseEmailRegister(
  email: string,
  password: string,
  displayName: string
) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(cred.user, { displayName })
  return cred
}

/** Sign in with Google popup */
export async function firebaseGoogleLogin() {
  return signInWithPopup(auth, googleProvider)
}

/** Sign out */
export async function firebaseLogout() {
  return signOut(auth)
}

/** Send email verification to current user */
export async function sendVerificationEmail() {
  const user = auth.currentUser
  if (!user) throw new Error('No user signed in')
  return sendEmailVerification(user)
}

/** Send a password reset email */
export async function resetPassword(email: string) {
  return firebaseSendPasswordReset(auth, email)
}

/** Check if an email is registered in Firebase */
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const methods = await fetchSignInMethodsForEmail(auth, email)
    return methods.length > 0
  } catch {
    return false
  }
}

/** Reload the current Firebase user to refresh emailVerified flag */
export async function reloadFirebaseUser() {
  const user = auth.currentUser
  if (!user) return null
  await user.reload()
  return auth.currentUser
}

/** Get current user's Firebase ID token (to send to backend) */
export async function getFirebaseIdToken(): Promise<string | null> {
  const user = auth.currentUser
  if (!user) return null
  return user.getIdToken()
}

/** Force-refresh the ID token */
export async function refreshFirebaseIdToken(): Promise<string | null> {
  const user = auth.currentUser
  if (!user) return null
  return user.getIdToken(true)
}

export { auth, googleProvider, onAuthStateChanged }
export type { FirebaseUser }
