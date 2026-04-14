import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, HelperText, Text, TextInput } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

import { askPlatePilotAssistant, type PlatePilotAssistantResult } from '../services/backend';
import { useAuth } from '../hooks';
import { listInventory } from '../services/inventoryService';
import {
  platePilotColors as C,
  platePilotInputTheme,
  platePilotRadii as R,
} from '../theme/designSystem';
import { usePlatePilotFonts } from '../theme/usePlatePilotFonts';
import { HomeScreenProps } from '../types/navigation';
import { InventoryScreen } from './InventoryScreen';
import { DiscoverScreen } from './DiscoverScreen';

const getReadableErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Unable to complete that request right now.';
};

const formatIngredientList = (items: string[]): string => {
  return items.join(', ');
};

const getAssistantPills = (result: PlatePilotAssistantResult | null): string[] => {
  if (!result) {
    return [];
  }

  const pills: string[] = [];

  if (result.intent.budget !== 'any') {
    pills.push(`Budget: ${result.intent.budget}`);
  }

  if (result.intent.spiceLevel !== 'any') {
    pills.push(`Spice: ${result.intent.spiceLevel}`);
  }

  if (result.intent.mealType !== 'any') {
    pills.push(`Meal: ${result.intent.mealType}`);
  }

  if (result.intent.cuisine) {
    pills.push(result.intent.cuisine);
  }

  return pills;
};

export const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const { signOut, user } = useAuth();
  const [fontsLoaded] = usePlatePilotFonts();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<'inventory' | 'vibecheck' | null>(null);
  const [inventoryNames, setInventoryNames] = useState<string[]>([]);
  const [assistantPrompt, setAssistantPrompt] = useState('');
  const [assistantResult, setAssistantResult] = useState<PlatePilotAssistantResult | null>(null);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const homeBtnScale = useRef(new Animated.Value(1)).current;
  const homeGlowAnim = useRef(new Animated.Value(0)).current;
  const pageIntroAnim = useRef(new Animated.Value(0)).current;
  const introCardAnim = useRef(new Animated.Value(0)).current;
  const actionCardAnim = useRef(new Animated.Value(0)).current;
  const aiCardAnim = useRef(new Animated.Value(0)).current;
  const ambientFloatAnim = useRef(new Animated.Value(0)).current;
  const aiResultAnim = useRef(new Animated.Value(0)).current;
  const inputFocusAnim = useRef(new Animated.Value(0)).current;
  const logoutScale = useRef(new Animated.Value(1)).current;
  const logoutGlow = useRef(new Animated.Value(0)).current;
  const [switchWidth, setSwitchWidth] = useState(0);

  const username = user?.email ? user.email.split('@')[0] : 'Chef';

  useEffect(() => {
    if (selectedMode === null) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
      return;
    }

    Animated.spring(slideAnim, {
      toValue: selectedMode === 'inventory' ? 0 : 1,
      friction: 8,
      tension: 90,
      useNativeDriver: false,
    }).start();
  }, [selectedMode, slideAnim]);

  useEffect(() => {
    let isMounted = true;

    const hydrateInventoryContext = async () => {
      if (!user) {
        if (isMounted) {
          setInventoryNames([]);
        }
        return;
      }

      try {
        const inventoryItems = await listInventory(user.uid);

        if (isMounted) {
          setInventoryNames(inventoryItems.map((item) => item.name.trim()).filter(Boolean));
        }
      } catch {
        if (isMounted) {
          setInventoryNames([]);
        }
      }
    };

    void hydrateInventoryContext();

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    Animated.stagger(110, [
      Animated.timing(pageIntroAnim, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(introCardAnim, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(actionCardAnim, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(aiCardAnim, {
        toValue: 1,
        duration: 560,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [pageIntroAnim, introCardAnim, actionCardAnim, aiCardAnim]);

  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ambientFloatAnim, {
          toValue: 1,
          duration: 4200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ambientFloatAnim, {
          toValue: 0,
          duration: 4200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    floatLoop.start();

    return () => {
      floatLoop.stop();
    };
  }, [ambientFloatAnim]);

  useEffect(() => {
    if (!assistantResult) {
      aiResultAnim.setValue(0);
      return;
    }

    Animated.spring(aiResultAnim, {
      toValue: 1,
      friction: 8,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [assistantResult, aiResultAnim]);

  useEffect(() => {
    if (selectedMode === null) {
      homeGlowAnim.stopAnimation();
      homeGlowAnim.setValue(0);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(homeGlowAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(homeGlowAnim, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    pulse.start();

    return () => {
      pulse.stop();
    };
  }, [selectedMode, homeGlowAnim]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(logoutGlow, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoutGlow, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [logoutGlow]);

  const handleLogoutPressIn = () => {
    Animated.spring(logoutScale, {
      toValue: 0.92,
      useNativeDriver: true,
      friction: 6,
      tension: 200,
    }).start();
  };

  const handleLogoutPressOut = () => {
    Animated.spring(logoutScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
      tension: 200,
    }).start();
  };

  const handleAiInputFocus = () => {
    Animated.timing(inputFocusAnim, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  const handleAiInputBlur = () => {
    Animated.timing(inputFocusAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  const handleHomePressIn = () => {
    Animated.spring(homeBtnScale, {
      toValue: 0.94,
      useNativeDriver: true,
      friction: 7,
      tension: 220,
    }).start();
  };

  const handleHomePressOut = () => {
    Animated.spring(homeBtnScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
      tension: 220,
    }).start();
  };

  const handlePressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.97,
      useNativeDriver: true,
      friction: 7,
      tension: 180,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
      tension: 180,
    }).start();
  };

  const handleSignOut = async () => {
    setError(null);
    setIsSigningOut(true);

    try {
      await signOut();
    } catch (signOutError) {
      setError(
        signOutError instanceof Error ? signOutError.message : 'Unable to sign out right now.',
      );
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleInventoryPress = () => {
    setSelectedMode((current) => (current === 'inventory' ? null : 'inventory'));
  };

  const handleVibeCheckPress = () => {
    setSelectedMode((current) => (current === 'vibecheck' ? null : 'vibecheck'));
  };

  const handleAskAI = async () => {
    const trimmedPrompt = assistantPrompt.trim();

    if (!trimmedPrompt) {
      setAssistantError('Ask PlatePilot for a meal idea, substitution, or pantry plan.');
      return;
    }

    setAssistantLoading(true);
    setAssistantError(null);

    try {
      const result = await askPlatePilotAssistant(trimmedPrompt, inventoryNames);
      setAssistantResult(result);
    } catch (assistantRequestError) {
      setAssistantError(getReadableErrorMessage(assistantRequestError));
    } finally {
      setAssistantLoading(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  const assistantPills = getAssistantPills(assistantResult);
  const assistantIngredientsUsed = assistantResult?.ingredientsUsed ?? [];
  const assistantMissingIngredients = assistantResult?.missingIngredients ?? [];
  const assistantShortInstructions = assistantResult?.shortInstructions ?? [];

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.root}>
        <Animated.View
          style={[
            styles.amb1,
            {
              transform: [
                {
                  translateY: ambientFloatAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -10],
                  }),
                },
              ],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.amb2,
            {
              transform: [
                {
                  translateY: ambientFloatAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 12],
                  }),
                },
              ],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.amb3,
            {
              transform: [
                {
                  translateY: ambientFloatAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -8],
                  }),
                },
              ],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.floatingHomeWrap,
            { transform: [{ scale: homeBtnScale }] },
            selectedMode === null && styles.floatingHomeWrapHome,
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              styles.floatingHomeGlow,
              selectedMode === null && styles.floatingHomeGlowHome,
              {
                opacity: homeGlowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.08, 0.18],
                }),
                transform: [
                  {
                    scale: homeGlowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.1],
                    }),
                  },
                ],
              },
            ]}
          />

          <Pressable
            onPress={() => setSelectedMode(null)}
            onPressIn={handleHomePressIn}
            onPressOut={handleHomePressOut}
            style={[styles.floatingHomeBtn, selectedMode === null && styles.floatingHomeBtnHome]}
          >
            <Ionicons name="home" size={20} color={C.black} />
          </Pressable>
        </Animated.View>

        <View style={styles.topSection}>
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
            <Animated.View style={{ transform: [{ scale: pressScale }] }}>
              <View
                style={styles.switchWrap}
                onLayout={(e) => setSwitchWidth(e.nativeEvent.layout.width)}
              >
                {switchWidth > 0 && selectedMode !== null ? (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.switchHighlight,
                      {
                        width: (switchWidth - 16) / 2,
                        transform: [
                          {
                            translateX: slideAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, (switchWidth - 16) / 2],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                ) : null}

                <Pressable
                  onPress={handleInventoryPress}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  style={styles.switchBtn}
                >
                  <Text
                    style={[
                      styles.switchText,
                      selectedMode === 'inventory' && styles.switchTextActive,
                    ]}
                  >
                    Inventory
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleVibeCheckPress}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  style={styles.switchBtn}
                >
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
            </Animated.View>
          </View>
        </View>

        {selectedMode === null ? (
          <KeyboardAvoidingView
            style={styles.contentArea}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={10}
          >
            <ScrollView
              style={styles.homeScroll}
              contentContainerStyle={styles.homeScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
            >
              <View style={styles.centerContent}>
                <Animated.View
                  style={{
                    opacity: pageIntroAnim,
                    transform: [
                      {
                        translateY: pageIntroAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      },
                    ],
                  }}
                >
                  <Text style={styles.heroTitle}>
                    WELCOME TO{'\n'}
                    <Text style={styles.heroTitleOrange}>PLATEPILOT</Text>
                  </Text>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.infoCard,
                    {
                      opacity: introCardAnim,
                      transform: [
                        {
                          translateY: introCardAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [26, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.infoGlow} />

                  <View style={styles.modeInfoBlock}>
                    <Text style={styles.modeInfoEyebrow}>ORGANIZE</Text>
                    <Text style={styles.modeInfoTitle}>Inventory Mode</Text>
                    <Text style={styles.modeInfoText}>
                      Track what you already have in your fridge or pantry and keep your kitchen
                      organized.
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
                      Find nearby restaurants that match your mood, cravings, and budget with
                      location-aware search.
                    </Text>
                  </View>
                </Animated.View>

                <Animated.View
                  style={{
                    opacity: actionCardAnim,
                    transform: [
                      {
                        translateY: actionCardAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [28, 0],
                        }),
                      },
                    ],
                  }}
                >
                  <Pressable
                    onPress={() => navigation.navigate('Scan')}
                    style={({ pressed }) => [
                      styles.actionCard,
                      pressed && styles.actionCardPressed,
                    ]}
                  >
                    <View style={styles.actionCardContent}>
                      <Text style={styles.actionCardEyebrow}>SCAN</Text>
                      <Text style={styles.actionCardTitle}>Scan Ingredients</Text>
                      <Text style={styles.actionCardText}>
                        Capture a photo, confirm the detected ingredients, and save them straight
                        into inventory.
                      </Text>
                    </View>
                    <View style={styles.actionCardArrow}>
                      <Text style={styles.actionCardArrowText}>→</Text>
                    </View>
                  </Pressable>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.aiCard,
                    {
                      opacity: aiCardAnim,
                      transform: [
                        {
                          translateY: aiCardAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [30, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.aiEyebrow}>ASK AI</Text>
                  <Text style={styles.aiTitle}>Kitchen Co-Pilot</Text>
                  <Text style={styles.aiText}>
                    Tell PlatePilot what you’re craving, and it will turn your pantry into a meal
                    plan.
                  </Text>
                  <Text style={styles.inventorySyncText}>
                    Pantry synced: {inventoryNames.length} item
                    {inventoryNames.length === 1 ? '' : 's'}
                  </Text>

                  <Animated.View
                    style={{
                      marginTop: 16,
                      transform: [
                        {
                          scale: inputFocusAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.01],
                          }),
                        },
                      ],
                      shadowColor: C.shadow,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: inputFocusAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.04, 0.12],
                      }),
                      shadowRadius: inputFocusAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [6, 12],
                      }),
                    }}
                  >
                    <TextInput
                      mode="outlined"
                      multiline
                      numberOfLines={3}
                      onFocus={handleAiInputFocus}
                      onBlur={handleAiInputBlur}
                      onChangeText={(value) => {
                        setAssistantPrompt(value);
                        setAssistantError(null);
                      }}
                      outlineStyle={styles.aiInputOutline}
                      placeholder="What would you like to cook today?"
                      placeholderTextColor={C.placeholder}
                      style={styles.aiInput}
                      theme={platePilotInputTheme}
                      value={assistantPrompt}
                    />
                  </Animated.View>

                  <HelperText
                    type="error"
                    visible={Boolean(assistantError)}
                    style={styles.aiErrorText}
                  >
                    {assistantError ?? ''}
                  </HelperText>

                  <Pressable
                    disabled={assistantLoading}
                    onPress={() => {
                      void handleAskAI();
                    }}
                    style={({ pressed }) => [
                      styles.aiSubmitBtn,
                      pressed && styles.aiSubmitBtnPressed,
                    ]}
                  >
                    {assistantLoading ? (
                      <View style={styles.aiSubmitLoading}>
                        <ActivityIndicator color={C.white} size="small" />
                        <Text style={styles.aiSubmitLabel}>THINKING...</Text>
                      </View>
                    ) : (
                      <Text style={styles.aiSubmitLabel}>ASK PLATEPILOT</Text>
                    )}
                  </Pressable>

                  {assistantResult ? (
                    <Animated.View
                      style={[
                        styles.aiResponseCard,
                        {
                          opacity: aiResultAnim,
                          transform: [
                            {
                              translateY: aiResultAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [16, 0],
                              }),
                            },
                            {
                              scale: aiResultAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.97, 1],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      <View pointerEvents="none" style={styles.aiResponseGlow} />

                      {assistantPills.length > 0 ? (
                        <View style={styles.aiPillRow}>
                          {assistantPills.map((pill) => (
                            <View key={pill} style={styles.aiPill}>
                              <Text style={styles.aiPillText}>{pill}</Text>
                            </View>
                          ))}
                        </View>
                      ) : null}

                      <View style={styles.aiResponseHeader}>
                        {assistantResult.title ? (
                          <Text style={styles.aiResponseTitle}>{assistantResult.title}</Text>
                        ) : null}
                        <Text style={styles.aiResponseText}>{assistantResult.message}</Text>
                      </View>

                      <View style={styles.aiDivider} />

                      {assistantResult.whyItMatches ? (
                        <View style={styles.aiDetailSection}>
                          <Text style={styles.aiDetailLabel}>Why it fits</Text>
                          <Text style={styles.aiDetailText}>{assistantResult.whyItMatches}</Text>
                        </View>
                      ) : null}

                      {assistantIngredientsUsed.length > 0 ? (
                        <View style={styles.aiDetailSection}>
                          <Text style={styles.aiDetailLabel}>Using</Text>
                          <Text style={styles.aiDetailText}>
                            {formatIngredientList(assistantIngredientsUsed)}
                          </Text>
                        </View>
                      ) : null}

                      {assistantMissingIngredients.length > 0 ? (
                        <View style={styles.aiDetailSection}>
                          <Text style={styles.aiDetailLabel}>Missing</Text>
                          <Text style={styles.aiDetailText}>
                            {formatIngredientList(assistantMissingIngredients)}
                          </Text>
                        </View>
                      ) : null}

                      {assistantShortInstructions.length > 0 ? (
                        <View style={styles.aiDetailSection}>
                          <Text style={styles.aiDetailLabel}>Quick steps</Text>
                          {assistantShortInstructions.map((step, index) => (
                            <Text key={`${step}-${index + 1}`} style={styles.aiStepText}>
                              {index + 1}. {step}
                            </Text>
                          ))}
                        </View>
                      ) : null}

                      {assistantResult.substitutionTip ? (
                        <View style={styles.aiDetailSection}>
                          <Text style={styles.aiDetailLabel}>Swap</Text>
                          <Text style={styles.aiDetailText}>{assistantResult.substitutionTip}</Text>
                        </View>
                      ) : null}
                    </Animated.View>
                  ) : null}
                </Animated.View>

                <Animated.View
                  style={{
                    transform: [{ scale: logoutScale }],
                    width: '100%',
                  }}
                >
                  <Pressable
                    disabled={isSigningOut}
                    onPress={handleSignOut}
                    onPressIn={handleLogoutPressIn}
                    onPressOut={handleLogoutPressOut}
                    style={styles.logoutBtn}
                  >
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.logoutGlow,
                        {
                          opacity: logoutGlow.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.02, 0.08],
                          }),
                          transform: [
                            {
                              scale: logoutGlow.interpolate({
                                inputRange: [0, 1],
                                outputRange: [1, 1.04],
                              }),
                            },
                          ],
                        },
                      ]}
                    />

                    {/* Content */}
                    {isSigningOut ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                          zIndex: 2,
                        }}
                      >
                        <ActivityIndicator color={C.white} size="small" />
                        <Text style={styles.logoutText}>SIGNING OUT...</Text>
                      </View>
                    ) : (
                      <Text style={[styles.logoutText, { zIndex: 2 }]}>LOGOUT</Text>
                    )}
                  </Pressable>
                </Animated.View>

                <HelperText type="error" visible={Boolean(error)} style={styles.errorText}>
                  {error ?? ''}
                </HelperText>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        ) : selectedMode === 'inventory' ? (
          <View style={styles.contentArea}>
            <InventoryScreen />
          </View>
        ) : (
          <KeyboardAvoidingView
            style={styles.contentArea}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={50}
          >
            <ScrollView
              style={styles.discoverScroll}
              contentContainerStyle={styles.discoverScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
            >
              <DiscoverScreen />
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.cream,
  },
  topSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  homeScroll: {
    flex: 1,
  },
  homeScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 26,
  },
  discoverScroll: {
    flex: 1,
  },
  discoverScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  contentArea: {
    flex: 1,
  },
  amb1: {
    backgroundColor: C.orange,
    borderRadius: 110,
    height: 220,
    opacity: 0.12,
    position: 'absolute',
    right: -45,
    top: -10,
    width: 220,
  },
  amb2: {
    backgroundColor: C.orangeGlow,
    borderRadius: 95,
    height: 190,
    left: -90,
    opacity: 0.3,
    position: 'absolute',
    top: 320,
    width: 190,
  },
  amb3: {
    alignSelf: 'center',
    backgroundColor: C.orange,
    borderRadius: 140,
    bottom: 130,
    height: 280,
    opacity: 0.06,
    position: 'absolute',
    width: 280,
  },
  hero: {
    paddingBottom: 14,
    paddingTop: 8,
  },
  logoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  hex: {
    alignItems: 'center',
    backgroundColor: C.orange,
    borderRadius: 11,
    height: 40,
    justifyContent: 'center',
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    width: 40,
  },
  hexLetter: {
    color: C.white,
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22,
    letterSpacing: 1,
  },
  brandName: {
    color: C.text,
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 23,
    letterSpacing: 3,
  },
  subHeader: {
    color: C.textSoft,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 16,
  },
  userText: {
    color: C.text,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  switchShell: {
    marginBottom: 28,
  },
  switchWrap: {
    backgroundColor: C.pillBg,
    borderColor: 'rgba(244,124,44,0.14)',
    borderRadius: 28,
    borderWidth: 1,
    elevation: 10,
    flexDirection: 'row',
    padding: 8,
    position: 'relative',
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
  },
  switchHighlight: {
    backgroundColor: C.orange,
    borderRadius: 20,
    height: 68,
    left: 8,
    position: 'absolute',
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    top: 8,
  },
  switchBtn: {
    alignItems: 'center',
    borderRadius: 20,
    flex: 1,
    justifyContent: 'center',
    minHeight: 68,
    zIndex: 2,
  },
  switchText: {
    color: C.text,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 15,
    textAlign: 'center',
  },
  switchTextActive: {
    color: C.white,
  },
  centerContent: {
    alignItems: 'center',
  },
  heroTitle: {
    color: C.text,
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 45,
    letterSpacing: 1.2,
    lineHeight: 46,
    textAlign: 'center',
  },
  heroTitleOrange: {
    color: C.orange,
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderColor: C.border,
    borderRadius: 30,
    borderWidth: 1,
    elevation: 10,
    marginTop: 15,
    overflow: 'hidden',
    padding: 24,
    shadowColor: '#D97A36',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.09,
    shadowRadius: 22,
    width: '100%',
  },
  infoGlow: {
    backgroundColor: C.cardGlow,
    borderRadius: 60,
    height: 120,
    position: 'absolute',
    right: -20,
    top: -30,
    width: 120,
  },
  modeInfoBlock: {
    alignItems: 'center',
  },
  modeInfoEyebrow: {
    color: C.orange,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 11,
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  modeInfoTitle: {
    color: C.text,
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 28,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  modeInfoText: {
    color: C.textSoft,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'center',
  },
  dividerWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    marginVertical: 22,
  },
  dividerLine: {
    backgroundColor: C.border,
    flex: 1,
    height: 1,
  },
  dividerDot: {
    backgroundColor: C.orange,
    borderRadius: 4,
    height: 8,
    marginHorizontal: 10,
    width: 8,
  },
  actionCard: {
    alignItems: 'center',
    backgroundColor: C.surfaceGlassStrong,
    borderColor: C.borderSubtle,
    borderRadius: R.cardLarge,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 18,
    padding: 24,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    width: '100%',
  },
  actionCardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  actionCardContent: {
    flex: 1,
    paddingRight: 16,
  },
  actionCardEyebrow: {
    color: C.orange,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  actionCardTitle: {
    color: C.text,
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 34,
    letterSpacing: 0.8,
    lineHeight: 36,
    marginTop: 8,
  },
  actionCardText: {
    color: C.textSoft,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
    lineHeight: 24,
    marginTop: 8,
  },
  actionCardArrow: {
    alignItems: 'center',
    backgroundColor: C.orange,
    borderRadius: 18,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  actionCardArrowText: {
    color: C.white,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 20,
    marginBottom: 6,
  },
  aiCard: {
    backgroundColor: C.surfaceGlassStrong,
    borderColor: C.borderSubtle,
    borderRadius: R.cardLarge,
    borderWidth: 1,
    marginTop: 18,
    padding: 24,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    width: '100%',
  },
  aiEyebrow: {
    color: C.orange,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  aiTitle: {
    color: C.text,
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 36,
    letterSpacing: 0.8,
    lineHeight: 38,
    marginTop: 8,
  },
  aiText: {
    color: C.textSoft,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
    lineHeight: 24,
    marginTop: 8,
  },
  inventorySyncText: {
    color: C.label,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    letterSpacing: 0.4,
    marginTop: 12,
  },
  aiInput: {
    backgroundColor: C.white,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 15,
    marginTop: 16,
  },
  aiInputOutline: {
    borderRadius: R.input,
  },
  aiErrorText: {
    color: C.danger,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    marginBottom: 4,
    marginTop: 2,
  },
  aiSubmitBtn: {
    alignItems: 'center',
    backgroundColor: C.black,
    borderColor: '#2F2017',
    borderRadius: 18,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: C.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  aiSubmitBtnPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.985 }],
  },
  aiSubmitLoading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  aiSubmitLabel: {
    color: C.white,
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 23,
    letterSpacing: 1.8,
  },
  aiResponseCard: {
    backgroundColor: C.white,
    borderColor: C.borderSoft,
    borderRadius: 26,
    borderWidth: 1,
    marginTop: 18,
    overflow: 'hidden',
    padding: 20,
    position: 'relative',
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 5,
  },
  aiResponseTitle: {
    color: C.text,
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 30,
    letterSpacing: 0.9,
    lineHeight: 32,
    marginBottom: 10,
    marginTop: 2,
  },
  aiPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  aiPill: {
    backgroundColor: C.orangeSoft,
    borderColor: C.borderSoft,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  aiPillText: {
    color: C.orangeDark,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'capitalize',
  },
  aiDetailLabel: {
    color: C.orangeDark,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  aiDetailSection: {
    backgroundColor: C.chipBg,
    borderColor: C.borderSoft,
    borderRadius: 18,
    borderWidth: 0,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  aiDetailText: {
    color: C.textSoft,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
    lineHeight: 23,
    marginTop: 6,
  },
  aiResponseText: {
    color: C.text,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 15,
    lineHeight: 25,
    textAlign: 'left',
  },
  aiStepText: {
    color: C.textSoft,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,

    backgroundColor: C.white,
    borderRadius: 16,

    paddingHorizontal: 14,
    paddingVertical: 12,

    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,

    elevation: 2,
  },
  logoutBtn: {
    alignItems: 'center',
    backgroundColor: C.black,
    borderColor: '#2F2017',
    borderRadius: 22,
    borderWidth: 1,
    elevation: 8,
    height: 60,
    justifyContent: 'center',
    marginTop: 34,
    shadowColor: C.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    width: '100%',
  },
  logoutBtnPressed: {
    shadowOpacity: 0.15,
    transform: [{ scale: 0.96 }],
  },
  logoutText: {
    color: C.white,
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 24,
    letterSpacing: 2,
  },
  errorText: {
    color: '#D95A2B',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },
  aiResponseGlow: {
    backgroundColor: C.cardGlow,
    borderRadius: 90,
    height: 140,
    opacity: 0.55,
    position: 'absolute',
    right: -30,
    top: -30,
    width: 140,
  },

  aiResponseHeader: {
    marginBottom: 2,
  },

  aiDivider: {
    backgroundColor: C.borderSoft,
    height: 1,
    marginTop: 14,
    marginBottom: 2,
    width: '100%',
  },
  floatingHomeWrap: {
    position: 'absolute',
    right: 20,
    top: 58,
    zIndex: 50,
  },

  floatingHomeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 54,
    height: 54,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: C.borderSoft,

    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 7,
  },
  floatingHomeGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: C.orangeGlow,
  },
  floatingHomeWrapHome: {
    opacity: 0.92,
  },

  floatingHomeBtnHome: {
    backgroundColor: 'rgba(255,255,255,0.82)',
  },

  floatingHomeGlowHome: {
    opacity: 0.08,
  },
  logoutGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 22,
    backgroundColor: C.orangeGlow,
  },
});
