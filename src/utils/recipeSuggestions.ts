import type { InventoryItem } from '../services/inventoryService';

import { getExpiryDetails } from './inventoryInsights';

export type RecipeMatch = {
  name: string;
  requiredIngredients: string[];
  matchedIngredients: string[];
  missingIngredients: string[];
  matchCount: number;
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

export const getRecipeSuggestions = (
  items: InventoryItem[],
  referenceDate: Date = new Date(),
): RecipeMatch[] => {
  const allInventoryNames = items.map((item) => item.name.toLowerCase());
  const priorityInventoryNames = items
    .filter((item) => {
      const expiryGroup = getExpiryDetails(item.expiryDate, referenceDate).group;
      return expiryGroup === 'expired' || expiryGroup === 'expiringSoon';
    })
    .map((item) => item.name.toLowerCase());

  if (priorityInventoryNames.length === 0) {
    return [];
  }

  return RECIPES.map((recipe) => {
    const matchedIngredients = collectMatchedIngredients(recipe.ingredients, allInventoryNames);
    const priorityMatchedIngredients = collectMatchedIngredients(recipe.ingredients, priorityInventoryNames);
    const missingIngredients = recipe.ingredients.filter(
      (ingredient) => !matchedIngredients.includes(ingredient),
    );

    return {
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
