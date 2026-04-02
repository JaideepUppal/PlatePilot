import { getRequiredEnv } from '../config/env';
import { ExternalServiceError } from '../utils/http';
import type {
  RecipeNutritionSummary,
  RecipeSuggestion,
  RecipesFindRequest,
} from '../types/backend';

type SpoonacularIngredient = {
  id: number;
  name: string;
  original?: string;
};

type SpoonacularRecipeSearchResult = {
  id: number;
  title: string;
  image?: string;
  usedIngredients?: SpoonacularIngredient[];
  missedIngredients?: SpoonacularIngredient[];
  unusedIngredients?: SpoonacularIngredient[];
  likes?: number;
};

type SpoonacularInstructionStep = {
  number?: number;
  step?: string;
};

type SpoonacularAnalyzedInstruction = {
  steps?: SpoonacularInstructionStep[];
};

type SpoonacularNutrient = {
  name?: string;
  amount?: number;
  unit?: string;
};

type SpoonacularRecipeInformation = {
  id: number;
  instructions?: string;
  analyzedInstructions?: SpoonacularAnalyzedInstruction[];
  servings?: number;
  readyInMinutes?: number;
  preparationMinutes?: number;
  nutrition?: {
    nutrients?: SpoonacularNutrient[];
  };
};

const SPOONACULAR_BASE_URL = 'https://api.spoonacular.com';

const parseSpoonacularError = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as { message?: string };

    if (typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message;
    }
  } catch {
    // Ignore parse failures and fall back to the generic message below.
  }

  return `Spoonacular request failed (${response.status}).`;
};

const decodeHtmlEntities = (value: string): string => {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
};

const cleanInstructionText = (value: string): string => {
  return decodeHtmlEntities(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const capitalizeSentence = (value: string): string => {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
};

const getLetterStats = (value: string): { total: number; nonLatin: number } => {
  const letters = Array.from(value).filter((character) => /\p{L}/u.test(character));

  if (letters.length === 0) {
    return { total: 0, nonLatin: 0 };
  }

  return {
    total: letters.length,
    nonLatin: letters.filter((character) => !/\p{Script=Latin}/u.test(character)).length,
  };
};

const normalizeInstructionStep = (value: string): string | null => {
  const cleanedValue = cleanInstructionText(value)
    .replace(/^\s*(step\s*)?\d+[\).:\-]?\s*/i, '')
    .replace(/^[•\-–]+\s*/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!cleanedValue || /https?:\/\//i.test(cleanedValue)) {
    return null;
  }

  const words = cleanedValue.split(/\s+/).filter(Boolean);
  const { total, nonLatin } = getLetterStats(cleanedValue);
  const nonLatinRatio = total === 0 ? 1 : nonLatin / total;

  if (words.length < 3 || total < 10 || nonLatinRatio > 0.2) {
    return null;
  }

  return capitalizeSentence(cleanedValue.replace(/\s+([,.;!?])/g, '$1'));
};

const dedupeInstructionSteps = (steps: string[]): string[] => {
  const seen = new Set<string>();

  return steps.filter((step) => {
    const normalizedStep = step.toLowerCase();

    if (seen.has(normalizedStep)) {
      return false;
    }

    seen.add(normalizedStep);
    return true;
  });
};

const formatNutrient = (
  amount: number | undefined,
  unit: string | undefined,
  { roundToWhole = false }: { roundToWhole?: boolean } = {},
): string | undefined => {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return undefined;
  }

  const normalizedUnit = unit?.trim() || '';
  const value = roundToWhole
    ? String(Math.round(amount))
    : Number.isInteger(amount)
      ? String(amount)
      : amount.toFixed(1).replace(/\.0$/, '');

  return normalizedUnit ? `${value}${normalizedUnit}` : value;
};

const getNutritionSummary = (
  nutrients: SpoonacularNutrient[] | undefined,
): RecipeNutritionSummary | undefined => {
  if (!Array.isArray(nutrients) || nutrients.length === 0) {
    return undefined;
  }

  const getNutrient = (names: string[]): SpoonacularNutrient | undefined => {
    return nutrients.find((nutrient) => {
      const nutrientName = nutrient.name?.trim().toLowerCase();

      if (!nutrientName) {
        return false;
      }

      return names.includes(nutrientName);
    });
  };

  const calories = getNutrient(['calories']);
  const protein = getNutrient(['protein']);
  const carbs = getNutrient(['carbohydrates', 'carbs']);
  const fat = getNutrient(['fat']);

  const summary: RecipeNutritionSummary = {
    calories: formatNutrient(calories?.amount, calories?.unit ?? 'kcal', {
      roundToWhole: true,
    }),
    protein: formatNutrient(protein?.amount, protein?.unit),
    carbs: formatNutrient(carbs?.amount, carbs?.unit),
    fat: formatNutrient(fat?.amount, fat?.unit),
  };

  return Object.values(summary).some(Boolean) ? summary : undefined;
};

const getInstructionSteps = (
  details: SpoonacularRecipeInformation | undefined,
): string[] => {
  const analyzedSteps = details?.analyzedInstructions
    ?.flatMap((instruction) => instruction.steps ?? [])
    .map((step) => normalizeInstructionStep(step.step ?? ''))
    .filter((step): step is string => Boolean(step));

  if (analyzedSteps && analyzedSteps.length > 0) {
    return dedupeInstructionSteps(analyzedSteps).slice(0, 5);
  }

  const fallbackInstructions = cleanInstructionText(details?.instructions ?? '');

  if (!fallbackInstructions) {
    return [];
  }

  return fallbackInstructions
    .split(/(?<=[.!?])\s+/)
    .map((step) => normalizeInstructionStep(step))
    .filter((step): step is string => Boolean(step))
    .slice(0, 4);
};

const toRecipeIngredient = (ingredient: SpoonacularIngredient) => ({
  id: ingredient.id,
  name: ingredient.name,
  original: ingredient.original,
});

const buildRecipeSuggestion = (
  recipe: SpoonacularRecipeSearchResult,
  details?: SpoonacularRecipeInformation,
): RecipeSuggestion => {
  const instructions = getInstructionSteps(details);

  return {
    id: String(recipe.id),
    title: recipe.title,
    image: recipe.image,
    matchedIngredients: (recipe.usedIngredients ?? []).map(toRecipeIngredient),
    missingIngredients: (recipe.missedIngredients ?? []).map(toRecipeIngredient),
    unusedIngredients: (recipe.unusedIngredients ?? []).map(toRecipeIngredient),
    likes: recipe.likes,
    instructions: instructions.length > 0 ? instructions : undefined,
    servings: typeof details?.servings === 'number' ? details.servings : undefined,
    readyInMinutes:
      typeof details?.readyInMinutes === 'number' ? details.readyInMinutes : undefined,
    preparationMinutes:
      typeof details?.preparationMinutes === 'number'
        ? details.preparationMinutes
        : undefined,
    nutrition: getNutritionSummary(details?.nutrition?.nutrients),
  };
};

const fetchRecipeInformation = async (
  apiKey: string,
  recipeId: number,
): Promise<SpoonacularRecipeInformation | undefined> => {
  const searchParams = new URLSearchParams({
    apiKey,
    includeNutrition: 'true',
  });

  const response = await fetch(
    `${SPOONACULAR_BASE_URL}/recipes/${recipeId}/information?${searchParams.toString()}`,
  );

  if (!response.ok) {
    return undefined;
  }

  try {
    return (await response.json()) as SpoonacularRecipeInformation;
  } catch {
    return undefined;
  }
};

export const findRecipesByIngredients = async ({
  ingredients,
  number = 6,
  ranking = 2,
  ignorePantry = true,
}: RecipesFindRequest): Promise<RecipeSuggestion[]> => {
  const apiKey = getRequiredEnv('SPOONACULAR_API_KEY');
  const searchParams = new URLSearchParams({
    apiKey,
    ingredients: ingredients.join(','),
    number: String(number),
    ranking: String(ranking),
    ignorePantry: String(ignorePantry),
  });

  const response = await fetch(
    `${SPOONACULAR_BASE_URL}/recipes/findByIngredients?${searchParams.toString()}`,
  );

  if (!response.ok) {
    throw new ExternalServiceError(await parseSpoonacularError(response));
  }

  const payload = (await response.json()) as SpoonacularRecipeSearchResult[];

  if (!Array.isArray(payload) || payload.length === 0) {
    return [];
  }

  const detailResponses = await Promise.allSettled(
    payload.map(async (recipe) => {
      const details = await fetchRecipeInformation(apiKey, recipe.id);
      return [recipe.id, details] as const;
    }),
  );

  const detailsByRecipeId = new Map<number, SpoonacularRecipeInformation>();

  detailResponses.forEach((result) => {
    if (result.status !== 'fulfilled') {
      return;
    }

    const [recipeId, details] = result.value;

    if (details) {
      detailsByRecipeId.set(recipeId, details);
    }
  });

  return payload.map((recipe) => buildRecipeSuggestion(recipe, detailsByRecipeId.get(recipe.id)));
};
