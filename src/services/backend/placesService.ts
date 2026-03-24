import type {
  GooglePlacesPriceLevel,
  NearbyRestaurant,
  PlacesSearchRequest,
  PlacesSearchResponse,
  RestaurantVibeResult,
} from '../../contracts/backend';

import { BackendServiceError, postBackend } from './client';

export type NearbyRestaurantSearchInput = PlacesSearchRequest;

const PLACES_ENDPOINT = '/places/search';

const buildFallbackRestaurantVibe = (query: string): RestaurantVibeResult => {
  const normalizedQuery = query.toLowerCase();
  const typeMap: { keyword: string; type: string }[] = [
    { keyword: 'sushi', type: 'sushi_restaurant' },
    { keyword: 'pizza', type: 'pizza_restaurant' },
    { keyword: 'burger', type: 'hamburger_restaurant' },
    { keyword: 'coffee', type: 'cafe' },
    { keyword: 'ramen', type: 'ramen_restaurant' },
    { keyword: 'steak', type: 'steak_house' },
    { keyword: 'bakery', type: 'bakery' },
    { keyword: 'dessert', type: 'dessert_restaurant' },
    { keyword: 'seafood', type: 'seafood_restaurant' },
  ];

  const placeTypes = typeMap
    .filter((entry) => normalizedQuery.includes(entry.keyword))
    .map((entry) => entry.type);

  const allowedPriceLevels: GooglePlacesPriceLevel[] = normalizedQuery.includes('cheap')
    ? ['PRICE_LEVEL_INEXPENSIVE']
    : normalizedQuery.includes('expensive') || normalizedQuery.includes('fancy')
      ? ['PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE']
      : [];

  return {
    summary: query.trim() || 'nearby restaurants',
    placeTypes: placeTypes.length > 0 ? placeTypes : ['restaurant'],
    allowedPriceLevels,
    keywords: query
      .toLowerCase()
      .split(/\s+/)
      .filter((token) => token.length > 2),
  };
};

const sanitizeRestaurant = (
  restaurant: NearbyRestaurant,
): NearbyRestaurant | null => {
  if (
    typeof restaurant.id !== 'string' ||
    typeof restaurant.name !== 'string' ||
    typeof restaurant.address !== 'string' ||
    typeof restaurant.distanceMeters !== 'number' ||
    typeof restaurant.latitude !== 'number' ||
    typeof restaurant.longitude !== 'number'
  ) {
    return null;
  }

  return {
    id: restaurant.id,
    name: restaurant.name,
    address: restaurant.address,
    rating: typeof restaurant.rating === 'number' ? restaurant.rating : null,
    priceLevel:
      restaurant.priceLevel === 'PRICE_LEVEL_INEXPENSIVE' ||
      restaurant.priceLevel === 'PRICE_LEVEL_MODERATE' ||
      restaurant.priceLevel === 'PRICE_LEVEL_EXPENSIVE' ||
      restaurant.priceLevel === 'PRICE_LEVEL_VERY_EXPENSIVE'
        ? restaurant.priceLevel
        : null,
    distanceMeters: restaurant.distanceMeters,
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
    primaryType:
      typeof restaurant.primaryType === 'string' ? restaurant.primaryType : undefined,
  };
};

export const formatPriceLevel = (
  priceLevel: GooglePlacesPriceLevel | null,
): string => {
  switch (priceLevel) {
    case 'PRICE_LEVEL_INEXPENSIVE':
      return '$';
    case 'PRICE_LEVEL_MODERATE':
      return '$$';
    case 'PRICE_LEVEL_EXPENSIVE':
      return '$$$';
    case 'PRICE_LEVEL_VERY_EXPENSIVE':
      return '$$$$';
    default:
      return 'N/A';
  }
};

export const parseRestaurantVibe = async (
  query: string,
  _signal?: AbortSignal,
): Promise<RestaurantVibeResult> => {
  const trimmedQuery = query.trim();

  return buildFallbackRestaurantVibe(trimmedQuery || 'nearby restaurants');
};

export const searchNearbyRestaurants = async ({
  latitude,
  longitude,
  placeTypes,
  maxResults = 10,
  radiusMeters = 5000,
  allowedPriceLevels = [],
  signal,
}: NearbyRestaurantSearchInput & { signal?: AbortSignal }): Promise<NearbyRestaurant[]> => {
  const uniqueTypes = Array.from(
    new Set(
      placeTypes
        .map((type) => type.trim())
        .filter(Boolean),
    ),
  );

  try {
    const payload = await postBackend<PlacesSearchResponse, PlacesSearchRequest>(
      PLACES_ENDPOINT,
      {
        latitude,
        longitude,
        placeTypes: uniqueTypes.length > 0 ? uniqueTypes : ['restaurant'],
        maxResults,
        radiusMeters,
        allowedPriceLevels,
      },
      { signal },
    );

    return Array.isArray(payload.restaurants)
      ? payload.restaurants
          .map(sanitizeRestaurant)
          .filter((restaurant): restaurant is NearbyRestaurant => restaurant !== null)
          .sort((left, right) => left.distanceMeters - right.distanceMeters)
      : [];
  } catch (error) {
    if (
      error instanceof BackendServiceError &&
      (error.code === 'missing_config' || error.code === 'not_implemented')
    ) {
      throw new Error(
        'Restaurant discovery will work once the secure backend endpoint /places/search is implemented.',
      );
    }

    throw error;
  }
};
