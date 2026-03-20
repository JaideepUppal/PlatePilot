import type {
  RecipeIngredient,
  RecipeSuggestion,
  RecipesFindRequest,
  RecipesFindResponse,
} from '../../contracts/backend';

import { BackendServiceError, postBackend } from './client';

type FindRecipesByIngredientsOptions = {
  number?: number;
  ranking?: 1 | 2;
  ignorePantry?: boolean;
  signal?: AbortSignal;
};

const RECIPES_ENDPOINT = '/api/recipes/find';

const normalizeIngredient = (value: string): string => {
  return value.trim().toLowerCase();
};

const isRecipeIngredient = (value: RecipeIngredient): boolean => {
  return typeof value.name === 'string' && value.name.trim().length > 0;
};

const sanitizeRecipeSuggestion = (
  recipe: RecipeSuggestion,
): RecipeSuggestion | null => {
  if (typeof recipe.id !== 'string' || typeof recipe.title !== 'string') {
    return null;
  }

  return {
    id: recipe.id,
    title: recipe.title,
    image: typeof recipe.image === 'string' ? recipe.image : undefined,
    matchedIngredients: Array.isArray(recipe.matchedIngredients)
      ? recipe.matchedIngredients.filter(isRecipeIngredient)
      : [],
    missingIngredients: Array.isArray(recipe.missingIngredients)
      ? recipe.missingIngredients.filter(isRecipeIngredient)
      : [],
    unusedIngredients: Array.isArray(recipe.unusedIngredients)
      ? recipe.unusedIngredients.filter(isRecipeIngredient)
      : [],
    likes: typeof recipe.likes === 'number' ? recipe.likes : undefined,
  };
};

export const findRecipesByIngredients = async (
  ingredients: string[],
  {
    number = 6,
    ranking = 2,
    ignorePantry = true,
    signal,
  }: FindRecipesByIngredientsOptions = {},
): Promise<RecipeSuggestion[]> => {
  const uniqueIngredients = Array.from(
    new Set(
      ingredients
        .map(normalizeIngredient)
        .filter(Boolean),
    ),
  );

  if (uniqueIngredients.length === 0) {
    return [];
  }

  try {
    const payload = await postBackend<RecipesFindResponse, RecipesFindRequest>(
      RECIPES_ENDPOINT,
      {
        ingredients: uniqueIngredients,
        number,
        ranking,
        ignorePantry,
      },
      { signal },
    );

    return Array.isArray(payload.recipes)
      ? payload.recipes
          .map(sanitizeRecipeSuggestion)
          .filter((recipe): recipe is RecipeSuggestion => recipe !== null)
      : [];
  } catch (error) {
    if (
      error instanceof BackendServiceError &&
      (error.code === 'missing_config' || error.code === 'not_implemented')
    ) {
      throw new Error(
        'Recipe suggestions are waiting on the secure backend endpoint /api/recipes/find.',
      );
    }

    throw error;
  }
};
