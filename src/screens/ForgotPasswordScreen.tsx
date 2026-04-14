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
import { sendPasswordResetEmail } from 'firebase/auth';

import { auth } from '../config/firebase';
import { platePilotColors as C } from '../theme/designSystem';
import { usePlatePilotFonts } from '../theme/usePlatePilotFonts';
import { ForgotPasswordScreenProps } from '../types/navigation';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUCCESS_MESSAGE = 'If an account exists, a reset link has been sent.';
const GENERIC_ERROR_MESSAGE = 'Unable to send reset link right now. Please try again.';

export const ForgotPasswordScreen = ({ navigation }: ForgotPasswordScreenProps) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [fontsLoaded] = usePlatePilotFonts();

  const isSubmitDisabled = !email.trim() || loading;

  const validate = (): string | null => {
    if (!emailRegex.test(email.trim())) {
      return 'Please enter a valid email address.';
    }

    return null;
  };

  const handleSendResetLink = async () => {
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      setSuccessMessage(null);
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccessMessage(SUCCESS_MESSAGE);
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
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
            {'RESET\n'}
            <Text style={styles.headlineOrange}>{'ACCESS.'}</Text>
          </Text>

          <Text style={styles.heroDesc}>
            Enter the email address tied to your account and we&apos;ll send a password reset link.
          </Text>
        </View>

        <Surface style={styles.card} elevation={0}>
          <Text style={styles.cardEyebrow}>ACCOUNT RECOVERY</Text>
          <Text style={styles.cardTitle}>Forgot Password</Text>
          <Text style={styles.cardDescription}>
            Use your sign-in email to request a reset link.
          </Text>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              mode="outlined"
              onChangeText={(value) => {
                setEmail(value);
                setError(null);
                setSuccessMessage(null);
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

          <HelperText type="error" visible={Boolean(error)} style={styles.errorText}>
            {error ?? ''}
          </HelperText>

          {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

          <Pressable
            onPress={handleSendResetLink}
            disabled={isSubmitDisabled}
            style={({ pressed }) => [
              styles.ctaBtn,
              isSubmitDisabled && styles.ctaBtnDisabled,
              pressed && !isSubmitDisabled && styles.ctaBtnPressed,
            ]}
          >
            <Text style={styles.ctaLabel}>{loading ? 'SENDING…' : 'SEND RESET LINK'}</Text>
            <View style={styles.ctaArrow}>
              <Text style={styles.ctaArrowText}>→</Text>
            </View>
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Remembered your password?</Text>
            <Button
              mode="text"
              compact
              onPress={() => navigation.navigate('Login')}
              labelStyle={styles.footerLink}
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
    top: 500,
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
    marginBottom: 10,
  },
  headlineOrange: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 64,
    lineHeight: 64,
    color: C.orange,
  },
  heroDesc: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: C.textSoft,
    lineHeight: 20,
    maxWidth: 290,
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
    marginBottom: 8,
  },
  cardDescription: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: C.textSoft,
    marginBottom: 20,
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
  successText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    lineHeight: 18,
    color: C.orangeDark,
    marginTop: -4,
    marginBottom: 10,
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
    marginBottom: 24,
    shadowColor: C.orange,
    shadowOpacity: 0.4,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 8 },
  },
  ctaBtnDisabled: {
    opacity: 0.55,
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
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: C.muted,
  },
  footerLink: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 12,
    color: C.orangeDark,
  },
});
