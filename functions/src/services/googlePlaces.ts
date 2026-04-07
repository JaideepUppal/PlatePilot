import { getRequiredEnv } from '../config/env';
import { ExternalServiceError } from '../utils/http';
import type {
  GooglePlacesPriceLevel,
  NearbyRestaurant,
  PlacesSearchRequest,
} from '../types/backend';

const PLACES_ENDPOINT = 'https://places.googleapis.com/v1/places:searchNearby';

const PLACES_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.priceLevel',
  'places.primaryType',
  'places.currentOpeningHours',
  'places.websiteUri',
  'places.nationalPhoneNumber',
].join(',');

// https://developers.google.com/maps/documentation/places/web-service/place-types
const PLACE_TYPE_MAP: Record<string, string> = {
  restaurant: 'restaurant',
  cafe: 'cafe',
  coffee_shop: 'coffee_shop',
  bar: 'bar',
  bakery: 'bakery',
  fast_food_restaurant: 'fast_food_restaurant',
  sushi_restaurant: 'sushi_restaurant',
  ramen_restaurant: 'ramen_restaurant',
  pizza_restaurant: 'pizza_restaurant',
  burger_restaurant: 'burger_restaurant',
  chinese_restaurant: 'chinese_restaurant',
  italian_restaurant: 'italian_restaurant',
  japanese_restaurant: 'japanese_restaurant',
  korean_restaurant: 'korean_restaurant',
  indian_restaurant: 'indian_restaurant',
  thai_restaurant: 'thai_restaurant',
  mexican_restaurant: 'mexican_restaurant',
  dessert_shop: 'dessert_shop',
  ice_cream_shop: 'ice_cream_shop',
  sandwich_shop: 'sandwich_shop',
  seafood_restaurant: 'seafood_restaurant',
  steak_house: 'steak_house',
  vegetarian_restaurant: 'vegetarian_restaurant',
  vegan_restaurant: 'vegan_restaurant',
  middle_eastern_restaurant: 'middle_eastern_restaurant',
  mediterranean_restaurant: 'mediterranean_restaurant',
  american_restaurant: 'american_restaurant',
  brunch_restaurant: 'brunch_restaurant',
  breakfast_restaurant: 'breakfast_restaurant',
};

type PlacesDisplayName = {
  text?: string;
};

type PlacesOpeningHours = {
  openNow?: boolean;
  weekdayDescriptions?: string[];
};

type NearbyPlace = {
  id?: string;
  displayName?: PlacesDisplayName;
  formattedAddress?: string;
  rating?: number;
  priceLevel?: GooglePlacesPriceLevel;
  primaryType?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  currentOpeningHours?: PlacesOpeningHours;
  websiteUri?: string;
  nationalPhoneNumber?: string;
};

type NearbySearchResponse = {
  places?: NearbyPlace[];
  error?: {
    message?: string;
  };
};

const toRadians = (value: number): number => (value * Math.PI) / 180;

const getDistanceMeters = (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): number => {
  const R = 6371000;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const parsePlacesError = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as NearbySearchResponse;
    if (typeof payload.error?.message === 'string' && payload.error.message.trim()) {
      return payload.error.message;
    }
  } catch {
    // ignore
  }
  return `Google Places request failed (${response.status}).`;
};

// Format opening hours into a readable string
const formatOpeningHours = (hours: PlacesOpeningHours | undefined): string | null => {
  if (!hours) return null;
  if (hours.weekdayDescriptions && hours.weekdayDescriptions.length > 0) {
    return hours.weekdayDescriptions.join('\n');
  }
  return null;
};

export const searchNearbyRestaurants = async ({
  latitude,
  longitude,
  placeTypes,
  maxResults = 10,
  radiusMeters = 5000,
  allowedPriceLevels = [],
}: PlacesSearchRequest): Promise<NearbyRestaurant[]> => {
  const apiKey = getRequiredEnv('GOOGLE_MAPS_API_KEY');

  // Map AI-generated place types to Google's type strings
  const mappedTypes = placeTypes.map((type) => PLACE_TYPE_MAP[type]).filter(Boolean);

  // Fall back to generic 'restaurant' if nothing matched
  const includedTypes = mappedTypes.length > 0 ? mappedTypes.slice(0, 50) : ['restaurant'];

  const response = await fetch(PLACES_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': PLACES_FIELD_MASK,
    },
    body: JSON.stringify({
      includedTypes,
      maxResultCount: Math.min(maxResults, 20), // API max is 20
      rankPreference: 'DISTANCE',
      locationRestriction: {
        circle: {
          center: { latitude, longitude },
          radius: radiusMeters,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new ExternalServiceError(await parsePlacesError(response));
  }

  const payload = (await response.json()) as NearbySearchResponse;

  return (payload.places ?? [])
    .map((place): NearbyRestaurant | null => {
      const placeLat = place.location?.latitude;
      const placeLng = place.location?.longitude;

      if (typeof placeLat !== 'number' || typeof placeLng !== 'number') {
        return null;
      }

      return {
        id: place.id ?? `${placeLat}-${placeLng}`,
        name: place.displayName?.text?.trim() || 'Unnamed place',
        address: place.formattedAddress?.trim() || 'Address unavailable',
        rating: typeof place.rating === 'number' ? place.rating : null,
        priceLevel: place.priceLevel ?? null,
        distanceMeters: getDistanceMeters(latitude, longitude, placeLat, placeLng),
        latitude: placeLat,
        longitude: placeLng,
        primaryType: place.primaryType,
        openingHours: formatOpeningHours(place.currentOpeningHours),
        website: place.websiteUri ?? null,
        phone: place.nationalPhoneNumber ?? null,
      };
    })
    .filter((place): place is NearbyRestaurant => place !== null)
    .filter((place) => {
      if (allowedPriceLevels.length === 0) return true;
      return place.priceLevel !== null && allowedPriceLevels.includes(place.priceLevel);
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
};
