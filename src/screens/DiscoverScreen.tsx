import { useEffect, useState } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import {
  ActivityIndicator,
  Button,
  Chip,
  HelperText,
  Text,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  formatPriceLevel,
  parseRestaurantVibe,
  searchNearbyRestaurants,
  type NearbyRestaurant,
  type RestaurantVibeResult,
} from '../services/backend';
import {
  platePilotColors as C,
  platePilotInputTheme,
  platePilotRadii as R,
  platePilotTypography as T,
} from '../theme/designSystem';
import { usePlatePilotFonts } from '../theme/usePlatePilotFonts';
import { DiscoverScreenProps } from '../types/navigation';

const formatDistance = (distanceMeters: number): string => {
  if (distanceMeters < 1000) {
    return `${distanceMeters} m`;
  }

  return `${(distanceMeters / 1000).toFixed(1)} km`;
};

const getReadableErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Unable to find places right now.';
};

export const DiscoverScreen = ({ navigation }: DiscoverScreenProps) => {
  const [fontsLoaded] = usePlatePilotFonts();

  const [vibeInput, setVibeInput] = useState('');
  const [locationReady, setLocationReady] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);

  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [parsedVibe, setParsedVibe] = useState<RestaurantVibeResult | null>(null);
  const [results, setResults] = useState<NearbyRestaurant[]>([]);

  useEffect(() => {
    void loadLocation();
  }, []);

  const loadLocation = async () => {
    setLocationError(null);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        setCoordinates(null);
        setLocationReady(false);
        setLocationError('Location permission is required to discover nearby restaurants.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setCoordinates({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setLocationReady(true);
    } catch (locationRequestError) {
      setCoordinates(null);
      setLocationReady(false);
      setLocationError(getReadableErrorMessage(locationRequestError));
    }
  };

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('Home');
  };

  const handleSearch = async () => {
    const trimmedInput = vibeInput.trim();

    if (!trimmedInput) {
      setSearchError('Describe the vibe you want, like "cheap sushi" or "late night ramen".');
      return;
    }

    if (!coordinates) {
      setSearchError('Current location is unavailable. Allow location access and try again.');
      return;
    }

    setSearching(true);
    setSearchError(null);
    setResults([]);

    try {
      const vibe = await parseRestaurantVibe(trimmedInput);
      setParsedVibe(vibe);
      const restaurants = await searchNearbyRestaurants({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        placeTypes: vibe.placeTypes,
        allowedPriceLevels: vibe.allowedPriceLevels,
      });

      setResults(restaurants);
    } catch (searchRequestError) {
      setResults([]);
      setSearchError(getReadableErrorMessage(searchRequestError));
    } finally {
      setSearching(false);
    }
  };

  if (!fontsLoaded) {
    return null;
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

        <Text style={styles.kicker}>Nearby spots</Text>
        <Text style={styles.heroTitle}>
          DISCOVER{'\n'}
          <Text style={styles.heroTitleAccent}>RESTAURANTS.</Text>
        </Text>
        <Text style={styles.heroSubtitle}>
          Describe the vibe, let AI turn it into nearby search filters, then browse the closest matches with price and distance.
        </Text>

        <View style={styles.searchCard}>
          <Text style={styles.sectionTitle}>What are you craving?</Text>
          <Text style={styles.sectionText}>
            Try “cheap sushi”, “casual pasta”, or “quick coffee and pastry”.
          </Text>

          <TextInput
            mode="outlined"
            onChangeText={(value) => {
              setVibeInput(value);
              setSearchError(null);
            }}
            outlineStyle={styles.inputOutline}
            placeholder="cheap sushi"
            placeholderTextColor={C.placeholder}
            style={styles.input}
            theme={platePilotInputTheme}
            value={vibeInput}
          />

          <View style={styles.buttonRow}>
            <Button
              buttonColor={C.black}
              contentStyle={styles.primaryButtonContent}
              disabled={searching || !locationReady}
              labelStyle={styles.primaryButtonLabel}
              loading={searching}
              mode="contained"
              onPress={() => {
                void handleSearch();
              }}
              textColor={C.white}
            >
              Search Nearby
            </Button>
            <Button
              labelStyle={styles.secondaryButtonLabel}
              mode="text"
              onPress={() => {
                void loadLocation();
              }}
              textColor={C.orange}
            >
              Refresh Location
            </Button>
          </View>
        </View>

        {!locationReady || locationError ? (
          <View style={styles.locationCard}>
            <Text style={styles.sectionTitle}>Location status</Text>
            <Text style={styles.sectionText}>
              {locationError ?? 'Refreshing your current location...'}
            </Text>
            <View style={styles.buttonRow}>
              <Button
                buttonColor={C.black}
                contentStyle={styles.primaryButtonContent}
                labelStyle={styles.primaryButtonLabel}
                mode="contained"
                onPress={() => {
                  void loadLocation();
                }}
                textColor={C.white}
              >
                Allow Location
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

        <HelperText style={styles.errorText} type="error" visible={Boolean(searchError)}>
          {searchError ?? ''}
        </HelperText>

        {searching ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={C.orange} size="large" />
            <Text style={styles.loadingText}>Parsing your vibe and finding nearby spots...</Text>
          </View>
        ) : null}

        {parsedVibe ? (
          <View style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>Search summary</Text>
            <Text style={styles.sectionText}>{parsedVibe.summary}</Text>

            <View style={styles.chipWrap}>
              {parsedVibe.placeTypes.map((type) => (
                <Chip key={type} style={styles.summaryChip} textStyle={styles.summaryChipText}>
                  {type.replace(/_/g, ' ')}
                </Chip>
              ))}
              {parsedVibe.allowedPriceLevels.map((priceLevel) => (
                <Chip
                  key={priceLevel}
                  style={styles.summaryChip}
                  textStyle={styles.summaryChipText}
                >
                  {formatPriceLevel(priceLevel)}
                </Chip>
              ))}
            </View>
          </View>
        ) : null}

        {parsedVibe && results.length === 0 && !searching && !searchError ? (
          <View style={styles.locationCard}>
            <Text style={styles.sectionTitle}>No nearby matches</Text>
            <Text style={styles.sectionText}>
              Try a broader vibe or refresh your location for a wider search radius.
            </Text>
          </View>
        ) : null}

        {results.map((restaurant) => (
          <View key={restaurant.id} style={styles.resultCard}>
            <Text style={styles.resultName}>{restaurant.name}</Text>
            <Text style={styles.resultAddress}>{restaurant.address}</Text>

            <View style={styles.resultMetaRow}>
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>
                  {restaurant.rating !== null ? `${restaurant.rating.toFixed(1)} ★` : 'No rating'}
                </Text>
              </View>
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>{formatPriceLevel(restaurant.priceLevel)}</Text>
              </View>
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>{formatDistance(restaurant.distanceMeters)}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
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
    right: -40,
    top: -40,
    width: 220,
  },
  amb2: {
    backgroundColor: C.orangeGlow,
    borderRadius: 96,
    height: 192,
    left: -86,
    opacity: 0.35,
    position: 'absolute',
    top: 460,
    width: 192,
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
  searchCard: {
    backgroundColor: C.surfaceGlassStrong,
    borderColor: C.borderSubtle,
    borderRadius: R.cardLarge,
    borderWidth: 1,
    marginBottom: 16,
    padding: 24,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
  },
  locationCard: {
    backgroundColor: C.surfaceGlassStrong,
    borderColor: C.borderSubtle,
    borderRadius: R.cardLarge,
    borderWidth: 1,
    marginBottom: 16,
    padding: 24,
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: C.surfaceGlassStrong,
    borderColor: C.borderSubtle,
    borderRadius: R.cardLarge,
    borderWidth: 1,
    marginBottom: 16,
    padding: 24,
  },
  summaryCard: {
    backgroundColor: C.surfaceGlassStrong,
    borderColor: C.borderSubtle,
    borderRadius: R.cardLarge,
    borderWidth: 1,
    marginBottom: 16,
    padding: 24,
  },
  resultCard: {
    backgroundColor: C.surfaceGlassStrong,
    borderColor: C.borderSubtle,
    borderRadius: R.cardLarge,
    borderWidth: 1,
    marginBottom: 12,
    padding: 22,
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
  input: {
    backgroundColor: C.white,
    fontFamily: T.bodyMedium,
    fontSize: 15,
  },
  inputOutline: {
    borderRadius: R.input,
  },
  buttonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
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
  loadingText: {
    color: C.textSoft,
    fontFamily: T.bodyMedium,
    fontSize: 14,
    lineHeight: 24,
    marginTop: 12,
    textAlign: 'center',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryChip: {
    backgroundColor: C.orangeSoft,
    borderColor: '#F3C6A8',
    borderRadius: 999,
    borderWidth: 1,
  },
  summaryChipText: {
    color: C.orangeDark,
    fontFamily: T.bodyBold,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  resultName: {
    color: C.text,
    fontFamily: T.heading,
    fontSize: 28,
    letterSpacing: 0.8,
    lineHeight: 30,
  },
  resultAddress: {
    color: C.textSoft,
    fontFamily: T.bodyMedium,
    fontSize: 14,
    lineHeight: 24,
    marginTop: 6,
  },
  resultMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  metaPill: {
    backgroundColor: C.chipBg,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metaPillText: {
    color: C.textSoft,
    fontFamily: T.bodyBold,
    fontSize: 12,
  },
});
