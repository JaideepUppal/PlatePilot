import type {
  AiAskRequest,
  AiAskResponse,
  AiRecipeContext,
  CookingIntent,
  PlatePilotAssistantResult,
  PlatePilotRecipeInsight,
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

type AskPlatePilotAssistantOptions = {
  signal?: AbortSignal;
  recipes?: AiRecipeContext[];
};

const COOKING_KEYWORDS = [
  'breakfast',
  'carb',
  'calorie',
  'chef',
  'cook',
  'cooking',
  'cuisine',
  'dinner',
  'dish',
  'fat',
  'flavor',
  'food',
  'ingredient',
  'kitchen',
  'lunch',
  'meal',
  'nutrition',
  'pantry',
  'prep',
  'protein',
  'recipe',
  'spice',
  'substitution',
  'swap',
];

const COOKING_PATTERNS = [
  /what can i make/i,
  /make with/i,
  /meal idea/i,
  /use up/i,
  /leftover/i,
  /for dinner/i,
  /for lunch/i,
  /for breakfast/i,
  /for a snack/i,
];

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

const trimOptionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const trimAndLimitString = (value: unknown, maxLength: number): string | null => {
  const trimmedValue = trimOptionalString(value);

  if (!trimmedValue) {
    return null;
  }

  return trimmedValue.length <= maxLength
    ? trimmedValue
    : `${trimmedValue.slice(0, maxLength - 1).trimEnd()}…`;
};

const sanitizeStringArray = (value: unknown, maxItems = 8): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);
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

const sanitizeRecipeInsights = (value: unknown): PlatePilotRecipeInsight[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map<PlatePilotRecipeInsight | null>((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return null;
      }

      const record = item as Record<string, unknown>;
      const recipeId = trimOptionalString(record.recipeId);
      const summary = trimAndLimitString(record.summary, 150);

      if (!recipeId || !summary) {
        return null;
      }

      return {
        recipeId,
        summary,
        whatToCookFirst: trimAndLimitString(record.whatToCookFirst, 110),
        substitutionTip: trimAndLimitString(record.substitutionTip, 110),
        cookingTip: trimAndLimitString(record.cookingTip, 110),
      };
    })
    .filter((item): item is PlatePilotRecipeInsight => item !== null);
};

const sanitizeAssistantResult = (
  payload: AiAskResponse,
): PlatePilotAssistantResult | null => {
  const message = trimOptionalString(payload.result?.message);

  if (!message) {
    return null;
  }

  return {
    message: trimAndLimitString(message, 240) ?? message,
    intent: normalizeIntent(payload.result.intent),
    title: trimAndLimitString(payload.result.title, 70),
    whyItMatches: trimAndLimitString(payload.result.whyItMatches, 180),
    ingredientsUsed: sanitizeStringArray(payload.result.ingredientsUsed),
    missingIngredients: sanitizeStringArray(payload.result.missingIngredients),
    shortInstructions: sanitizeStringArray(payload.result.shortInstructions, 4),
    substitutionTip: trimAndLimitString(payload.result.substitutionTip, 140),
    refusal: payload.result.refusal === true,
    recipeInsights: sanitizeRecipeInsights(payload.result.recipeInsights),
  };
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

const getInventorySnippet = (inventoryNames: string[]): string => {
  if (inventoryNames.length === 0) {
    return 'your current pantry';
  }

  return inventoryNames.slice(0, 4).join(', ');
};

const isCookingRelatedQuery = (query: string, recipes: AiRecipeContext[]): boolean => {
  if (recipes.length > 0) {
    return true;
  }

  const normalizedQuery = query.toLowerCase();
  return (
    COOKING_KEYWORDS.some((keyword) => normalizedQuery.includes(keyword)) ||
    COOKING_PATTERNS.some((pattern) => pattern.test(query))
  );
};

const buildFallbackRecipeInsight = (
  recipe: AiRecipeContext,
  inventoryNames: string[],
): PlatePilotRecipeInsight => {
  const matchedIngredients = recipe.matchedIngredients.slice(0, 3);
  const missingIngredients = recipe.missingIngredients.slice(0, 2);
  const pantrySnippet = matchedIngredients.length > 0
    ? matchedIngredients.join(', ')
    : getInventorySnippet(inventoryNames);

  return {
    recipeId: recipe.id,
    summary:
      missingIngredients.length === 0
        ? `${recipe.title} fits because you already have ${pantrySnippet} on hand.`
        : `${recipe.title} makes smart use of ${pantrySnippet} and only needs ${missingIngredients.join(', ')}.`,
    whatToCookFirst:
      matchedIngredients.length > 0
        ? `Prep ${matchedIngredients.join(' and ')} first so the cook goes quickly once heat is on.`
        : 'Read the first step before you heat the pan so the timing stays smooth.',
    substitutionTip:
      missingIngredients.length > 0
        ? `If ${missingIngredients[0]} is missing, use the closest pantry-friendly swap that keeps the same role in the dish.`
        : null,
    cookingTip:
      typeof recipe.readyInMinutes === 'number' && recipe.readyInMinutes <= 20
        ? 'Measure and stage everything first so the quick cook stays calm.'
        : 'Give the full method a quick read before you start so the pacing stays easy.',
  };
};

const buildFallbackAssistantMessage = (
  query: string,
  inventoryNames: string[],
  intent: CookingIntent,
  includeBackendNotice = false,
): PlatePilotAssistantResult => {
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

  return {
    message: `${backendSnippet}${pantrySnippet} For "${query}", ${budgetSnippet} ${spiceSnippet}`,
    intent,
    title: 'Pantry-friendly plan',
    whyItMatches: 'This guidance stays grounded in your current pantry context.',
    ingredientsUsed: inventoryNames.slice(0, 5),
    missingIngredients: [],
    shortInstructions: [
      'Start with the ingredients that need to be used first.',
      'Build a simple base with seasoning, aromatics, and one main protein or carb.',
      'Taste as you go and add a quick swap if something is missing.',
    ],
    substitutionTip: 'Use flexible staples like rice, eggs, beans, or frozen vegetables to fill gaps.',
    refusal: false,
    recipeInsights: [],
  };
};

const buildFallbackRefusal = (
  includeBackendNotice = false,
): PlatePilotAssistantResult => {
  return {
    message: `${includeBackendNotice ? 'Secure AI backend is not connected yet. ' : ''}PlatePilot stays focused on cooking, recipes, pantry planning, substitutions, and nutrition. Try asking something like "What can I make with eggs and rice?"`,
    intent: DEFAULT_COOKING_INTENT,
    title: 'Let’s keep it in the kitchen',
    whyItMatches: null,
    ingredientsUsed: [],
    missingIngredients: [],
    shortInstructions: [],
    substitutionTip: null,
    refusal: true,
    recipeInsights: [],
  };
};

const buildRecipeEnhancementFallback = (
  recipes: AiRecipeContext[],
  inventoryNames: string[],
): PlatePilotRecipeInsight[] => {
  return recipes.map((recipe) => buildFallbackRecipeInsight(recipe, inventoryNames));
};

export const askPlatePilotAssistant = async (
  query: string,
  inventoryNames: string[],
  { signal, recipes = [] }: AskPlatePilotAssistantOptions = {},
): Promise<PlatePilotAssistantResult> => {
  const trimmedQuery = query.trim();
  const normalizedInventory = inventoryNames
    .map((name) => name.trim())
    .filter(Boolean);
  const normalizedRecipes = recipes.slice(0, 4).map((recipe) => ({
    id: recipe.id,
    title: recipe.title.trim(),
    matchedIngredients: recipe.matchedIngredients.map((item) => item.trim()).filter(Boolean),
    missingIngredients: recipe.missingIngredients.map((item) => item.trim()).filter(Boolean),
    instructions: recipe.instructions?.map((step) => step.trim()).filter(Boolean),
    servings: recipe.servings,
    readyInMinutes: recipe.readyInMinutes,
    nutrition: recipe.nutrition,
  }));

  if (!trimmedQuery) {
    return {
      message: 'Ask for a recipe idea, substitution, pantry plan, or nutrition help.',
      intent: DEFAULT_COOKING_INTENT,
      title: 'Kitchen Co-Pilot',
      whyItMatches: null,
      ingredientsUsed: [],
      missingIngredients: [],
      shortInstructions: [],
      substitutionTip: null,
      refusal: false,
      recipeInsights: [],
    };
  }

  let includeBackendNotice = false;

  try {
    const payload = await postBackend<AiAskResponse, AiAskRequest>(
      AI_ENDPOINT,
      {
        query: trimmedQuery,
        inventoryNames: normalizedInventory,
        recipes: normalizedRecipes,
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

  if (!isCookingRelatedQuery(trimmedQuery, normalizedRecipes)) {
    return buildFallbackRefusal(includeBackendNotice);
  }

  const fallbackIntent = buildFallbackIntent(trimmedQuery);

  return {
    ...buildFallbackAssistantMessage(
      trimmedQuery,
      normalizedInventory,
      fallbackIntent,
      includeBackendNotice,
    ),
    recipeInsights: buildRecipeEnhancementFallback(normalizedRecipes, normalizedInventory),
  };
};

export const enhanceRecipeSuggestionsWithAssistant = async (
  recipes: AiRecipeContext[],
  inventoryNames: string[],
  signal?: AbortSignal,
): Promise<PlatePilotRecipeInsight[]> => {
  if (recipes.length === 0) {
    return [];
  }

  try {
    const result = await askPlatePilotAssistant(
      'Use these Spoonacular recipes to give concise, pantry-aware guidance: why each recipe fits, what to prep first, one easy swap, and one practical cooking tip.',
      inventoryNames,
      {
        signal,
        recipes,
      },
    );

    if (Array.isArray(result.recipeInsights) && result.recipeInsights.length > 0) {
      return result.recipeInsights;
    }
  } catch {
    // Fall back below so recipe data still renders cleanly.
  }

  return buildRecipeEnhancementFallback(recipes, inventoryNames);
};
