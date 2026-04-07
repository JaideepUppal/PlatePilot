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
const AI_ENDPOINT = '/ai/vibe';

// keyword map 
const CUISINE_TYPE_MAP: { keywords: string[]; type: string }[] = [
  { keywords: ['sushi', 'sashimi', 'maki'], type: 'sushi_restaurant' },
  { keywords: ['ramen', 'tonkotsu', 'miso ramen'], type: 'ramen_restaurant' },
  { keywords: ['pizza', 'pizzeria', 'neapolitan'], type: 'pizza_restaurant' },
  { keywords: ['burger', 'burgers', 'smash burger'], type: 'burger_restaurant' },
  { keywords: ['coffee', 'espresso', 'latte', 'cappuccino', 'flat white'], type: 'coffee_shop' },
  { keywords: ['cafe', 'café', 'brunch cafe'], type: 'cafe' },
  { keywords: ['steak', 'steakhouse', 'bbq steak', 'wagyu'], type: 'steak_house' },
  { keywords: ['bakery', 'bread', 'croissant', 'pastry'], type: 'bakery' },
  { keywords: ['dessert', 'cake', 'sweets', 'brownie', 'tart'], type: 'dessert_shop' },
  { keywords: ['ice cream', 'gelato', 'frozen yogurt', 'sorbet'], type: 'ice_cream_shop' },
  {
    keywords: ['seafood', 'fish', 'lobster', 'oyster', 'crab', 'shrimp'],
    type: 'seafood_restaurant',
  },
  {
    keywords: ['indian', 'curry', 'biryani', 'tikka', 'naan', 'masala', 'tandoori'],
    type: 'indian_restaurant',
  },
  { keywords: ['chinese', 'dim sum', 'wonton', 'dumplings', 'peking'], type: 'chinese_restaurant' },
  {
    keywords: ['japanese', 'izakaya', 'tempura', 'yakitori', 'udon', 'soba'],
    type: 'japanese_restaurant',
  },
  {
    keywords: ['korean', 'kbbq', 'korean bbq', 'bibimbap', 'bulgogi', 'tteokbokki'],
    type: 'korean_restaurant',
  },
  {
    keywords: ['thai', 'pad thai', 'green curry', 'thai food', 'tom yum'],
    type: 'thai_restaurant',
  },
  {
    keywords: ['mexican', 'taco', 'tacos', 'burrito', 'quesadilla', 'guacamole', 'enchilada'],
    type: 'mexican_restaurant',
  },
  {
    keywords: ['italian', 'pasta', 'risotto', 'lasagna', 'carbonara', 'tiramisu'],
    type: 'italian_restaurant',
  },
  {
    keywords: ['mediterranean', 'hummus', 'falafel', 'shawarma', 'kebab', 'pita'],
    type: 'mediterranean_restaurant',
  },
  {
    keywords: ['middle eastern', 'arabic', 'lebanese', 'turkish'],
    type: 'middle_eastern_restaurant',
  },
  {
    keywords: ['american', 'wings', 'ribs', 'mac and cheese', 'fried chicken'],
    type: 'american_restaurant',
  },
  {
    keywords: ['fast food', 'mcdonalds', "mcdonald's", 'kfc', 'subway', 'quick bite'],
    type: 'fast_food_restaurant',
  },
  { keywords: ['vegetarian', 'veggie', 'plant based', 'meatless'], type: 'vegetarian_restaurant' },
  { keywords: ['vegan', 'plant-based', 'dairy free', 'cruelty free'], type: 'vegan_restaurant' },
  { keywords: ['sandwich', 'sub', 'panini', 'wrap', 'deli'], type: 'sandwich_shop' },
  { keywords: ['bar', 'pub', 'cocktails', 'drinks', 'nightlife', 'beer', 'wine bar'], type: 'bar' },
  {
    keywords: ['breakfast', 'eggs benedict', 'pancakes', 'waffles', 'morning'],
    type: 'breakfast_restaurant',
  },
  { keywords: ['brunch', 'bottomless brunch', 'weekend brunch'], type: 'brunch_restaurant' },
];

const PRICE_KEYWORDS: { keywords: string[]; levels: GooglePlacesPriceLevel[] }[] = [
  {
    keywords: ['cheap', 'budget', 'affordable', 'inexpensive', 'cheap eats', 'student', 'broke'],
    levels: ['PRICE_LEVEL_INEXPENSIVE'],
  },
  {
    keywords: ['moderate', 'mid range', 'mid-range', 'reasonable', 'not too expensive'],
    levels: ['PRICE_LEVEL_INEXPENSIVE', 'PRICE_LEVEL_MODERATE'],
  },
  {
    keywords: ['fancy', 'expensive', 'upscale', 'fine dining', 'premium', 'luxury', 'splurge'],
    levels: ['PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE'],
  },
];

const buildFallbackRestaurantVibe = (query: string): RestaurantVibeResult => {
  const normalizedQuery = query.toLowerCase();

  // Finding matching cuisine types
  const placeTypes = CUISINE_TYPE_MAP.filter((entry) =>
    entry.keywords.some((keyword) => normalizedQuery.includes(keyword)),
  ).map((entry) => entry.type);

  // Finding price level filter
  const priceMatch = PRICE_KEYWORDS.find((entry) =>
    entry.keywords.some((keyword) => normalizedQuery.includes(keyword)),
  );
  const allowedPriceLevels: GooglePlacesPriceLevel[] = priceMatch?.levels ?? [];

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

export const parseRestaurantVibe = async (
  query: string,
  _signal?: AbortSignal,
): Promise<RestaurantVibeResult> => {
  const trimmedQuery = query.trim();

  // Try the AI endpoint first, fall back to keyword matching if it fails
  try {
    const result = await postBackend<RestaurantVibeResult, { query: string }>(AI_ENDPOINT, {
      query: trimmedQuery || 'nearby restaurants',
    });
    if (result && Array.isArray(result.placeTypes) && result.placeTypes.length > 0) {
      return result;
    }
  } catch {
    // AI endpoint failed or not implemented, so we fall through to keyword matching
  }

  return buildFallbackRestaurantVibe(trimmedQuery || 'nearby restaurants');
};

export const formatPriceLevel = (priceLevel: GooglePlacesPriceLevel | null): string => {
  switch (priceLevel) {
    case 'PRICE_LEVEL_INEXPENSIVE':
      return '¥ · Cheap';
    case 'PRICE_LEVEL_MODERATE':
      return '¥¥ · Moderate';
    case 'PRICE_LEVEL_EXPENSIVE':
      return '¥¥¥ · Expensive';
    case 'PRICE_LEVEL_VERY_EXPENSIVE':
      return '¥¥¥¥ · Very Expensive';
    default:
      return '';
  }
};

const sanitizeRestaurant = (restaurant: NearbyRestaurant): NearbyRestaurant | null => {
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
    primaryType: typeof restaurant.primaryType === 'string' ? restaurant.primaryType : undefined,
    openingHours: typeof restaurant.openingHours === 'string' ? restaurant.openingHours : null,
    website: typeof restaurant.website === 'string' ? restaurant.website : null,
    phone: typeof restaurant.phone === 'string' ? restaurant.phone : null,
  };
};

export const searchNearbyRestaurants = async ({
  latitude,
  longitude,
  placeTypes,
  maxResults = 20, // 20 results
  radiusMeters = 10000, // 10km radius
  allowedPriceLevels = [],
  signal,
}: NearbyRestaurantSearchInput & { signal?: AbortSignal }): Promise<NearbyRestaurant[]> => {
  const uniqueTypes = Array.from(new Set(placeTypes.map((type) => type.trim()).filter(Boolean)));

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
