import { getRequiredEnv } from '../config/env';
import { ExternalServiceError } from '../utils/http';
import type {
  GooglePlacesPriceLevel,
  NearbyRestaurant,
  PlacesSearchRequest,
} from '../types/backend';

type PlacesDisplayName = {
  text?: string;
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
};

type NearbySearchResponse = {
  places?: NearbyPlace[];
};

const PLACES_ENDPOINT = 'https://places.googleapis.com/v1/places:searchNearby';
const PLACES_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.priceLevel',
  'places.primaryType',
].join(',');

const toRadians = (value: number): number => {
  return (value * Math.PI) / 180;
};

const getDistanceMeters = (
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
): number => {
  const earthRadiusMeters = 6371000;
  const latitudeDelta = toRadians(toLatitude - fromLatitude);
  const longitudeDelta = toRadians(toLongitude - fromLongitude);
  const a =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(toRadians(fromLatitude)) *
      Math.cos(toRadians(toLatitude)) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(earthRadiusMeters * c);
};

const parsePlacesError = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as {
      error?: {
        message?: string;
      };
    };

    if (typeof payload.error?.message === 'string' && payload.error.message.trim()) {
      return payload.error.message;
    }
  } catch {
    // Ignore parse failures and fall back to the generic message below.
  }

  return `Google Places request failed (${response.status}).`;
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

  const response = await fetch(PLACES_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': PLACES_FIELD_MASK,
    },
    body: JSON.stringify({
      includedTypes: placeTypes.length > 0 ? placeTypes : ['restaurant'],
      maxResultCount: maxResults,
      rankPreference: 'DISTANCE',
      locationRestriction: {
        circle: {
          center: {
            latitude,
            longitude,
          },
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
      const placeLatitude = place.location?.latitude;
      const placeLongitude = place.location?.longitude;

      if (typeof placeLatitude !== 'number' || typeof placeLongitude !== 'number') {
        return null;
      }

      return {
        id:
          place.id ??
          `${place.displayName?.text ?? 'restaurant'}-${placeLatitude}-${placeLongitude}`,
        name: place.displayName?.text?.trim() || 'Unnamed place',
        address: place.formattedAddress?.trim() || 'Address unavailable',
        rating: typeof place.rating === 'number' ? place.rating : null,
        priceLevel: place.priceLevel ?? null,
        distanceMeters: getDistanceMeters(
          latitude,
          longitude,
          placeLatitude,
          placeLongitude,
        ),
        latitude: placeLatitude,
        longitude: placeLongitude,
        primaryType: place.primaryType,
      };
    })
    .filter((place): place is NearbyRestaurant => place !== null)
    .filter((place) => {
      if (allowedPriceLevels.length === 0) {
        return true;
      }

      return (
        place.priceLevel !== null && allowedPriceLevels.includes(place.priceLevel)
      );
    })
    .sort((left, right) => left.distanceMeters - right.distanceMeters);
};
