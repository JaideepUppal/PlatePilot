import { Router } from 'express';

import { requireAuth } from '../middleware/auth';
import { searchNearbyRestaurants } from '../services/googlePlaces';
import type {
  GooglePlacesPriceLevel,
  PlacesSearchRequest,
  PlacesSearchResponse,
} from '../types/backend';
import { asyncHandler } from '../utils/http';
import {
  expectNumber,
  expectOptionalEnumArray,
  expectOptionalNumber,
  expectRecord,
  expectStringArray,
} from '../utils/validation';

const GOOGLE_PRICE_LEVELS: GooglePlacesPriceLevel[] = [
  'PRICE_LEVEL_INEXPENSIVE',
  'PRICE_LEVEL_MODERATE',
  'PRICE_LEVEL_EXPENSIVE',
  'PRICE_LEVEL_VERY_EXPENSIVE',
];

export const placesRouter = Router();

placesRouter.post(
  '/search',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = expectRecord(req.body);

    const payload: PlacesSearchRequest = {
      latitude: expectNumber(body.latitude, 'latitude', {
        min: -90,
        max: 90,
      }),
      longitude: expectNumber(body.longitude, 'longitude', {
        min: -180,
        max: 180,
      }),
      placeTypes: expectStringArray(body.placeTypes, 'placeTypes', {
        maxItems: 10,
        maxItemLength: 64,
      }),
      maxResults: expectOptionalNumber(body.maxResults, 'maxResults', {
        integer: true,
        min: 1,
        max: 20,
      }),
      radiusMeters: expectOptionalNumber(body.radiusMeters, 'radiusMeters', {
        integer: true,
        min: 100,
        max: 50000,
      }),
      allowedPriceLevels: expectOptionalEnumArray(
        body.allowedPriceLevels,
        'allowedPriceLevels',
        GOOGLE_PRICE_LEVELS,
      ),
    };

    const response: PlacesSearchResponse = {
      restaurants: await searchNearbyRestaurants({
        latitude: payload.latitude,
        longitude: payload.longitude,
        placeTypes: payload.placeTypes,
        maxResults: payload.maxResults ?? 10,
        radiusMeters: payload.radiusMeters ?? 5000,
        allowedPriceLevels: payload.allowedPriceLevels ?? [],
      }),
    };

    res.status(200).json(response);
  }),
);
