import { getRequiredEnv } from '../config/env';
import { ExternalServiceError } from '../utils/http';
import type { DetectedIngredient } from '../types/backend';

type VisionLabelAnnotation = {
  description?: string;
  score?: number;
};

type VisionAnnotateResponse = {
  responses?: {
    labelAnnotations?: VisionLabelAnnotation[];
    error?: {
      message?: string;
    };
  }[];
};

const GOOGLE_VISION_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate';
const MIN_CONFIDENCE = 0.68;

const LABEL_ALIAS_MAP: Record<string, string> = {
  apples: 'apple',
  avocados: 'avocado',
  bananas: 'banana',
  blueberries: 'blueberry',
  breads: 'bread',
  burgers: 'burger',
  carrots: 'carrot',
  chilies: 'chili pepper',
  chillies: 'chili pepper',
  cucumbers: 'cucumber',
  eggs: 'egg',
  grapes: 'grape',
  lemons: 'lemon',
  limes: 'lime',
  mushrooms: 'mushroom',
  onions: 'onion',
  oranges: 'orange',
  peppers: 'pepper',
  potatoes: 'potato',
  sausages: 'sausage',
  strawberries: 'strawberry',
  tomatoes: 'tomato',
  tortillas: 'tortilla',
};

const BLOCKED_LABELS = new Set([
  'animal product',
  'baked goods',
  'breakfast',
  'brunch',
  'cuisine',
  'dish',
  'dishware',
  'drink',
  'fast food',
  'food',
  'food group',
  'fruit',
  'ingredient',
  'kitchen utensil',
  'meal',
  'plant',
  'plate',
  'produce',
  'recipe',
  'tableware',
  'vegetable',
  'whole food',
]);

const normalizeIngredientName = (value: string): string => {
  const normalizedValue = value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalizedValue) {
    return '';
  }

  if (normalizedValue in LABEL_ALIAS_MAP) {
    return LABEL_ALIAS_MAP[normalizedValue];
  }

  if (normalizedValue.endsWith('ies') && normalizedValue.length > 4) {
    return `${normalizedValue.slice(0, -3)}y`;
  }

  if (normalizedValue.endsWith('oes') && normalizedValue.length > 4) {
    return normalizedValue.slice(0, -2);
  }

  if (
    normalizedValue.endsWith('s') &&
    !normalizedValue.endsWith('ss') &&
    normalizedValue.length > 3
  ) {
    return normalizedValue.slice(0, -1);
  }

  return normalizedValue;
};

const isUsefulIngredientLabel = (ingredient: string): boolean => {
  if (!ingredient) {
    return false;
  }

  if (BLOCKED_LABELS.has(ingredient)) {
    return false;
  }

  if (ingredient.includes('table') || ingredient.includes('kitchen')) {
    return false;
  }

  return ingredient.length >= 3;
};

const stripBase64Prefix = (value: string): string => {
  const [, maybeBase64] = value.split('base64,');
  return maybeBase64?.trim() || value.trim();
};

const parseVisionError = async (response: Response): Promise<string> => {
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

  return `Google Vision request failed (${response.status}).`;
};

export const detectIngredients = async (
  imageBase64: string,
  maxResults = 20,
): Promise<DetectedIngredient[]> => {
  const apiKey = getRequiredEnv('GOOGLE_VISION_API_KEY');

  const response = await fetch(
    `${GOOGLE_VISION_ENDPOINT}?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: stripBase64Prefix(imageBase64),
            },
            features: [
              {
                type: 'LABEL_DETECTION',
                maxResults,
              },
            ],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    throw new ExternalServiceError(await parseVisionError(response));
  }

  const payload = (await response.json()) as VisionAnnotateResponse;
  const annotateResponse = payload.responses?.[0];

  if (annotateResponse?.error?.message) {
    throw new ExternalServiceError(annotateResponse.error.message);
  }

  const seenIngredients = new Set<string>();

  return (annotateResponse?.labelAnnotations ?? [])
    .filter((label) => typeof label.description === 'string')
    .map((label) => {
      const ingredient = normalizeIngredientName(label.description ?? '');

      return {
        ingredient,
        sourceLabel: label.description?.trim() ?? ingredient,
        confidence: typeof label.score === 'number' ? label.score : 0,
      };
    })
    .filter((item) => item.confidence >= MIN_CONFIDENCE)
    .filter((item) => isUsefulIngredientLabel(item.ingredient))
    .filter((item) => {
      if (seenIngredients.has(item.ingredient)) {
        return false;
      }

      seenIngredients.add(item.ingredient);
      return true;
    })
    .slice(0, 12);
};
