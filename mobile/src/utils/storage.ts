import { Platform } from 'react-native';

/**
 * Cross-platform secure storage wrapper.
 * - Native (iOS/Android): uses expo-secure-store
 * - Web: falls back to localStorage
 */

let SecureStore: typeof import('expo-secure-store') | null = null;

if (Platform.OS !== 'web') {
  // Only import SecureStore on native platforms
  SecureStore = require('expo-secure-store');
}

export async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return SecureStore!.getItemAsync(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch {
      // localStorage may be full or blocked
    }
    return;
  }
  return SecureStore!.setItemAsync(key, value);
}

export async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    return;
  }
  return SecureStore!.deleteItemAsync(key);
}
