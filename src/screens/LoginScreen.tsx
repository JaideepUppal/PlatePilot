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
  loading?: boolean;
  errorMessage?: string;
};

export const LoginScreen = ({
  navigation,
  onLogin,
  loading = false,
  errorMessage = '',
}: Props) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
            onPress={onLogin}
            style={styles.primaryAction}
          >
            Sign In
          </Button>
          <Button mode="text" onPress={() => navigation.navigate('Signup')}>
            New here? Create an account
          </Button>

          <Text style={styles.placeholderText} variant="bodySmall">
            {loading ? 'Signing in...' : 'Loading placeholder'}
          </Text>
          <HelperText type="error" visible>
            {errorMessage || 'Error placeholder'}
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
  placeholderText: {
    marginTop: 12,
    opacity: 0.7,
  },
  primaryAction: {
    marginTop: 18,
  },
  subtitle: {
    marginTop: 6,
    opacity: 0.75,
  },
});
