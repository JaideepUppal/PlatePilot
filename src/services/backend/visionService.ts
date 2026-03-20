import type {
  DetectedIngredient,
  VisionDetectRequest,
  VisionDetectResponse,
} from '../../contracts/backend';

import { BackendServiceError, postBackend } from './client';

type DetectIngredientsOptions = {
  maxResults?: number;
  signal?: AbortSignal;
};

const VISION_ENDPOINT = '/api/vision/detect';

const isDetectedIngredient = (value: DetectedIngredient): boolean => {
  return (
    typeof value.ingredient === 'string' &&
    value.ingredient.trim().length > 0 &&
    typeof value.sourceLabel === 'string' &&
    typeof value.confidence === 'number'
  );
};

export const detectIngredientsFromBase64 = async (
  base64Image: string,
  { maxResults = 20, signal }: DetectIngredientsOptions = {},
): Promise<DetectedIngredient[]> => {
  try {
    const payload = await postBackend<VisionDetectResponse, VisionDetectRequest>(
      VISION_ENDPOINT,
      {
        imageBase64: base64Image,
        maxResults,
      },
      { signal },
    );

    return Array.isArray(payload.ingredients)
      ? payload.ingredients.filter(isDetectedIngredient).slice(0, 12)
      : [];
  } catch (error) {
    if (
      error instanceof BackendServiceError &&
      (error.code === 'missing_config' || error.code === 'not_implemented')
    ) {
      throw new Error(
        'Ingredient scanning will work once the secure backend endpoint /api/vision/detect is implemented.',
      );
    }

    throw error;
  }
};
