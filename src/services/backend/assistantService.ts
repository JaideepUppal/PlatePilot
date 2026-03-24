import type {
  AiAskRequest,
  AiAskResponse,
  CookingIntent,
  PlatePilotAssistantResult,
} from '../../contracts/backend';

import { BackendServiceError, postBackend } from './client';

const AI_ENDPOINT = '/ai/ask';

const DEFAULT_COOKING_INTENT: CookingIntent = {
  budget: 'any',
  spiceLevel: 'any',
  mealType: 'any',
  cuisine: null,
  constraints: [],
};

const getCuisineHint = (value: string): string | null => {
  const cuisines = [
    'american',
    'chinese',
    'french',
    'indian',
    'italian',
    'japanese',
    'korean',
    'mediterranean',
    'mexican',
    'thai',
    'vietnamese',
  ];

  return cuisines.find((cuisine) => value.includes(cuisine)) ?? null;
};

const buildFallbackIntent = (query: string): CookingIntent => {
  const normalizedQuery = query.toLowerCase();

  return {
    budget: normalizedQuery.includes('cheap')
      ? 'low'
      : normalizedQuery.includes('fancy') || normalizedQuery.includes('premium')
        ? 'high'
        : 'any',
    spiceLevel: normalizedQuery.includes('spicy')
      ? 'spicy'
      : normalizedQuery.includes('mild')
        ? 'mild'
        : 'any',
    mealType: normalizedQuery.includes('breakfast')
      ? 'breakfast'
      : normalizedQuery.includes('lunch')
        ? 'lunch'
        : normalizedQuery.includes('snack')
          ? 'snack'
          : normalizedQuery.includes('dinner')
            ? 'dinner'
            : 'any',
    cuisine: getCuisineHint(normalizedQuery),
    constraints: [],
  };
};

const buildFallbackAssistantMessage = (
  query: string,
  inventoryNames: string[],
  intent: CookingIntent,
  includeBackendNotice = false,
): string => {
  const pantrySnippet =
    inventoryNames.length > 0
      ? `You already have ${inventoryNames.slice(0, 5).join(', ')}.`
      : 'Your pantry context is limited right now.';
  const spiceSnippet =
    intent.spiceLevel === 'spicy'
      ? 'Lean into chili, garlic, and bold sauces.'
      : 'Keep the seasoning balanced and pantry-friendly.';
  const budgetSnippet =
    intent.budget === 'low'
      ? 'Focus on simple, low-cost staples and flexible swaps.'
      : 'Build around the ingredients that will expire first.';
  const backendSnippet = includeBackendNotice
    ? 'Secure AI backend is not connected yet. '
    : '';

  return `${backendSnippet}${pantrySnippet} For "${query}", ${budgetSnippet} ${spiceSnippet}`;
};

const normalizeIntent = (intent: CookingIntent | undefined): CookingIntent => {
  return {
    budget:
      intent?.budget === 'low' ||
      intent?.budget === 'medium' ||
      intent?.budget === 'high' ||
      intent?.budget === 'any'
        ? intent.budget
        : DEFAULT_COOKING_INTENT.budget,
    spiceLevel:
      intent?.spiceLevel === 'mild' ||
      intent?.spiceLevel === 'medium' ||
      intent?.spiceLevel === 'spicy' ||
      intent?.spiceLevel === 'any'
        ? intent.spiceLevel
        : DEFAULT_COOKING_INTENT.spiceLevel,
    mealType:
      intent?.mealType === 'breakfast' ||
      intent?.mealType === 'lunch' ||
      intent?.mealType === 'dinner' ||
      intent?.mealType === 'snack' ||
      intent?.mealType === 'any'
        ? intent.mealType
        : DEFAULT_COOKING_INTENT.mealType,
    cuisine: typeof intent?.cuisine === 'string' ? intent.cuisine : null,
    constraints: Array.isArray(intent?.constraints)
      ? intent.constraints.filter(
          (item): item is string => typeof item === 'string' && item.trim().length > 0,
        )
      : [],
  };
};

const sanitizeAssistantResult = (
  payload: AiAskResponse,
): PlatePilotAssistantResult | null => {
  if (typeof payload.result?.message !== 'string') {
    return null;
  }

  const message = payload.result.message.trim();

  if (!message) {
    return null;
  }

  return {
    message,
    intent: normalizeIntent(payload.result.intent),
  };
};

export const askPlatePilotAssistant = async (
  query: string,
  inventoryNames: string[],
  signal?: AbortSignal,
): Promise<PlatePilotAssistantResult> => {
  const trimmedQuery = query.trim();
  const normalizedInventory = inventoryNames
    .map((name) => name.trim())
    .filter(Boolean);

  if (!trimmedQuery) {
    return {
      message: 'Ask for a meal vibe, substitution, or quick pantry idea.',
      intent: DEFAULT_COOKING_INTENT,
    };
  }

  let includeBackendNotice = false;

  try {
    const payload = await postBackend<AiAskResponse, AiAskRequest>(
      AI_ENDPOINT,
      {
        query: trimmedQuery,
        inventoryNames: normalizedInventory,
      },
      { signal },
    );
    const result = sanitizeAssistantResult(payload);

    if (result) {
      return result;
    }
  } catch (error) {
    includeBackendNotice =
      error instanceof BackendServiceError &&
      (error.code === 'missing_config' || error.code === 'not_implemented');
  }

  const fallbackIntent = buildFallbackIntent(trimmedQuery);

  return {
    message: buildFallbackAssistantMessage(
      trimmedQuery,
      normalizedInventory,
      fallbackIntent,
      includeBackendNotice,
    ),
    intent: fallbackIntent,
  };
};
