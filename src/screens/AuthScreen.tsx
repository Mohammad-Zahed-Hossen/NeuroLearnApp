import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {
  GlassCard,
  Button,
  ScreenContainer,
} from '../components/GlassComponents';
import { colors, spacing, typography, borderRadius } from '../theme/colors';
import { ThemeType } from '../theme/colors';
import SupabaseService from '../services/SupabaseService';

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
  const [loading, setLoading] = useState(false);

  const themeColors = colors[theme];
  const supabaseService = SupabaseService.getInstance();

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);

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
          [{ text: 'OK', onPress: () => setIsSignUp(false) }]
        );
      } else {
        result = await supabaseService.signIn(email, password);
        if (result.error) {
          throw result.error;
        }
        onAuthenticated();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer theme={theme}>
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
            {isSignUp ? 'Create Account' : 'Sign In'}
          </Text>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: themeColors.textSecondary }]}>
              Email
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: themeColors.border,
                  color: themeColors.text,
                  backgroundColor: themeColors.surfaceLight,
                },
              ]}
              placeholder="Enter your email"
              placeholderTextColor={themeColors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: themeColors.textSecondary }]}>
              Password
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: themeColors.border,
                  color: themeColors.text,
                  backgroundColor: themeColors.surfaceLight,
                },
              ]}
              placeholder="Enter your password"
              placeholderTextColor={themeColors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Button
            title={loading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
            onPress={handleAuth}
            variant="primary"
            size="large"
            theme={theme}
            disabled={loading}
            style={styles.authButton}
          />

          <TouchableOpacity
            onPress={() => setIsSignUp(!isSignUp)}
            style={styles.switchButton}
          >
            <Text style={[styles.switchText, { color: themeColors.primary }]}>
              {isSignUp
                ? 'Already have an account? Sign In'
                : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
        </GlassCard>

        <View style={styles.features}>
          <Text style={[styles.featuresTitle, { color: themeColors.text }]}>
            🧠 Advanced Learning Features
          </Text>
          <Text style={[styles.featureItem, { color: themeColors.textSecondary }]}>
            • FSRS Spaced Repetition Algorithm
          </Text>
          <Text style={[styles.featureItem, { color: themeColors.textSecondary }]}>
            • Neural Mind Mapping
          </Text>
          <Text style={[styles.featureItem, { color: themeColors.textSecondary }]}>
            • Cognitive Soundscapes
          </Text>
          <Text style={[styles.featureItem, { color: themeColors.textSecondary }]}>
            • Focus Timer with Anti-Distraction
          </Text>
          <Text style={[styles.featureItem, { color: themeColors.textSecondary }]}>
            • Speed Reading Training
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
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