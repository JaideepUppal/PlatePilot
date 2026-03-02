import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, HelperText, Surface, Text, TextInput } from 'react-native-paper';

import { SignupScreenProps } from '../types/navigation';

type Props = SignupScreenProps & {
  onSignup: () => void;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const SignupScreen = ({ navigation, onSignup }: Props) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!emailRegex.test(email.trim())) {
      return 'Please enter a valid email address.';
    }

    if (password.length < 6) {
      return 'Password must be at least 6 characters.';
    }

    if (password !== confirmPassword) {
      return 'Passwords do not match.';
    }

    return null;
  };

  const handleSignup = async () => {
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 800);
      });
      onSignup();
    } catch {
      setError('Unable to create your account right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text variant="headlineMedium">Create your account</Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Start building your kitchen flow.
        </Text>

        <Surface style={styles.formCard} elevation={2}>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            label="Email"
            mode="outlined"
            onChangeText={setEmail}
            value={email}
          />
          <TextInput
            label="Password"
            mode="outlined"
            onChangeText={setPassword}
            secureTextEntry
            style={styles.inputSpacing}
            value={password}
          />
          <TextInput
            label="Confirm password"
            mode="outlined"
            onChangeText={setConfirmPassword}
            secureTextEntry
            style={styles.inputSpacing}
            value={confirmPassword}
          />

          <Button
            disabled={loading}
            loading={loading}
            mode="contained"
            onPress={handleSignup}
            style={styles.primaryAction}
          >
            Create Account
          </Button>
          <Button mode="text" onPress={() => navigation.navigate('Login')}>
            Already have an account? Sign in
          </Button>

          <HelperText type="error" visible={Boolean(error)}>
            {error ?? ''}
          </HelperText>
        </Surface>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  formCard: {
    borderRadius: 20,
    marginTop: 20,
    padding: 18,
  },
  inputSpacing: {
    marginTop: 12,
  },
  primaryAction: {
    marginTop: 16,
  },
  subtitle: {
    marginTop: 6,
    opacity: 0.75,
  },
});
