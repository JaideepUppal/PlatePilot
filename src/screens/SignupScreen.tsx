import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, HelperText, Surface, Text, TextInput } from 'react-native-paper';
import { useFonts, BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

import { useAuth } from '../hooks';
import { SignupScreenProps } from '../types/navigation';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const C = {
  black: '#1E140D',
  orange: '#F47C2C',
  orangeDark: '#D9631A',
  orangeSoft: '#FFF1E7',
  orangeGlow: '#FFD7BD',
  cream: '#FFF9F4',
  white: '#FFFFFF',
  text: '#1E140D',
  textSoft: '#6F584B',
  muted: '#A48473',
  border: '#ECD8C8',
  placeholder: '#C9A897',
  label: '#B6927D',
};

export const SignupScreen = ({ navigation }: SignupScreenProps) => {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

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
      await signUp(email.trim(), password);
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : 'Unable to create your account right now.',
      );
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded) return null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.amb1} />
        <View style={styles.amb2} />
        <View style={styles.amb3} />

        <View style={styles.hero}>
          <View style={styles.logoRow}>
            <View style={styles.hex}>
              <Text style={styles.hexLetter}>P</Text>
            </View>
            <Text style={styles.brandName}>PLATEPILOT</Text>
          </View>

          <Text style={styles.headline}>
            {'JOIN\n'}
            <Text style={styles.headlineOrange}>{'PLATEPILOT.'}</Text>
          </Text>
        </View>

        <Surface style={styles.card} elevation={0}>
          <Text style={styles.cardEyebrow}>GET STARTED</Text>
          <Text style={styles.cardTitle}>Create Account</Text>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              mode="outlined"
              onChangeText={(v) => {
                setEmail(v);
                setError(null);
              }}
              placeholder="Enter your email"
              placeholderTextColor={C.placeholder}
              value={email}
              left={<TextInput.Icon icon="email-outline" color={C.label} />}
              style={styles.input}
              outlineStyle={styles.inputOutline}
              theme={{
                colors: {
                  primary: C.orange,
                  outline: C.border,
                  background: C.white,
                },
              }}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <TextInput
              mode="outlined"
              onChangeText={(v) => {
                setPassword(v);
                setError(null);
              }}
              placeholder="••••••••"
              placeholderTextColor={C.placeholder}
              secureTextEntry={!showPassword}
              value={password}
              left={<TextInput.Icon icon="lock-outline" color={C.label} />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  color={C.label}
                  onPress={() => setShowPassword((p) => !p)}
                />
              }
              style={styles.input}
              outlineStyle={styles.inputOutline}
              theme={{
                colors: {
                  primary: C.orange,
                  outline: C.border,
                  background: C.white,
                },
              }}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
            <TextInput
              mode="outlined"
              onChangeText={(v) => {
                setConfirmPassword(v);
                setError(null);
              }}
              placeholder="••••••••"
              placeholderTextColor={C.placeholder}
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              left={<TextInput.Icon icon="lock-check-outline" color={C.label} />}
              right={
                <TextInput.Icon
                  icon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  color={C.label}
                  onPress={() => setShowConfirmPassword((p) => !p)}
                />
              }
              style={styles.input}
              outlineStyle={styles.inputOutline}
              theme={{
                colors: {
                  primary: C.orange,
                  outline: C.border,
                  background: C.white,
                },
              }}
            />
          </View>

          <HelperText type="error" visible={Boolean(error)} style={styles.errorText}>
            {error ?? ''}
          </HelperText>

          <Pressable
            onPress={handleSignup}
            disabled={loading}
            style={({ pressed }) => [styles.ctaBtn, pressed && styles.ctaBtnPressed]}
          >
            <Text style={styles.ctaLabel}>
              {loading ? 'CREATING…' : 'CREATE ACCOUNT'}
            </Text>
            <View style={styles.ctaArrow}>
              <Text style={styles.ctaArrowText}>→</Text>
            </View>
          </Pressable>

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Already have an account?</Text>
            <Button
              mode="text"
              compact
              onPress={() => navigation.navigate('Login')}
              labelStyle={styles.signupLink}
            >
              Sign in
            </Button>
          </View>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.cream,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  amb1: {
    position: 'absolute',
    top: -70,
    right: -30,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: C.orange,
    opacity: 0.12,
  },
  amb2: {
    position: 'absolute',
    top: 180,
    left: -70,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: C.orangeGlow,
    opacity: 0.45,
  },
  amb3: {
    position: 'absolute',
    top: 520,
    alignSelf: 'center',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: C.orange,
    opacity: 0.08,
  },

  hero: {
    paddingHorizontal: 28,
    paddingTop: 64,
    paddingBottom: 28,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  hex: {
    width: 38,
    height: 38,
    backgroundColor: C.orange,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.orange,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  hexLetter: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 20,
    color: C.white,
    letterSpacing: 1,
  },
  brandName: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22,
    letterSpacing: 3,
    color: C.text,
  },
  headline: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 64,
    lineHeight: 64,
    color: C.text,
    marginBottom: 5,
  },
  headlineOrange: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 64,
    lineHeight: 64,
    color: C.orange,
  },

  card: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 32,
    padding: 28,
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(244,124,44,0.14)',
    shadowColor: '#D97A36',
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  cardEyebrow: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 15,
    letterSpacing: 2,
    color: C.orange,
    marginBottom: 10,
  },
  cardTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 37,
    letterSpacing: 1,
    color: C.text,
    lineHeight: 40,
    marginBottom: 15,
  },

  fieldBlock: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 14,
    letterSpacing: 1.8,
    color: C.label,
    marginBottom: 7,
  },
  input: {
    backgroundColor: C.white,
  },
  inputOutline: {
    borderRadius: 16,
  },
  errorText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    color: '#D95A2B',
    marginTop: -6,
    marginBottom: 6,
  },

  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: 56,
    backgroundColor: C.black,
    borderRadius: 16,
    marginTop: 4,
    marginBottom: 25,
    shadowColor: C.orange,
    shadowOpacity: 0.4,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 8 },
  },
  ctaBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  ctaLabel: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22,
    letterSpacing: 2.5,
    color: C.white,
  },
  ctaArrow: {
    width: 28,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaArrowText: {
    color: C.white,
    fontSize: 16,
    fontWeight: '700',
  },

  signupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 15,
    color: C.textSoft,
  },
  signupLink: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 15,
    color: C.orange,
  },
});