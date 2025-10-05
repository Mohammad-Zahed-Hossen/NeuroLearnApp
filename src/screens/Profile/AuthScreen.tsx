import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  GlassCard,
  Button,
  ScreenContainer,
} from '../../components/GlassComponents';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme/colors';
import { ThemeType } from '../../theme/colors';
import SupabaseService from '../../services/storage/SupabaseService';

interface AuthScreenProps {
  theme: ThemeType;
  onAuthenticated: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  theme,
  onAuthenticated,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const themeColors = colors[theme];
  const supabaseService = SupabaseService.getInstance();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[a-zA-Z]/.test(pwd)) {
      return 'Password must contain at least one letter';
    }
    if (!/\d/.test(pwd)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const getPasswordStrength = (pwd: string): { strength: string; color: string } => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) strength++;

    if (strength <= 2) return { strength: 'Weak', color: '#ef4444' };
    if (strength <= 3) return { strength: 'Medium', color: '#f59e0b' };
    return { strength: 'Strong', color: '#10b981' };
  };

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!validateEmail(email)) {
      return;
    }

    if (isSignUp) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        setPasswordError(passwordError);
        Alert.alert('Weak Password', passwordError);
        return;
      }

      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }
    }

    setLoading(true);
    setEmailError('');
    setPasswordError('');

    try {
      let result;
      if (isSignUp) {
        result = await supabaseService.signUp(email, password);
        if (result.error) {
          throw result.error;
        }
        Alert.alert(
          'Success',
          'Account created! Please check your email to verify your account.',
          [{
            text: 'OK',
            onPress: () => {
              setIsSignUp(false);
              setEmail('');
              setPassword('');
              setConfirmPassword('');
            }
          }],
        );
      } else {
        result = await supabaseService.signIn(email, password);
        if (result.error) {
          throw result.error;
        }
        onAuthenticated();
      }
    } catch (error: any) {
      let errorMessage = 'Authentication failed';

      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Please verify your email before signing in';
      } else if (error.message.includes('User already registered')) {
        errorMessage = 'An account with this email already exists';
      } else {
        errorMessage = error.message;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Enter Email', 'Please enter your email address to reset password');
      return;
    }

    if (!validateEmail(email)) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabaseService.resetPassword(email);
      if (error) throw error;

      Alert.alert(
        'Password Reset',
        'Check your email for password reset instructions',
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricAuth = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        Alert.alert('Error', 'Biometric authentication is not supported on this device');
        return;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        Alert.alert('Error', 'No biometrics enrolled. Please set up biometrics on your device.');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to sign in',
        fallbackLabel: 'Use Passcode',
      });

      if (result.success) {
        // You can implement auto sign-in or token retrieval here
        Alert.alert('Success', 'Biometric authentication successful');
        onAuthenticated();
      } else {
        Alert.alert('Error', 'Biometric authentication failed');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Biometric authentication error');
    }
  };

  // Social Login handlers (Google, Apple) with Supabase OAuth
  // CONFIGURATION REQUIRED: To enable social login, follow these steps:
  // 1. Go to your Supabase dashboard > Authentication > Providers
  // 2. Enable Google provider: Add your Google OAuth client ID and secret
  // 3. Enable Apple provider: Add your Apple Sign-In service ID and private key
  // 4. Add these redirect URLs for both providers:
  //    - https://hitywyvtckdnwkmwwlxr.supabase.co/auth/v1/callback (Supabase callback)
  //    - neurolearn:// (for mobile deep linking)
  // 5. Ensure your app.config.js has proper scheme configuration (already done)
  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseService.getClient().auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'neurolearn://',
        },
      });
      if (error) throw error;
      // OAuth flow will redirect user, handle post-login in auth state change listener
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseService.getClient().auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: 'neurolearn://',
        },
      });
      if (error) throw error;
      // OAuth flow will redirect user, handle post-login in auth state change listener
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Apple sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = isSignUp && password ? getPasswordStrength(password) : null;

  return (
    <ScreenContainer theme={theme}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: themeColors.text }]}>
                NeuroLearn
              </Text>
              <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
                Evidence-Based Learning System
              </Text>
            </View>

            <GlassCard theme={theme} style={styles.authCard}>
              <Text style={[styles.authTitle, { color: themeColors.text }]}>
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </Text>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                  Email
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: emailError ? '#ef4444' : themeColors.border,
                      color: themeColors.text,
                      backgroundColor: themeColors.surfaceLight,
                    },
                  ]}
                  placeholder="Enter your email"
                  placeholderTextColor={themeColors.textMuted}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setEmailError('');
                  }}
                  onBlur={() => validateEmail(email)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  accessibilityLabel="Email input field"
                  accessibilityHint="Enter your email address"
                />
                {emailError ? (
                  <Text style={styles.errorText}>{emailError}</Text>
                ) : null}
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                  Password
                </Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      styles.passwordInput,
                      {
                        borderColor: passwordError ? '#ef4444' : themeColors.border,
                        color: themeColors.text,
                        backgroundColor: themeColors.surfaceLight,
                      },
                    ]}
                    placeholder="Enter your password"
                    placeholderTextColor={themeColors.textMuted}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      setPasswordError('');
                    }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    accessibilityLabel="Password input field"
                    accessibilityHint="Enter your password"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                    accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                    accessibilityRole="button"
                  >
                    <Text style={{ color: themeColors.textSecondary }}>
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {passwordError ? (
                  <Text style={styles.errorText}>{passwordError}</Text>
                ) : null}

                {passwordStrength && (
                  <View style={styles.passwordStrengthContainer}>
                    <Text style={[styles.passwordStrengthText, { color: passwordStrength.color }]}>
                      {passwordStrength.strength}
                    </Text>
                    <View style={styles.strengthBar}>
                      <View
                        style={[
                          styles.strengthBarFill,
                          {
                            backgroundColor: passwordStrength.color,
                            width: passwordStrength.strength === 'Weak' ? '33%' :
                                   passwordStrength.strength === 'Medium' ? '66%' : '100%',
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}
              </View>

              {isSignUp && (
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                    Confirm Password
                  </Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[
                        styles.input,
                        styles.passwordInput,
                        {
                          borderColor: themeColors.border,
                          color: themeColors.text,
                          backgroundColor: themeColors.surfaceLight,
                        },
                      ]}
                      placeholder="Confirm your password"
                      placeholderTextColor={themeColors.textMuted}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                      accessibilityLabel="Confirm password input field"
                      accessibilityHint="Re-enter your password to confirm"
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      accessibilityLabel={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                      accessibilityRole="button"
                    >
                      <Text style={{ color: themeColors.textSecondary }}>
                        {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {confirmPassword && password !== confirmPassword && (
                    <Text style={styles.errorText}>Passwords do not match</Text>
                  )}
                </View>
              )}

              {!isSignUp && (
                <TouchableOpacity
                  onPress={handleForgotPassword}
                  style={styles.forgotButton}
                  disabled={loading}
                  accessibilityLabel="Forgot password button"
                  accessibilityRole="button"
                  accessibilityHint="Tap to reset your password"
                >
                  <Text style={[styles.forgotText, { color: themeColors.primary }]}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              )}

              <Button
                title={
                  loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    isSignUp ? 'Create Account' : 'Sign In'
                  )
                }
                onPress={handleAuth}
                variant="primary"
                size="large"
                theme={theme}
                disabled={loading}
                style={styles.authButton}
              />

              <TouchableOpacity
                onPress={() => {
                  setIsSignUp(!isSignUp);
                  setEmailError('');
                  setPasswordError('');
                  setConfirmPassword('');
                }}
                style={styles.switchButton}
                disabled={loading}
                accessibilityLabel={isSignUp ? "Switch to sign in" : "Switch to sign up"}
                accessibilityRole="button"
                accessibilityHint={isSignUp ? "Tap to sign in instead" : "Tap to create an account"}
              >
                <Text style={[styles.switchText, { color: themeColors.primary }]}>
                  {isSignUp
                    ? 'Already have an account? Sign In'
                    : "Don't have an account? Sign Up"}
                </Text>
              </TouchableOpacity>

              {/* Social Login and Biometric Buttons */}
              {!isSignUp && (
                <View style={styles.socialButtonsContainer}>
                  <Text style={[styles.orText, { color: themeColors.textSecondary }]}>
                    Or continue with
                  </Text>

                  <View style={styles.socialButtonsRow}>
                    <TouchableOpacity
                      onPress={handleGoogleSignIn}
                      disabled={loading}
                      style={[styles.socialButton, { backgroundColor: themeColors.surfaceLight }]}
                      accessibilityLabel="Sign in with Google"
                      accessibilityRole="button"
                    >
                      <Text style={[styles.socialButtonText, { color: themeColors.text }]}>
                        G
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleAppleSignIn}
                      disabled={loading}
                      style={[styles.socialButton, { backgroundColor: themeColors.surfaceLight }]}
                      accessibilityLabel="Sign in with Apple"
                      accessibilityRole="button"
                    >
                      <Text style={[styles.socialButtonText, { color: themeColors.text }]}>
                        
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleBiometricAuth}
                      disabled={loading}
                      style={[styles.socialButton, { backgroundColor: themeColors.surfaceLight }]}
                      accessibilityLabel="Sign in with biometrics"
                      accessibilityRole="button"
                    >
                      <Text style={[styles.socialButtonText, { color: themeColors.text }]}>
                        👆
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </GlassCard>

            <View style={styles.features}>
              <Text style={[styles.featuresTitle, { color: themeColors.text }]}>
                🧠 Advanced Learning Features
              </Text>
              <Text
                style={[styles.featureItem, { color: themeColors.textSecondary }]}
              >
                • FSRS Spaced Repetition Algorithm
              </Text>
              <Text
                style={[styles.featureItem, { color: themeColors.textSecondary }]}
              >
                • Neural Mind Mapping
              </Text>
              <Text
                style={[styles.featureItem, { color: themeColors.textSecondary }]}
              >
                • Cognitive Soundscapes
              </Text>
              <Text
                style={[styles.featureItem, { color: themeColors.textSecondary }]}
              >
                • Focus Timer with Anti-Distraction
              </Text>
              <Text
                style={[styles.featureItem, { color: themeColors.textSecondary }]}
              >
                • Speed Reading Training
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
  },
  authCard: {
    marginBottom: spacing.xl,
  },
  authTitle: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.bodySmall,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  input: {
    borderWidth: 2,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: spacing.md,
    top: '50%',
    transform: [{ translateY: -12 }],
    padding: spacing.xs,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: spacing.xs,
  },
  passwordStrengthContainer: {
    marginTop: spacing.sm,
  },
  passwordStrengthText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  strengthBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  forgotButton: {
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  forgotText: {
    ...typography.bodySmall,
    textDecorationLine: 'underline',
  },
  authButton: {
    marginBottom: spacing.lg,
  },
  switchButton: {
    alignItems: 'center',
  },
  switchText: {
    ...typography.bodySmall,
    textDecorationLine: 'underline',
  },
  socialButtonsContainer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  orText: {
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  socialButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  socialButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  features: {
    alignItems: 'center',
  },
  featuresTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  featureItem: {
    ...typography.bodySmall,
    marginBottom: spacing.xs,
  },
});
