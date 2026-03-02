import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import {
  Button,
  HelperText,
  Surface,
  Text,
  TextInput,
} from 'react-native-paper';

import { LoginScreenProps } from '../types/navigation';

type Props = LoginScreenProps & {
  onLogin: () => void;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LoginScreen = ({ navigation, onLogin }: Props) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!emailRegex.test(email.trim())) {
      return 'Please enter a valid email address.';
    }

    if (password.length < 6) {
      return 'Password must be at least 6 characters.';
    }

    return null;
  };

  const handleLogin = async () => {
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
      onLogin();
    } catch {
      setError('Unable to sign in right now. Please try again.');
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
        <Text variant="displaySmall">PlatePilot</Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Welcome back.
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

          <Button
            disabled={loading}
            loading={loading}
            mode="contained"
            onPress={handleLogin}
            style={styles.primaryAction}
          >
            Sign In
          </Button>
          <Button mode="text" onPress={() => navigation.navigate('Signup')}>
            New here? Create an account
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
    marginTop: 18,
  },
  subtitle: {
    marginTop: 6,
    opacity: 0.75,
  },
});
