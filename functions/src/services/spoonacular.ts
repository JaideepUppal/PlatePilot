import { getRequiredEnv } from '../config/env';
import { ExternalServiceError } from '../utils/http';
import type {
  RecipeSuggestion,
  RecipesFindRequest,
} from '../types/backend';

type SpoonacularIngredient = {
  id: number;
  name: string;
  original?: string;
};

type SpoonacularRecipe = {
  id: number;
  title: string;
  image?: string;
  usedIngredients?: SpoonacularIngredient[];
  missedIngredients?: SpoonacularIngredient[];
  unusedIngredients?: SpoonacularIngredient[];
  likes?: number;
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

  const payload = (await response.json()) as SpoonacularRecipe[];

  return Array.isArray(payload)
    ? payload.map((recipe) => ({
        id: String(recipe.id),
        title: recipe.title,
        image: recipe.image,
        matchedIngredients: (recipe.usedIngredients ?? []).map((ingredient) => ({
          id: ingredient.id,
          name: ingredient.name,
          original: ingredient.original,
        })),
        missingIngredients: (recipe.missedIngredients ?? []).map((ingredient) => ({
          id: ingredient.id,
          name: ingredient.name,
          original: ingredient.original,
        })),
        unusedIngredients: (recipe.unusedIngredients ?? []).map((ingredient) => ({
          id: ingredient.id,
          name: ingredient.name,
          original: ingredient.original,
        })),
        likes: recipe.likes,
      }))
    : [];
};
