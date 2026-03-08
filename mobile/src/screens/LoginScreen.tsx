import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { resetPassword } from '../lib/firebase';
import * as Google from 'expo-auth-session/providers/google';

// Google OAuth Web Client ID from Firebase Console
const GOOGLE_WEB_CLIENT_ID = '289964730591-hfbr9vevgrkrrafngb5v97lcm5p16g80.apps.googleusercontent.com';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { login, googleLogin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // expo-auth-session hook for Google Sign-In
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
  });

  // Handle Google auth response
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleLogin(id_token);
    } else if (response?.type === 'error') {
      setIsGoogleLoading(false);
      Alert.alert('Google Sign-In Failed', response.error?.message || 'Something went wrong');
    } else if (response?.type === 'dismiss') {
      setIsGoogleLoading(false);
    }
  }, [response]);

  const handleGoogleLogin = async (idToken: string) => {
    try {
      await googleLogin(idToken);
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { detail?: string | Record<string, unknown> } }; message?: string };
      if (err.response?.status === 403) {
        const detail = err.response.data?.detail;
        if (typeof detail === 'object' && detail?.error === 'account_banned') {
          Alert.alert('Account Deactivated', 'Your account has been deactivated. Contact support.');
          return;
        }
      }
      Alert.alert('Login Failed', err.message || 'Could not sign in with Google');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string; response?: { status?: number; data?: { detail?: string | Record<string, unknown> } } };

      // Check for 403 banned account response
      if (err.response?.status === 403) {
        const detail = err.response.data?.detail;
        if (typeof detail === 'object' && detail?.error === 'account_banned') {
          const banDetail = detail as {
            reason?: string;
            reason_category?: string;
            is_temporary?: boolean;
            duration_days?: number;
            deactivated_at?: string;
          };
          let banMessage = 'Your account has been deactivated by an administrator.';
          if (banDetail.reason_category) {
            banMessage += `\n\nReason: ${banDetail.reason_category}`;
          }
          if (banDetail.reason) {
            banMessage += `\n${banDetail.reason}`;
          }
          if (banDetail.is_temporary && banDetail.duration_days) {
            banMessage += `\n\nDuration: ${banDetail.duration_days} day${banDetail.duration_days > 1 ? 's' : ''}`;
          }
          if (banDetail.deactivated_at) {
            banMessage += `\nSince: ${new Date(banDetail.deactivated_at).toLocaleDateString()}`;
          }
          banMessage += '\n\nIf you believe this is a mistake, please contact support.';

          Alert.alert('Account Deactivated', banMessage, [
            { text: 'OK', style: 'cancel' },
          ]);
          setIsLoading(false);
          return;
        }
      }

      let detail: string;
      // Firebase Auth error codes
      switch (err.code) {
        case 'auth/invalid-email':
          detail = 'Please enter a valid email address.';
          break;
        case 'auth/user-disabled':
          detail = 'This account has been disabled. Contact support.';
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          detail = 'Incorrect email or password.';
          break;
        case 'auth/too-many-requests':
          detail = 'Too many failed attempts. Please try again later or reset your password.';
          break;
        case 'auth/network-request-failed':
          detail = 'Network error. Please check your connection.';
          break;
        default:
          // Backend error (from firebase-login exchange)
          if (err.response?.data?.detail) {
            const d = err.response.data.detail;
            detail = typeof d === 'string' ? d : (d as Record<string, unknown>)?.message as string || 'Something went wrong. Please try again.';
          } else if (err.message) {
            detail = err.message;
          } else {
            detail = 'Something went wrong. Please try again.';
          }
      }

      Alert.alert('Login Failed', detail, [
        { text: 'Reset Password', onPress: () => handleForgotPassword() },
        { text: 'Create Account', onPress: () => navigation.navigate('Register') },
        { text: 'Try Again', style: 'cancel' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert(
        'Reset Password',
        'Please enter your email address in the email field first, then tap "Forgot password?"',
      );
      return;
    }
    sendResetEmail(email);
  };

  const sendResetEmail = async (targetEmail: string) => {
    setIsResetting(true);
    try {
      await resetPassword(targetEmail);
    } catch {
      // Show same message regardless for security
    } finally {
      setIsResetting(false);
      Alert.alert(
        'Reset Email Sent',
        `If an account exists for ${targetEmail}, a password reset link has been sent to your inbox.`,
      );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoBackground}>
            <Ionicons name="flame" size={40} color="white" />
          </View>
          <Text style={styles.title}>ChiliScope</Text>
          <Text style={styles.subtitle}>AI-Powered Heat Level Prediction</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={24}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity onPress={handleForgotPassword} disabled={isResetting}>
            <Text style={styles.forgotPassword}>
              {isResetting ? 'Sending reset email…' : 'Forgot password?'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signInButton}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.signInButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign-In */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={() => {
              setIsGoogleLoading(true);
              promptAsync();
            }}
            disabled={!request || isGoogleLoading}
          >
            {isGoogleLoading ? (
              <ActivityIndicator color="#4285F4" />
            ) : (
              <>
                <Image
                  source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                  style={styles.googleIcon}
                />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Register Link */}
        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>Sign up</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>© 2026 ChiliScope — TUP Taguig | Group 9</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoBackground: {
    backgroundColor: '#dc2626',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    color: '#6b7280',
    marginTop: 8,
    fontSize: 14,
  },
  form: {
    gap: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#4b5563',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1f2937',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    paddingRight: 48,
    color: '#1f2937',
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  forgotPassword: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
    marginBottom: 8,
  },
  signInButton: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 16,
  },
  signInButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 18,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    color: '#9ca3af',
    paddingHorizontal: 12,
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  googleButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 16,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  registerText: {
    color: '#6b7280',
  },
  registerLink: {
    color: '#dc2626',
    fontWeight: 'bold',
  },
  footer: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 40,
  },
});
