import { useEffect, useRef, useState } from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  ActivityIndicator,
  Button,
  Chip,
  HelperText,
  Snackbar,
  Text,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../hooks';
import { addInventory } from '../services/inventoryService';
import {
  detectIngredientsFromBase64,
  type DetectedIngredient,
} from '../services/backend';
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

  useEffect(() => {
    if (
      Platform.OS !== 'web' &&
      cameraPermission?.granted !== true &&
      cameraPermission?.canAskAgain !== false
    ) {
      void requestPermission();
    }
  }, [cameraPermission, requestPermission]);

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

      showSnackbar(`Saved ${selectedIngredients.length} ingredient${selectedIngredients.length === 1 ? '' : 's'} to inventory.`);
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

        <View style={styles.navRow}>
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
        </View>

        <Text style={styles.kicker}>Camera capture</Text>
        <Text style={styles.heroTitle}>
          SCAN{'\n'}
          <Text style={styles.heroTitleAccent}>INGREDIENTS.</Text>
        </Text>
        <Text style={styles.heroSubtitle}>
          Capture a quick kitchen photo, review the detected ingredients, then save only the ones you want in inventory.
        </Text>

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
          <View style={styles.cameraShell}>
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

            {processing ? (
              <View style={styles.processingOverlay}>
                <ActivityIndicator color={C.white} size="large" />
                <Text style={styles.processingText}>Analyzing image...</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {hasPermission && cameraError ? (
          <View style={styles.permissionCard}>
            <Text style={styles.sectionTitle}>No camera available</Text>
            <Text style={styles.sectionText}>
              {cameraError}
            </Text>
          </View>
        ) : null}

        {hasPermission && !cameraError ? (
          <View style={styles.captureCard}>
            <Text style={styles.sectionTitle}>Detect pantry items</Text>
            <Text style={styles.sectionText}>
              Aim at ingredients on a counter or in a fridge for cleaner labels.
            </Text>

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
          </View>
        ) : null}

        <HelperText style={styles.errorText} type="error" visible={Boolean(error)}>
          {error ?? ''}
        </HelperText>

        {detectedIngredients.length > 0 ? (
          <View style={styles.resultsCard}>
            <Text style={styles.sectionTitle}>Detected ingredients</Text>
            <Text style={styles.sectionText}>
              Tap chips to include or exclude items before saving to inventory.
            </Text>

            <View style={styles.chipWrap}>
              {detectedIngredients.map((ingredient) => {
                const isSelected = selectedIngredients.includes(ingredient.ingredient);

                return (
                  <Chip
                    key={ingredient.ingredient}
                    selected={isSelected}
                    selectedColor={isSelected ? C.orangeDark : C.textSoft}
                    style={[styles.ingredientChip, isSelected && styles.ingredientChipSelected]}
                    textStyle={[styles.ingredientChipText, isSelected && styles.ingredientChipTextSelected]}
                    onPress={() => toggleIngredient(ingredient.ingredient)}
                  >
                    {ingredient.ingredient}
                  </Chip>
                );
              })}
            </View>

            <View style={styles.buttonRow}>
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
          </View>
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
    fontSize: 54,
    letterSpacing: 1.2,
    lineHeight: 54,
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
    fontSize: 32,
    letterSpacing: 0.8,
    lineHeight: 34,
  },
  sectionText: {
    color: C.textSoft,
    fontFamily: T.bodyMedium,
    fontSize: 14,
    lineHeight: 24,
    marginBottom: 16,
    marginTop: 8,
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
    paddingHorizontal: 10,
  },
  primaryButtonLabel: {
    color: C.white,
    fontFamily: T.heading,
    fontSize: 21,
    letterSpacing: 1.6,
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
});
