import type { InventoryItem } from '../services/inventoryService';
import type {
  AiRecipeContext,
  PlatePilotRecipeInsight,
  RecipeNutritionSummary,
  RecipeSuggestion,
} from '../contracts/backend';

import { getExpiryDetails } from './inventoryInsights';

export type RecipeMatch = {
  id: string;
  name: string;
  imageUrl?: string;
  requiredIngredients: string[];
  matchedIngredients: string[];
  missingIngredients: string[];
  matchCount: number;
  instructions?: string[];
  servings?: number;
  readyInMinutes?: number;
  preparationMinutes?: number;
  nutrition?: RecipeNutritionSummary;
  platePilotInsight?: PlatePilotRecipeInsight;
};

type RecipeDefinition = {
  name: string;
  ingredients: string[];
};

const RECIPES: RecipeDefinition[] = [
  { name: 'Omelette', ingredients: ['egg', 'milk'] },
  { name: 'Fried Rice', ingredients: ['rice', 'egg'] },
  { name: 'Chicken Soup', ingredients: ['chicken'] },
  { name: 'Pancakes', ingredients: ['milk', 'egg'] },
  { name: 'Grilled Chicken', ingredients: ['chicken'] },
];

const normalizeName = (value: string): string => {
  return value.toLowerCase().trim().replace(/[^a-z0-9\s]/g, ' ');
};

const matchesIngredient = (inventoryName: string, ingredient: string): boolean => {
  const normalizedInventoryName = normalizeName(inventoryName);
  const normalizedIngredient = normalizeName(ingredient);

  return (
    normalizedInventoryName.includes(normalizedIngredient) ||
    normalizedIngredient.includes(normalizedInventoryName)
  );
};

const collectMatchedIngredients = (
  requiredIngredients: string[],
  inventoryNames: string[],
): string[] => {
  return requiredIngredients.filter((ingredient) =>
    inventoryNames.some((inventoryName) => matchesIngredient(inventoryName, ingredient)),
  );
};

const uniqueNormalizedValues = (values: string[]): string[] => {
  return Array.from(
    new Set(
      values
        .map((value) => normalizeName(value))
        .filter(Boolean),
    ),
  );
};

export const getRecipeSearchIngredients = (
  items: InventoryItem[],
  referenceDate: Date = new Date(),
): string[] => {
  const allInventoryNames = uniqueNormalizedValues(items.map((item) => item.name));
  const priorityInventoryNames = uniqueNormalizedValues(
    items
      .filter((item) => {
        const expiryGroup = getExpiryDetails(item.expiryDate, referenceDate).group;
        return expiryGroup === 'expired' || expiryGroup === 'expiringSoon';
      })
      .map((item) => item.name),
  );

  return Array.from(new Set([...priorityInventoryNames, ...allInventoryNames])).slice(0, 12);
};

export const mapRecipeSuggestionsToMatches = (
  recipes: RecipeSuggestion[],
): RecipeMatch[] => {
  return recipes
    .map((recipe) => {
      const matchedIngredients = uniqueNormalizedValues(
        recipe.matchedIngredients.map((ingredient) => ingredient.name),
      );
      const missingIngredients = uniqueNormalizedValues(
        recipe.missingIngredients.map((ingredient) => ingredient.name),
      );
      const requiredIngredients = uniqueNormalizedValues([
        ...matchedIngredients,
        ...missingIngredients,
      ]);

      return {
        id: String(recipe.id),
        name: recipe.title,
        imageUrl: recipe.image,
        requiredIngredients,
        matchedIngredients,
        missingIngredients,
        matchCount: matchedIngredients.length,
        instructions: recipe.instructions?.filter(Boolean),
        servings: recipe.servings,
        readyInMinutes: recipe.readyInMinutes,
        preparationMinutes: recipe.preparationMinutes,
        nutrition: recipe.nutrition,
      };
    })
    .sort((left, right) => {
      if (right.matchCount !== left.matchCount) {
        return right.matchCount - left.matchCount;
      }

      if (left.missingIngredients.length !== right.missingIngredients.length) {
        return left.missingIngredients.length - right.missingIngredients.length;
      }

      const rightHasInstructions = (right.instructions?.length ?? 0) > 0 ? 1 : 0;
      const leftHasInstructions = (left.instructions?.length ?? 0) > 0 ? 1 : 0;

      if (rightHasInstructions !== leftHasInstructions) {
        return rightHasInstructions - leftHasInstructions;
      }

      return left.name.localeCompare(right.name);
    });
};

export const getFallbackRecipeSuggestions = (
  items: InventoryItem[],
  referenceDate: Date = new Date(),
): RecipeMatch[] => {
  const allInventoryNames = uniqueNormalizedValues(items.map((item) => item.name));
  const priorityInventoryNames = items
    .filter((item) => {
      const expiryGroup = getExpiryDetails(item.expiryDate, referenceDate).group;
      return expiryGroup === 'expired' || expiryGroup === 'expiringSoon';
    })
    .map((item) => normalizeName(item.name));

  if (allInventoryNames.length === 0) {
    return [];
  }

  return RECIPES.map((recipe) => {
    const matchedIngredients = collectMatchedIngredients(recipe.ingredients, allInventoryNames);
    const priorityMatchedIngredients = collectMatchedIngredients(recipe.ingredients, priorityInventoryNames);
    const missingIngredients = recipe.ingredients.filter(
      (ingredient) => !matchedIngredients.includes(ingredient),
    );

    return {
      id: normalizeName(recipe.name),
      name: recipe.name,
      requiredIngredients: recipe.ingredients,
      matchedIngredients,
      missingIngredients,
      matchCount: matchedIngredients.length,
      priorityMatchCount: priorityMatchedIngredients.length,
    };
  })
    .filter(({ priorityMatchCount }) => priorityMatchCount > 0)
    .sort((left, right) => {
      if (right.matchCount !== left.matchCount) {
        return right.matchCount - left.matchCount;
      }

      if (left.missingIngredients.length !== right.missingIngredients.length) {
        return left.missingIngredients.length - right.missingIngredients.length;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, 3)
    .map(({ priorityMatchCount: _priorityMatchCount, ...recipeMatch }) => recipeMatch);
};

export const toAiRecipeContext = (recipes: RecipeMatch[]): AiRecipeContext[] => {
  return recipes.map((recipe) => ({
    id: recipe.id,
    title: recipe.name,
    matchedIngredients: recipe.matchedIngredients,
    missingIngredients: recipe.missingIngredients,
    instructions: recipe.instructions,
    servings: recipe.servings,
    readyInMinutes: recipe.readyInMinutes,
    nutrition: recipe.nutrition,
  }));
};

export const mergeRecipeInsights = (
  recipes: RecipeMatch[],
  insights: PlatePilotRecipeInsight[],
): RecipeMatch[] => {
  if (insights.length === 0) {
    return recipes;
  }

  const insightsByRecipeId = new Map(
    insights.map((insight) => [insight.recipeId, insight] as const),
  );

  return recipes.map((recipe) => ({
    ...recipe,
    platePilotInsight: insightsByRecipeId.get(recipe.id),
  }));
};
