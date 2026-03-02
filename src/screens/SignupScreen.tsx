import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import {
  Button,
  HelperText,
  Surface,
  Text,
  TextInput,
} from 'react-native-paper';

import { SignupScreenProps } from '../types/navigation';

type Props = SignupScreenProps & {
  onSignup: () => void;
  loading?: boolean;
  errorMessage?: string;
  validationMessage?: string;
};

export const SignupScreen = ({
  navigation,
  onSignup,
  loading = false,
  errorMessage = '',
  validationMessage = '',
}: Props) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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

          <HelperText type="info" visible>
            {validationMessage || 'Validation message placeholder'}
          </HelperText>

          <Button
            disabled={loading}
            loading={loading}
            mode="contained"
            onPress={onSignup}
            style={styles.primaryAction}
          >
            Create Account
          </Button>
          <Button mode="text" onPress={() => navigation.navigate('Login')}>
            Already have an account? Sign in
          </Button>

          <Text style={styles.placeholderText} variant="bodySmall">
            {loading ? 'Creating your account...' : 'Loading placeholder'}
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
    marginTop: 8,
  },
  subtitle: {
    marginTop: 6,
    opacity: 0.75,
  },
});
