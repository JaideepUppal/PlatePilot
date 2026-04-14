import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
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

const PLACEHOLDER_OPTIONS = [
  'cheap ramen near me',
  'something spicy tonight',
  'sushi for dinner?',
  'fancy Italian',
  'quick lunch nearby',
];

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

const AnimatedRestaurantCard = ({
  children,
  index,
}: {
  children: (args: {
    badgePulseAnim: Animated.Value;
    metaAnim: Animated.Value;
    actionsAnim: Animated.Value;
  }) => React.ReactNode;
  index: number;
}) => {
  const entranceAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;
  const badgePulseAnim = useRef(new Animated.Value(0)).current;
  const metaAnim = useRef(new Animated.Value(0)).current;
  const actionsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    entranceAnim.setValue(0);
    metaAnim.setValue(0);
    actionsAnim.setValue(0);

    Animated.sequence([
      Animated.timing(entranceAnim, {
        toValue: 1,
        duration: 420,
        delay: index * 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(metaAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(actionsAnim, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.back(1.15)),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [actionsAnim, entranceAnim, index, metaAnim]);

  useEffect(() => {
    badgePulseAnim.setValue(0);

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(badgePulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(badgePulseAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [badgePulseAnim]);

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.985,
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
              outputRange: [22, 0],
            }),
          },
          {
            scale: Animated.multiply(
              pressAnim,
              entranceAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.985, 1],
              }),
            ),
          },
        ],
      }}
    >
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
        {children({
          badgePulseAnim,
          metaAnim,
          actionsAnim,
        })}
      </Pressable>
    </Animated.View>
  );
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

  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const placeholderOpacity = useRef(new Animated.Value(1)).current;
  const placeholderTranslateY = useRef(new Animated.Value(0)).current;
  const inputFocusAnim = useRef(new Animated.Value(0)).current;
  const searchButtonPressAnim = useRef(new Animated.Value(1)).current;
  const loadingCardAnim = useRef(new Animated.Value(0)).current;
  const summaryCardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void loadLocation();
  }, []);

  useEffect(() => {
    if (searching) {
      loadingCardAnim.setValue(0);
      Animated.timing(loadingCardAnim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      loadingCardAnim.setValue(0);
    }
  }, [loadingCardAnim, searching]);

  useEffect(() => {
    if (parsedVibe) {
      summaryCardAnim.setValue(0);
      Animated.timing(summaryCardAnim, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      summaryCardAnim.setValue(0);
    }
  }, [parsedVibe, summaryCardAnim]);

  useEffect(() => {
    if (vibeInput.trim().length > 0) return;

    const interval = setInterval(() => {
      Animated.parallel([
        Animated.timing(placeholderOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(placeholderTranslateY, {
          toValue: -6,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_OPTIONS.length);

        placeholderTranslateY.setValue(6);

        Animated.parallel([
          Animated.timing(placeholderOpacity, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.timing(placeholderTranslateY, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 2600);

    return () => clearInterval(interval);
  }, [placeholderOpacity, placeholderTranslateY, vibeInput]);

  const handleSearchPressIn = () => {
    Animated.spring(searchButtonPressAnim, {
      toValue: 0.97,
      friction: 7,
      tension: 180,
      useNativeDriver: true,
    }).start();
  };

  const handleSearchPressOut = () => {
    Animated.spring(searchButtonPressAnim, {
      toValue: 1,
      friction: 6,
      tension: 180,
      useNativeDriver: true,
    }).start();
  };

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

  const animateInputFocus = (isFocused: boolean) => {
    Animated.spring(inputFocusAnim, {
      toValue: isFocused ? 1 : 0,
      friction: 8,
      tension: 150,
      useNativeDriver: false,
    }).start();
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

      <Animated.View style={styles.searchCard}>
        <Text style={styles.sectionTitle}>Find something to eat</Text>

        <Text style={styles.sectionText}>
          Tell us what you&apos;re in the mood for, and we’ll find places nearby that match.
        </Text>

        <Animated.View
          style={[
            styles.inputWrap,
            {
              transform: [
                {
                  scale: inputFocusAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.015],
                  }),
                },
              ],
              shadowOpacity: inputFocusAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.04, 0.14],
              }),
              shadowRadius: inputFocusAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [8, 18],
              }),
              borderColor: inputFocusAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [C.borderSubtle, C.orange],
              }),
            },
          ]}
        >
          <TextInput
            mode="outlined"
            onBlur={() => animateInputFocus(false)}
            onChangeText={(value) => {
              setVibeInput(value);
              setSearchError(null);
            }}
            onFocus={() => animateInputFocus(true)}
            outlineStyle={styles.inputOutline}
            placeholder=""
            placeholderTextColor={C.placeholder}
            style={styles.input}
            theme={platePilotInputTheme}
            value={vibeInput}
          />

          {vibeInput.trim().length === 0 ? (
            <Animated.Text
              pointerEvents="none"
              style={[
                styles.animatedPlaceholder,
                {
                  opacity: placeholderOpacity,
                  transform: [{ translateY: placeholderTranslateY }],
                },
              ]}
            >
              {PLACEHOLDER_OPTIONS[placeholderIndex]}
            </Animated.Text>
          ) : null}
        </Animated.View>

        <View style={styles.buttonRow}>
          <Animated.View
            style={{
              transform: [{ scale: searchButtonPressAnim }],
            }}
          >
            <Pressable onPressIn={handleSearchPressIn} onPressOut={handleSearchPressOut}>
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
            </Pressable>
          </Animated.View>

          <Button
            labelStyle={styles.secondaryButtonLabel}
            mode="text"
            onPress={() => {
              void loadLocation();
            }}
            textColor={C.orange}
          >
            Update Location
          </Button>
        </View>
      </Animated.View>

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
        <Animated.View
          style={[
            styles.loadingCard,
            {
              opacity: loadingCardAnim,
              transform: [
                {
                  translateY: loadingCardAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [14, 0],
                  }),
                },
                {
                  scale: loadingCardAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.98, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <ActivityIndicator color={C.orange} size="large" />
          <Text style={styles.loadingText}>Parsing your vibe and finding nearby spots...</Text>
        </Animated.View>
      ) : null}

      {parsedVibe ? (
        <Animated.View
          style={[
            styles.summaryCard,
            {
              opacity: summaryCardAnim,
              transform: [
                {
                  translateY: summaryCardAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
                  }),
                },
                {
                  scale: summaryCardAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.985, 1],
                  }),
                },
              ],
            },
          ]}
        >
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
        </Animated.View>
      ) : null}

      {parsedVibe && results.length === 0 && !searching && !searchError ? (
        <View style={styles.locationCard}>
          <Text style={styles.sectionTitle}>No nearby matches</Text>
          <Text style={styles.sectionText}>
            Try a broader vibe or refresh your location for a wider search radius.
          </Text>
        </View>
      ) : null}

      {results.map((restaurant, index) => {
        const openStatus = getOpenStatus(restaurant.openingHours);
        const priceLabel = formatPriceLevel(restaurant.priceLevel);

        return (
          <AnimatedRestaurantCard key={restaurant.id} index={index}>
            {({ badgePulseAnim, metaAnim, actionsAnim }) => (
              <View style={styles.resultCard}>
                {/* Name + open/closed badge */}
                <View style={styles.resultHeaderRow}>
                  <Text style={styles.resultName} numberOfLines={2}>
                    {restaurant.name}
                  </Text>
                  {openStatus ? (
                    <Animated.View
                      style={[
                        styles.openBadge,
                        openStatus === 'open' ? styles.openBadgeGreen : styles.openBadgeRed,
                        openStatus === 'open'
                          ? {
                              transform: [
                                {
                                  scale: badgePulseAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [1, 1.04],
                                  }),
                                },
                              ],
                            }
                          : null,
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
                          openStatus === 'open'
                            ? styles.openBadgeTextGreen
                            : styles.openBadgeTextRed,
                        ]}
                      >
                        {openStatus === 'open' ? 'Open' : 'Closed'}
                      </Text>
                    </Animated.View>
                  ) : null}
                </View>

                {/* Cuisine type */}
                {restaurant.primaryType ? (
                  <Text style={styles.resultCuisine}>
                    {restaurant.primaryType.replace(/_/g, ' ')}
                  </Text>
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
                <Animated.View
                  style={[
                    styles.resultMetaRow,
                    {
                      opacity: metaAnim,
                      transform: [
                        {
                          translateY: metaAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [10, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.metaPill}>
                    <MaterialCommunityIcons
                      name="map-marker-distance"
                      size={12}
                      color={C.textSoft}
                    />
                    <Text style={styles.metaPillText}>
                      {formatDistance(restaurant.distanceMeters)}
                    </Text>
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
                        restaurant.priceLevel === 'PRICE_LEVEL_VERY_EXPENSIVE' &&
                          styles.metaPillRed,
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
                </Animated.View>

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
                <Animated.View
                  style={[
                    styles.resultActionsRow,
                    {
                      opacity: actionsAnim,
                      transform: [
                        {
                          translateY: actionsAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [12, 0],
                          }),
                        },
                        {
                          scale: actionsAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.97, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.mapsButton}
                    onPress={() => openInMaps(restaurant)}
                  >
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
                </Animated.View>
              </View>
            )}
          </AnimatedRestaurantCard>
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
    overflow: 'hidden',
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
    borderColor: 'transparent',
  },
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
  inputWrap: {
    marginTop: 16,
    position: 'relative',
    width: '100%',
    backgroundColor: C.white,
    borderColor: C.borderSubtle,
    borderRadius: R.input,
    borderWidth: 1,
    shadowColor: C.orangeDark,
    shadowOffset: { width: 0, height: 8 },
  },

  animatedPlaceholder: {
    color: C.placeholder,
    fontFamily: T.bodyMedium,
    fontSize: 15,
    left: 16,
    position: 'absolute',
    top: 18,
  },
});
