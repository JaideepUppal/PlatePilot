import { useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Button, Chip, HelperText, Text, TextInput } from 'react-native-paper';

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

const formatDistance = (distanceMeters: number): string => {
  if (distanceMeters < 1000) return `${distanceMeters} m`;
  return `${(distanceMeters / 1000).toFixed(1)} km`;
};

const getReadableErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Unable to find places right now.';
};

const getOpenStatus = (openingHours: string | null | undefined): 'open' | 'closed' | null => {
  if (!openingHours) return null;
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const now = new Date();
  const todayName = days[now.getDay()];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todayLine = openingHours.split('\n').find((line) => line.startsWith(todayName));
  if (!todayLine) return null;
  if (todayLine.toLowerCase().includes('closed')) return 'closed';
  if (todayLine.toLowerCase().includes('open 24 hours')) return 'open';
  const timeMatch = todayLine.match(
    /(\d{1,2}):(\d{2})\s*(AM|PM)\s*[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i,
  );
  if (!timeMatch) return null;
  const toMinutes = (h: string, m: string, ampm: string) => {
    let hours = parseInt(h, 10);
    const mins = parseInt(m, 10);
    if (ampm.toUpperCase() === 'PM' && hours !== 12) hours += 12;
    if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
    return hours * 60 + mins;
  };
  const openTime = toMinutes(timeMatch[1], timeMatch[2], timeMatch[3]);
  const closeTime = toMinutes(timeMatch[4], timeMatch[5], timeMatch[6]);
  return currentMinutes >= openTime && currentMinutes <= closeTime ? 'open' : 'closed';
};

export const DiscoverScreen = () => {
  const [fontsLoaded] = usePlatePilotFonts();
  const [vibeInput, setVibeInput] = useState('');
  const [locationReady, setLocationReady] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(
    null,
  );
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
      setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setLocationReady(true);
    } catch (locationRequestError) {
      setCoordinates(null);
      setLocationReady(false);
      setLocationError(getReadableErrorMessage(locationRequestError));
    }
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

  const openInMaps = (restaurant: NearbyRestaurant) => {
    const query = encodeURIComponent(restaurant.name);
    const lat = restaurant.latitude;
    const lng = restaurant.longitude;
    const url =
      Platform.OS === 'ios'
        ? `maps://?q=${query}&ll=${lat},${lng}`
        : `geo:${lat},${lng}?q=${query}`;
    void Linking.openURL(url).catch(() =>
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`),
    );
  };

  if (!fontsLoaded) return null;

  return (
    <View style={styles.contentRoot}>
      <View style={styles.amb1} />
      <View style={styles.amb2} />

      <Text style={styles.kicker}>Nearby spots</Text>
      <Text style={styles.heroTitle}>
        DISCOVER{'\n'}
        <Text style={styles.heroTitleAccent}>RESTAURANTS.</Text>
      </Text>
      <Text style={styles.heroSubtitle}>
        Describe the vibe, let AI turn it into nearby search filters, then browse the closest
        matches.
      </Text>

      <View style={styles.searchCard}>
        <Text style={styles.sectionTitle}>What are you craving?</Text>
        <Text style={styles.sectionText}>
          Try things like &quot;cheap Indian food&quot;, &quot;late night Korean&quot;, or &quot;budget sushi&quot;.
        </Text>
        <TextInput
          mode="outlined"
          onChangeText={(value) => {
            setVibeInput(value);
            setSearchError(null);
          }}
          outlineStyle={styles.inputOutline}
          placeholder='e.g. "cheap ramen" or "fancy Italian"'
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
              <Chip key={priceLevel} style={styles.summaryChip} textStyle={styles.summaryChipText}>
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

      {results.map((restaurant) => {
        const openStatus = getOpenStatus(restaurant.openingHours);
        const priceLabel = formatPriceLevel(restaurant.priceLevel);

        return (
          <View key={restaurant.id} style={styles.resultCard}>
            {/* Name + open/closed badge */}
            <View style={styles.resultHeaderRow}>
              <Text style={styles.resultName} numberOfLines={2}>
                {restaurant.name}
              </Text>
              {openStatus ? (
                <View
                  style={[
                    styles.openBadge,
                    openStatus === 'open' ? styles.openBadgeGreen : styles.openBadgeRed,
                  ]}
                >
                  <View
                    style={[
                      styles.openDot,
                      openStatus === 'open' ? styles.openDotGreen : styles.openDotRed,
                    ]}
                  />
                  <Text
                    style={[
                      styles.openBadgeText,
                      openStatus === 'open' ? styles.openBadgeTextGreen : styles.openBadgeTextRed,
                    ]}
                  >
                    {openStatus === 'open' ? 'Open' : 'Closed'}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Cuisine type */}
            {restaurant.primaryType ? (
              <Text style={styles.resultCuisine}>{restaurant.primaryType.replace(/_/g, ' ')}</Text>
            ) : null}

            {/* Address */}
            <View style={styles.addressRow}>
              <Ionicons
                name="location-outline"
                size={13}
                color={C.textSoft}
                style={styles.addressIcon}
              />
              <Text style={styles.resultAddress}>{restaurant.address}</Text>
            </View>

            {/* Meta pills */}
            <View style={styles.resultMetaRow}>
              <View style={styles.metaPill}>
                <MaterialCommunityIcons name="map-marker-distance" size={12} color={C.textSoft} />
                <Text style={styles.metaPillText}>{formatDistance(restaurant.distanceMeters)}</Text>
              </View>

              {restaurant.rating !== null ? (
                <View style={styles.metaPill}>
                  <Ionicons name="star" size={11} color="#F59E0B" />
                  <Text style={styles.metaPillText}>{restaurant.rating.toFixed(1)}</Text>
                </View>
              ) : null}

              {priceLabel ? (
                <View
                  style={[
                    styles.metaPill,
                    restaurant.priceLevel === 'PRICE_LEVEL_INEXPENSIVE' && styles.metaPillGreen,
                    restaurant.priceLevel === 'PRICE_LEVEL_EXPENSIVE' && styles.metaPillOrange,
                    restaurant.priceLevel === 'PRICE_LEVEL_VERY_EXPENSIVE' && styles.metaPillRed,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="cash"
                    size={12}
                    color={
                      restaurant.priceLevel === 'PRICE_LEVEL_INEXPENSIVE'
                        ? '#1A7A45'
                        : restaurant.priceLevel === 'PRICE_LEVEL_VERY_EXPENSIVE'
                          ? '#B91C1C'
                          : C.textSoft
                    }
                  />
                  <Text style={styles.metaPillText}>{priceLabel}</Text>
                </View>
              ) : null}
            </View>

            {/* Opening hours */}
            {restaurant.openingHours ? (
              <View style={styles.hoursRow}>
                <View style={styles.hoursHeaderRow}>
                  <Ionicons name="time-outline" size={13} color={C.orangeDark} />
                  <Text style={styles.hoursLabel}>OPENING HOURS</Text>
                </View>
                <Text style={styles.hoursText}>{restaurant.openingHours}</Text>
              </View>
            ) : null}

            {/* Action buttons */}
            <View style={styles.resultActionsRow}>
              <TouchableOpacity style={styles.mapsButton} onPress={() => openInMaps(restaurant)}>
                <Ionicons name="map" size={14} color={C.white} />
                <Text style={styles.mapsButtonText}>Open in Maps</Text>
              </TouchableOpacity>

              {restaurant.website ? (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    void Linking.openURL(restaurant.website!);
                  }}
                >
                  <Ionicons name="globe-outline" size={14} color={C.text} />
                  <Text style={styles.actionButtonText}>Website</Text>
                </TouchableOpacity>
              ) : null}

              {restaurant.phone ? (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    void Linking.openURL(`tel:${restaurant.phone}`);
                  }}
                >
                  <Ionicons name="call-outline" size={14} color={C.text} />
                  <Text style={styles.actionButtonText}>Call</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  contentRoot: { width: '100%' },
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
  kicker: {
    color: C.orange,
    fontFamily: T.bodyExtraBold,
    fontSize: 12,
    letterSpacing: 1.8,
    marginBottom: 12,
    marginTop: 8,
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
    fontSize: 50,
    letterSpacing: 0.1,
    lineHeight: 50,
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
  inputOutline: { borderRadius: R.input },
  buttonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  primaryButtonContent: { height: 54, paddingHorizontal: 10 },
  primaryButtonLabel: {
    color: C.white,
    fontFamily: T.heading,
    marginBottom: 4,
    fontSize: 18,
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
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
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
  resultHeaderRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
    gap: 8,
  },
  resultName: {
    color: C.text,
    flex: 1,
    fontFamily: T.heading,
    fontSize: 24,
    letterSpacing: 0.8,
    lineHeight: 26,
  },
  openBadge: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    marginTop: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  openBadgeGreen: { backgroundColor: '#D6F5E3' },
  openBadgeRed: { backgroundColor: '#FFE5E5' },
  openDot: {
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  openDotGreen: { backgroundColor: '#1A7A45' },
  openDotRed: { backgroundColor: '#B91C1C' },
  openBadgeText: { fontFamily: T.bodyBold, fontSize: 11 },
  openBadgeTextGreen: { color: '#1A7A45' },
  openBadgeTextRed: { color: '#B91C1C' },
  resultCuisine: {
    color: C.orange,
    fontFamily: T.bodyExtraBold,
    fontSize: 11,
    letterSpacing: 1.4,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  addressRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  addressIcon: { marginTop: 2 },
  resultAddress: {
    color: C.textSoft,
    flex: 1,
    fontFamily: T.bodyMedium,
    fontSize: 13,
    lineHeight: 20,
  },
  resultMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  metaPill: {
    alignItems: 'center',
    backgroundColor: C.chipBg,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  metaPillText: {
    color: C.textSoft,
    fontFamily: T.bodyBold,
    fontSize: 12,
  },
  metaPillGreen: { backgroundColor: '#D6F5E3' },
  metaPillOrange: { backgroundColor: '#FEF0E0' },
  metaPillRed: { backgroundColor: '#FFE5E5' },
  hoursRow: {
    backgroundColor: C.orangeSoft,
    borderRadius: 12,
    marginTop: 12,
    padding: 12,
  },
  hoursHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    marginBottom: 6,
  },
  hoursLabel: {
    color: C.orangeDark,
    fontFamily: T.bodyExtraBold,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  hoursText: {
    color: C.text,
    fontFamily: T.bodyMedium,
    fontSize: 12,
    lineHeight: 18,
  },
  resultActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  mapsButton: {
    alignItems: 'center',
    backgroundColor: C.black,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  mapsButtonText: {
    color: C.white,
    fontFamily: T.bodyBold,
    fontSize: 12,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: C.chipBg,
    borderColor: C.borderSubtle,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  actionButtonText: {
    color: C.text,
    fontFamily: T.bodyBold,
    fontSize: 12,
  },
});
