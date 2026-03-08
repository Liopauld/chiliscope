import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as storage from '../utils/storage';
import { authApi, onUnauthorized } from '../api/client';
import {
  auth as firebaseAuth,
  firebaseEmailLogin,
  firebaseEmailRegister,
  firebaseLogout,
  signInWithGoogleIdToken,
  onAuthStateChanged,
  type FirebaseUser,
} from '../lib/firebase';

interface User {
  user_id: string;
  email: string;
  full_name: string;
  user_type: 'user' | 'researcher' | 'admin';
  is_active: boolean;
  profile_image?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: (googleIdToken: string) => Promise<void>;
  register: (email: string, password: string, name: string, userType?: 'user' | 'researcher') => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Exchange a Firebase user's ID token for a local backend JWT.
 * Calls POST /auth/firebase-login which finds-or-creates the
 * user in MongoDB and returns { access_token, user }.
 */
async function exchangeFirebaseToken(
  firebaseUser: FirebaseUser,
  fullName?: string,
  userType?: string,
) {
  const idToken = await firebaseUser.getIdToken();
  const response = await authApi.firebaseLogin(
    idToken,
    fullName || firebaseUser.displayName || undefined,
    userType,
  );
  return response;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    onUnauthorized(logout);

    // Listen to Firebase auth state.
    // When Firebase has a persisted session the listener fires with
    // a valid FirebaseUser and we can exchange the token silently.
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      if (fbUser) {
        try {
          const response = await exchangeFirebaseToken(fbUser);
          await storage.setItem('authToken', response.access_token);
          await storage.setItem('user', JSON.stringify(response.user));
          setToken(response.access_token);
          setUser(response.user);
        } catch (err: unknown) {
          const axiosErr = err as { response?: { status?: number; data?: { detail?: { error?: string } } } };
          if (axiosErr.response?.status === 403 && axiosErr.response?.data?.detail?.error === 'account_banned') {
            // Account is banned — sign out Firebase and clear local data
            console.log('Account is banned, signing out');
            try { await firebaseLogout(); } catch { /* ignore */ }
            await storage.deleteItem('authToken');
            await storage.deleteItem('user');
            setToken(null);
            setUser(null);
            setIsLoading(false);
            return;
          }
          console.log('Firebase session exists but backend exchange failed:', err);
          const storedToken = await storage.getItem('authToken');
          const storedUser = await storage.getItem('user');
          if (storedToken && storedUser) {
            console.log('Using cached auth data');
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
          }
        }
      } else {
        await storage.deleteItem('authToken');
        await storage.deleteItem('user');
        setToken(null);
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const cred = await firebaseEmailLogin(email, password);
    const response = await exchangeFirebaseToken(cred.user);

    await storage.setItem('authToken', response.access_token);
    await storage.setItem('user', JSON.stringify(response.user));
    setToken(response.access_token);
    setUser(response.user);
  };

  const googleLogin = async (googleIdToken: string) => {
    const cred = await signInWithGoogleIdToken(googleIdToken);
    const response = await exchangeFirebaseToken(cred.user);

    await storage.setItem('authToken', response.access_token);
    await storage.setItem('user', JSON.stringify(response.user));
    setToken(response.access_token);
    setUser(response.user);
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    userType: 'user' | 'researcher' = 'user',
  ) => {
    const cred = await firebaseEmailRegister(email, password, name);
    const response = await exchangeFirebaseToken(cred.user, name, userType);

    await storage.setItem('authToken', response.access_token);
    await storage.setItem('user', JSON.stringify(response.user));
    setToken(response.access_token);
    setUser(response.user);
  };

  const refreshProfile = async () => {
    try {
      const profile = await authApi.getProfile();
      await storage.setItem('user', JSON.stringify(profile));
      setUser(profile);
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  };

  const logout = async () => {
    try {
      await firebaseLogout();
    } catch {
      // Firebase sign-out may fail if offline
    }
    await storage.deleteItem('authToken');
    await storage.deleteItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token,
        login,
        googleLogin,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
