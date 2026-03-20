import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HelperText, Text } from 'react-native-paper';

import { useAuth } from '../hooks';
import { platePilotColors as C } from '../theme/designSystem';
import { usePlatePilotFonts } from '../theme/usePlatePilotFonts';
import { HomeScreenProps } from '../types/navigation';

export const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const { signOut, user } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<'inventory' | 'vibecheck'>('inventory');

  const slideAnim = useRef(new Animated.Value(0)).current;

  const [fontsLoaded] = usePlatePilotFonts();

  const username = user?.email ? user.email.split('@')[0] : 'Chef';

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: selectedMode === 'inventory' ? 0 : 1,
      useNativeDriver: false,
      friction: 8,
      tension: 80,
    }).start();
  }, [selectedMode, slideAnim]);

  const handleSignOut = async () => {
    setError(null);
    setIsSigningOut(true);

    try {
      await signOut();
    } catch (signOutError) {
      setError(
        signOutError instanceof Error
          ? signOutError.message
          : 'Unable to sign out right now.',
      );
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleInventoryPress = () => {
    setSelectedMode('inventory');
    navigation.navigate('Inventory');
  };

  const handleVibeCheckPress = () => {
    setSelectedMode('vibecheck');
    // navigation.navigate('VibeCheck');
  };

  if (!fontsLoaded) return null;

  const sliderTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 163], // adjust slightly if needed on your device
  });

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
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

          <Text style={styles.subHeader}>
            Hi, <Text style={styles.userText}>{username}</Text>
          </Text>
        </View>

        <View style={styles.switchShell}>
          <View style={styles.switchWrap}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.switchHighlight,
                {
                  transform: [{ translateX: sliderTranslateX }],
                },
              ]}
            />

            <Pressable onPress={handleInventoryPress} style={styles.switchBtn}>
              <Text
                style={[
                  styles.switchText,
                  selectedMode === 'inventory' && styles.switchTextActive,
                ]}
              >
                Inventory
              </Text>
            </Pressable>

            <Pressable onPress={handleVibeCheckPress} style={styles.switchBtn}>
              <Text
                style={[
                  styles.switchText,
                  selectedMode === 'vibecheck' && styles.switchTextActive,
                ]}
              >
                VibeCheck
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.centerContent}>
          <Text style={styles.heroTitle}>
            WELCOME TO{'\n'}
            <Text style={styles.heroTitleOrange}>PLATEPILOT</Text>
          </Text>

          <View style={styles.infoCard}>
            <View style={styles.infoGlow} />

            <View style={styles.modeInfoBlock}>
              <Text style={styles.modeInfoEyebrow}>ORGANIZE</Text>
              <Text style={styles.modeInfoTitle}>Inventory Mode</Text>
              <Text style={styles.modeInfoText}>
                Track what you already have in your fridge or pantry and keep your
                kitchen organized.
              </Text>
            </View>

            <View style={styles.dividerWrap}>
              <View style={styles.dividerLine} />
              <View style={styles.dividerDot} />
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.modeInfoBlock}>
              <Text style={styles.modeInfoEyebrow}>DISCOVER</Text>
              <Text style={styles.modeInfoTitle}>VibeCheck</Text>
              <Text style={styles.modeInfoText}>
                Find recipe ideas based on your mood, cravings, time, and whatever
                feels right today.
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          disabled={isSigningOut}
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.logoutBtn,
            pressed && styles.logoutBtnPressed,
          ]}
        >
          <Text style={styles.logoutText}>
            {isSigningOut ? 'SIGNING OUT...' : 'LOGOUT'}
          </Text>
        </Pressable>

        <HelperText type="error" visible={Boolean(error)} style={styles.errorText}>
          {error ?? ''}
        </HelperText>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.cream,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  amb1: {
    position: 'absolute',
    top: -10,
    right: -45,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: C.orange,
    opacity: 0.12,
  },
  amb2: {
    position: 'absolute',
    top: 320,
    left: -90,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: C.orangeGlow,
    opacity: 0.3,
  },
  amb3: {
    position: 'absolute',
    bottom: 130,
    alignSelf: 'center',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: C.orange,
    opacity: 0.06,
  },

  hero: {
    paddingTop: 8,
    paddingBottom: 14,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  hex: {
    width: 40,
    height: 40,
    backgroundColor: C.orange,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.orange,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  hexLetter: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22,
    color: C.white,
    letterSpacing: 1,
  },
  brandName: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 23,
    letterSpacing: 3,
    color: C.text,
  },

  subHeader: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 16,
    color: C.textSoft,
  },
  userText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: C.text,
  },

  switchShell: {
    marginBottom: 28,
  },
  switchWrap: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: C.pillBg,
    borderRadius: 28,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(244,124,44,0.14)',
    shadowColor: C.orange,
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  switchHighlight: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: '48%',
    height: 68,
    borderRadius: 20,
    backgroundColor: C.orange,
    shadowColor: C.orange,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  switchBtn: {
    flex: 1,
    minHeight: 68,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  switchText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 15,
    color: C.text,
    textAlign: 'center',
  },
  switchTextActive: {
    color: C.white,
  },

  centerContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 45,
    lineHeight: 46,
    color: C.text,
    textAlign: 'center',
    letterSpacing: 1.2,
  },
  heroTitleOrange: {
    color: C.orange,
  },
  heroSubtitle: {
    marginTop: 16,
    marginBottom: 26,
    maxWidth: 320,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 15,
    lineHeight: 26,
    textAlign: 'center',
    color: C.textSoft,
  },

  infoCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 30,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#D97A36',
    shadowOpacity: 0.09,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    overflow: 'hidden',
    marginTop:15,
  },
  infoGlow: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: C.cardGlow,
  },
  modeInfoBlock: {
    alignItems: 'center',
  },
  modeInfoEyebrow: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 11,
    letterSpacing: 1.6,
    color: C.orange,
    marginBottom: 8,
  },
  modeInfoTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 28,
    color: C.text,
    marginBottom: 8,
    letterSpacing: 0.8,
  },
  modeInfoText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
    lineHeight: 24,
    color: C.textSoft,
    textAlign: 'center',
  },
  dividerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  dividerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.orange,
    marginHorizontal: 10,
  },

  logoutBtn: {
  height: 60,
  borderRadius: 22,
  backgroundColor: C.black,
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 30,

  shadowColor: C.black,
  shadowOpacity: 0.25,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },

  elevation: 8,

  borderWidth: 1,
  borderColor: '#2F2017',
},

logoutBtnPressed: {
  transform: [{ scale: 0.96 }],
  shadowOpacity: 0.15,
},

logoutText: {
  fontFamily: 'BebasNeue_400Regular',
  fontSize: 24,
  letterSpacing: 2,
  color: C.white,
},
  errorText: {
    marginTop: 8,
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    color: '#D95A2B',
  },
});
