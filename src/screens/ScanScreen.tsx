import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ActivityIndicator, Button, Chip, HelperText, Snackbar, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../hooks';
import { addInventory } from '../services/inventoryService';
import { detectIngredientsFromBase64, type DetectedIngredient } from '../services/backend';
import {
  platePilotColors as C,
  platePilotRadii as R,
  platePilotTypography as T,
} from '../theme/designSystem';
import { usePlatePilotFonts } from '../theme/usePlatePilotFonts';
import { ScanScreenProps } from '../types/navigation';

const getReadableErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Something went wrong while scanning ingredients.';
};

const AnimatedIngredientChip = ({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) => {
  const entranceAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    entranceAnim.setValue(0);

    Animated.timing(entranceAnim, {
      toValue: 1,
      duration: 320,
      delay: index * 70,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entranceAnim, index]);

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.96,
      friction: 7,
      tension: 180,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      friction: 6,
      tension: 180,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={{
        opacity: entranceAnim,
        transform: [
          {
            translateY: entranceAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [12, 0],
            }),
          },
          {
            scale: Animated.multiply(
              pressAnim,
              entranceAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.96, 1],
              }),
            ),
          },
        ],
      }}
    >
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
        {children}
      </Pressable>
    </Animated.View>
  );
};

export const ScanScreen = ({ navigation }: ScanScreenProps) => {
  const { user } = useAuth();
  const [fontsLoaded] = usePlatePilotFonts();
  const camera = useRef<CameraView | null>(null);
  const [cameraPermission, requestPermission] = useCameraPermissions();

  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detectedIngredients, setDetectedIngredients] = useState<DetectedIngredient[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const hasPermission = cameraPermission?.granted ?? false;

  const navAnim = useRef(new Animated.Value(0)).current;
  const heroAnim = useRef(new Animated.Value(0)).current;
  const cameraAnim = useRef(new Animated.Value(0)).current;
  const captureCardAnim = useRef(new Animated.Value(0)).current;
  const resultsAnim = useRef(new Animated.Value(0)).current;

  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const scannerPulseAnim = useRef(new Animated.Value(0)).current;
  const capturePressAnim = useRef(new Animated.Value(1)).current;
  const savePressAnim = useRef(new Animated.Value(1)).current;
  const processingTextAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (
      Platform.OS !== 'web' &&
      cameraPermission?.granted !== true &&
      cameraPermission?.canAskAgain !== false
    ) {
      void requestPermission();
    }
  }, [cameraPermission, requestPermission]);

  useEffect(() => {
    navAnim.setValue(0);
    heroAnim.setValue(0);
    cameraAnim.setValue(0);
    captureCardAnim.setValue(0);

    Animated.stagger(100, [
      Animated.timing(navAnim, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(heroAnim, {
        toValue: 1,
        duration: 460,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cameraAnim, {
        toValue: 1,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(captureCardAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [navAnim, heroAnim, cameraAnim, captureCardAnim]);

  useEffect(() => {
    if (detectedIngredients.length === 0) {
      resultsAnim.setValue(0);
      return;
    }

    resultsAnim.setValue(0);

    Animated.timing(resultsAnim, {
      toValue: 1,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [detectedIngredients, resultsAnim]);

  useEffect(() => {
    if (!hasPermission || cameraError) {
      return;
    }

    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scannerPulseAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scannerPulseAnim, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    scanLoop.start();
    pulseLoop.start();

    return () => {
      scanLoop.stop();
      pulseLoop.stop();
    };
  }, [cameraError, hasPermission, scanLineAnim, scannerPulseAnim]);

  useEffect(() => {
    if (!processing) {
      processingTextAnim.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(processingTextAnim, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(processingTextAnim, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [processing, processingTextAnim]);

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('Home');
  };

  const toggleIngredient = (ingredient: string) => {
    setSelectedIngredients((current) => {
      if (current.includes(ingredient)) {
        return current.filter((value) => value !== ingredient);
      }

      return [...current, ingredient];
    });
  };

  const handleCapture = async () => {
    if (!camera.current) {
      setError('Camera is not ready yet.');
      return;
    }

    if (!cameraReady) {
      setError('Camera is still loading. Try again in a moment.');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const photo = await camera.current.takePictureAsync({
        base64: true,
        quality: 0.7,
      });

      if (!photo.base64) {
        throw new Error('Unable to read the captured image. Please try again.');
      }

      const base64Image = photo.base64;
      const results = await detectIngredientsFromBase64(base64Image);

      setDetectedIngredients(results);
      setSelectedIngredients(results.map((item) => item.ingredient));

      if (results.length === 0) {
        setError('No clear ingredients were detected. Try a brighter photo or a closer angle.');
      }
    } catch (captureError) {
      setError(getReadableErrorMessage(captureError));
    } finally {
      setProcessing(false);
    }
  };

  const handleCapturePressIn = () => {
    Animated.spring(capturePressAnim, {
      toValue: 0.97,
      friction: 7,
      tension: 180,
      useNativeDriver: true,
    }).start();
  };

  const handleCapturePressOut = () => {
    Animated.spring(capturePressAnim, {
      toValue: 1,
      friction: 6,
      tension: 180,
      useNativeDriver: true,
    }).start();
  };

  const handleSavePressIn = () => {
    Animated.spring(savePressAnim, {
      toValue: 0.97,
      friction: 7,
      tension: 180,
      useNativeDriver: true,
    }).start();
  };

  const handleSavePressOut = () => {
    Animated.spring(savePressAnim, {
      toValue: 1,
      friction: 6,
      tension: 180,
      useNativeDriver: true,
    }).start();
  };

  const handleSave = async () => {
    if (!user) {
      setError('Please sign in again to save ingredients.');
      return;
    }

    if (selectedIngredients.length === 0) {
      setError('Select at least one ingredient to save.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await Promise.all(
        selectedIngredients.map((ingredient) =>
          addInventory(user.uid, {
            name: ingredient,
            quantity: 1,
          }),
        ),
      );

      showSnackbar(
        `Saved ${selectedIngredients.length} ingredient${selectedIngredients.length === 1 ? '' : 's'} to inventory.`,
      );
    } catch (saveError) {
      setError(getReadableErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.centeredContainer}>
          <Text style={styles.unsupportedTitle}>Camera scanning is mobile-only.</Text>
          <Text style={styles.unsupportedText}>
            Use PlatePilot on iOS or Android to capture ingredient photos.
          </Text>
          <Button
            buttonColor={C.black}
            contentStyle={styles.primaryButtonContent}
            labelStyle={styles.primaryButtonLabel}
            mode="contained"
            onPress={handleBackPress}
            textColor={C.white}
          >
            Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.amb1} />
        <View style={styles.amb2} />

        <Animated.View
          style={[
            styles.navRow,
            {
              opacity: navAnim,
              transform: [
                {
                  translateY: navAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [14, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Button
            compact
            labelStyle={styles.backButtonLabel}
            mode="text"
            onPress={handleBackPress}
            textColor={C.orange}
          >
            Back
          </Button>

          <View style={styles.logoRow}>
            <View style={styles.hex}>
              <Text style={styles.hexLetter}>P</Text>
            </View>
            <Text style={styles.brandName}>PLATEPILOT</Text>
          </View>
        </Animated.View>

        <Animated.View
          style={{
            opacity: heroAnim,
            transform: [
              {
                translateY: heroAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0],
                }),
              },
            ],
          }}
        >
          <Text style={styles.kicker}>Camera capture</Text>
          <Text style={styles.heroTitle}>
            SCAN{'\n'}
            <Text style={styles.heroTitleAccent}>INGREDIENTS.</Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            Capture a quick kitchen photo, review the detected ingredients, then save only the ones
            you want in inventory.
          </Text>
        </Animated.View>

        {!hasPermission ? (
          <View style={styles.permissionCard}>
            <Text style={styles.sectionTitle}>Camera access needed</Text>
            <Text style={styles.sectionText}>
              Allow camera permission to scan pantry items and ingredients.
            </Text>
            <View style={styles.buttonRow}>
              <Button
                buttonColor={C.black}
                contentStyle={styles.primaryButtonContent}
                labelStyle={styles.primaryButtonLabel}
                mode="contained"
                onPress={() => {
                  void requestPermission();
                }}
                textColor={C.white}
              >
                Allow Camera
              </Button>
              <Button
                labelStyle={styles.secondaryButtonLabel}
                mode="text"
                onPress={() => {
                  void Linking.openSettings();
                }}
                textColor={C.orange}
              >
                Open Settings
              </Button>
            </View>
          </View>
        ) : null}

        {hasPermission && !cameraError ? (
          <Animated.View
            style={[
              styles.cameraShell,
              {
                opacity: cameraAnim,
                transform: [
                  {
                    translateY: cameraAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [18, 0],
                    }),
                  },
                  {
                    scale: cameraAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.985, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <CameraView
              active={!processing}
              facing="back"
              mode="picture"
              onCameraReady={() => {
                setCameraReady(true);
                setCameraError(null);
              }}
              onMountError={(mountError) => {
                setCameraReady(false);
                setCameraError(mountError.message);
              }}
              ref={camera}
              style={styles.cameraPreview}
            />
            <View pointerEvents="none" style={styles.scannerOverlay}>
              <Animated.View
                style={[
                  styles.scannerFrame,
                  {
                    opacity: scannerPulseAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.55, 0.9],
                    }),
                    transform: [
                      {
                        scale: scannerPulseAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.01],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={[styles.corner, styles.cornerTopLeft]} />
                <View style={[styles.corner, styles.cornerTopRight]} />
                <View style={[styles.corner, styles.cornerBottomLeft]} />
                <View style={[styles.corner, styles.cornerBottomRight]} />

                <Animated.View
                  style={[
                    styles.scanLine,
                    {
                      transform: [
                        {
                          translateY: scanLineAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 210],
                          }),
                        },
                      ],
                      opacity: processing ? 0.95 : 0.65,
                    },
                  ]}
                />
              </Animated.View>

              {cameraReady && !processing ? (
                <Animated.View
                  style={[
                    styles.readyBadge,
                    {
                      opacity: scannerPulseAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.7, 1],
                      }),
                    },
                  ]}
                >
                  <View style={styles.readyDot} />
                  <Text style={styles.readyBadgeText}>Ready to scan</Text>
                </Animated.View>
              ) : null}
            </View>

            {processing ? (
              <View style={styles.processingOverlay}>
                <ActivityIndicator color={C.white} size="large" />
                <Animated.Text
                  style={[
                    styles.processingText,
                    {
                      opacity: processingTextAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.65, 1],
                      }),
                    },
                  ]}
                >
                  Detecting ingredients...
                </Animated.Text>
                <Text style={styles.processingSubtext}>Matching labels and preparing results</Text>
              </View>
            ) : null}
          </Animated.View>
        ) : null}

        {hasPermission && cameraError ? (
          <View style={styles.permissionCard}>
            <Text style={styles.sectionTitle}>No camera available</Text>
            <Text style={styles.sectionText}>{cameraError}</Text>
          </View>
        ) : null}

        {hasPermission && !cameraError ? (
          <Animated.View
            style={[
              styles.captureCard,
              {
                opacity: captureCardAnim,
                transform: [
                  {
                    translateY: captureCardAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>Detect pantry items</Text>
            <Text style={styles.sectionText}>
              Aim at ingredients on a counter or in a fridge for cleaner labels.
            </Text>

            <Animated.View style={{ transform: [{ scale: capturePressAnim }] }}>
              <Pressable onPressIn={handleCapturePressIn} onPressOut={handleCapturePressOut}>
                <Button
                  buttonColor={C.black}
                  contentStyle={styles.primaryButtonContent}
                  disabled={processing || !cameraReady}
                  labelStyle={styles.primaryButtonLabel}
                  mode="contained"
                  onPress={() => {
                    void handleCapture();
                  }}
                  textColor={C.white}
                >
                  {processing ? 'Scanning...' : 'Capture Scan'}
                </Button>
              </Pressable>
            </Animated.View>
          </Animated.View>
        ) : null}

        <HelperText style={styles.errorText} type="error" visible={Boolean(error)}>
          {error ?? ''}
        </HelperText>

        {detectedIngredients.length > 0 ? (
          <Animated.View
            style={[
              styles.resultsCard,
              {
                opacity: resultsAnim,
                transform: [
                  {
                    translateY: resultsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [18, 0],
                    }),
                  },
                  {
                    scale: resultsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.985, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>Detected ingredients</Text>
            <Text style={styles.sectionText}>
              Tap chips to include or exclude items before saving to inventory.
            </Text>

            <View style={styles.chipWrap}>
              {detectedIngredients.map((ingredient, index) => {
                const isSelected = selectedIngredients.includes(ingredient.ingredient);

                return (
                  <AnimatedIngredientChip key={ingredient.ingredient} index={index}>
                    <Chip
                      selected={isSelected}
                      selectedColor={isSelected ? C.orangeDark : C.textSoft}
                      style={[styles.ingredientChip, isSelected && styles.ingredientChipSelected]}
                      textStyle={[
                        styles.ingredientChipText,
                        isSelected && styles.ingredientChipTextSelected,
                      ]}
                      onPress={() => toggleIngredient(ingredient.ingredient)}
                    >
                      {ingredient.ingredient}
                    </Chip>
                  </AnimatedIngredientChip>
                );
              })}
            </View>

            <View style={styles.buttonRow}>
              <Animated.View style={{ transform: [{ scale: savePressAnim }] }}>
                <Pressable onPressIn={handleSavePressIn} onPressOut={handleSavePressOut}>
                  <Button
                    buttonColor={C.black}
                    contentStyle={styles.primaryButtonContent}
                    disabled={saving || selectedIngredients.length === 0}
                    labelStyle={styles.primaryButtonLabel}
                    loading={saving}
                    mode="contained"
                    onPress={() => {
                      void handleSave();
                    }}
                    textColor={C.white}
                  >
                    Save Selected
                  </Button>
                </Pressable>
              </Animated.View>
              <Button
                labelStyle={styles.secondaryButtonLabel}
                mode="text"
                onPress={() => {
                  setDetectedIngredients([]);
                  setSelectedIngredients([]);
                  setError(null);
                }}
                textColor={C.orange}
              >
                Scan Again
              </Button>
            </View>
          </Animated.View>
        ) : null}
      </ScrollView>

      <Snackbar
        duration={3000}
        onDismiss={() => setSnackbarVisible(false)}
        style={styles.snackbar}
        visible={snackbarVisible}
      >
        <Text style={styles.snackbarText}>{snackbarMessage}</Text>
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: C.cream,
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  amb1: {
    backgroundColor: C.orange,
    borderRadius: 110,
    height: 220,
    opacity: 0.12,
    position: 'absolute',
    right: -36,
    top: -40,
    width: 220,
  },
  amb2: {
    backgroundColor: C.orangeGlow,
    borderRadius: 90,
    height: 180,
    left: -80,
    opacity: 0.35,
    position: 'absolute',
    top: 420,
    width: 180,
  },
  centeredContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  navRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButtonLabel: {
    fontFamily: T.bodyExtraBold,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  logoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
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
    fontFamily: T.heading,
    fontSize: 22,
    letterSpacing: 1,
  },
  brandName: {
    color: C.text,
    fontFamily: T.heading,
    fontSize: 23,
    letterSpacing: 3,
  },
  kicker: {
    color: C.orange,
    fontFamily: T.bodyExtraBold,
    fontSize: 12,
    letterSpacing: 1.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: C.text,
    fontFamily: T.heading,
    fontSize: 49,
    letterSpacing: 1.2,
    lineHeight: 50,
  },
  heroTitleAccent: {
    color: C.orange,
  },
  heroSubtitle: {
    color: C.textSoft,
    fontFamily: T.bodyMedium,
    fontSize: 15,
    lineHeight: 26,
    marginBottom: 24,
    marginTop: 12,
  },
  cameraShell: {
    backgroundColor: C.black,
    borderColor: C.borderSubtle,
    borderRadius: R.cardLarge,
    borderWidth: 1,
    height: 360,
    marginBottom: 18,
    overflow: 'hidden',
  },
  cameraPreview: {
    flex: 1,
  },
  processingOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(30,20,13,0.5)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  processingText: {
    color: C.white,
    fontFamily: T.bodyBold,
    fontSize: 14,
    marginTop: 12,
  },
  permissionCard: {
    backgroundColor: C.surfaceGlassStrong,
    borderColor: C.borderSubtle,
    borderRadius: R.cardLarge,
    borderWidth: 1,
    marginBottom: 18,
    padding: 24,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
  },
  captureCard: {
    backgroundColor: C.surfaceGlassStrong,
    borderColor: C.borderSubtle,
    borderRadius: R.cardLarge,
    borderWidth: 1,
    marginBottom: 12,
    padding: 24,
  },
  resultsCard: {
    backgroundColor: C.surfaceGlassStrong,
    borderColor: C.borderSubtle,
    borderRadius: R.cardLarge,
    borderWidth: 1,
    marginTop: 8,
    padding: 24,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
  },
  sectionTitle: {
    color: C.text,
    fontFamily: T.heading,
    fontSize: 30,
    letterSpacing: 0.8,
    lineHeight: 32,
  },
  sectionText: {
    color: C.textSoft,
    fontFamily: T.bodyMedium,
    fontSize: 14,
    lineHeight: 24,
    marginBottom: 14,
    marginTop: 5,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ingredientChip: {
    backgroundColor: C.chipBg,
    borderColor: C.borderSoft,
    borderRadius: 999,
    borderWidth: 1,
  },
  ingredientChipSelected: {
    backgroundColor: C.orangeSoft,
    borderColor: '#F3C6A8',
  },
  ingredientChipText: {
    color: C.textSoft,
    fontFamily: T.bodyBold,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  ingredientChipTextSelected: {
    color: C.orangeDark,
  },
  buttonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 18,
  },
  primaryButtonContent: {
    height: 54,
    paddingHorizontal: 12,
  },
  primaryButtonLabel: {
    color: C.white,
    fontFamily: T.heading,
    marginBottom: 5,
    fontSize: 20,
    letterSpacing: 1.4,
  },
  secondaryButtonLabel: {
    color: C.orange,
    fontFamily: T.bodyExtraBold,
    fontSize: 13,
    letterSpacing: 0.6,
  },
  errorText: {
    color: C.danger,
    fontFamily: T.bodyBold,
    fontSize: 11,
    marginBottom: 4,
    marginTop: 0,
  },
  unsupportedTitle: {
    color: C.text,
    fontFamily: T.heading,
    fontSize: 34,
    letterSpacing: 0.8,
    lineHeight: 36,
    textAlign: 'center',
  },
  unsupportedText: {
    color: C.textSoft,
    fontFamily: T.bodyMedium,
    fontSize: 14,
    lineHeight: 24,
    marginBottom: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  snackbar: {
    backgroundColor: C.black,
    borderRadius: 20,
    margin: 16,
  },
  snackbarText: {
    color: C.white,
    fontFamily: T.bodyBold,
    fontSize: 13,
  },
  scannerOverlay: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  scannerFrame: {
    borderRadius: 24,
    height: 250,
    overflow: 'hidden',
    position: 'relative',
    width: '82%',
  },
  corner: {
    borderColor: C.orange,
    position: 'absolute',
    width: 34,
    height: 34,
  },
  cornerTopLeft: {
    borderLeftWidth: 3,
    borderTopWidth: 3,
    borderTopLeftRadius: 14,
    left: 0,
    top: 0,
  },
  cornerTopRight: {
    borderRightWidth: 3,
    borderTopWidth: 3,
    borderTopRightRadius: 14,
    right: 0,
    top: 0,
  },
  cornerBottomLeft: {
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 14,
    bottom: 0,
    left: 0,
  },
  cornerBottomRight: {
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 14,
    bottom: 0,
    right: 0,
  },
  scanLine: {
    backgroundColor: C.orangeGlow,
    height: 3,
    left: 18,
    position: 'absolute',
    right: 18,
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    top: 20,
  },
  readyDot: {
    backgroundColor: C.orange,
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  readyBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 999,
    borderWidth: 1,
    bottom: 18,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: 'absolute',
  },
  readyBadgeText: {
    color: C.white,
    fontFamily: T.bodyBold,
    fontSize: 12,
  },
  processingSubtext: {
    color: 'rgba(255,255,255,0.82)',
    fontFamily: T.bodyMedium,
    fontSize: 12,
    marginTop: 8,
  },
});
