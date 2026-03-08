import type { InventoryItem } from '../services/inventoryService';

import { getExpiryDetails } from './inventoryInsights';

export type RecipeSuggestion = {
  name: string;
  ingredients: string[];
};

const RECIPES: RecipeSuggestion[] = [
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

export const getRecipeSuggestions = (
  items: InventoryItem[],
  referenceDate: Date = new Date(),
): RecipeSuggestion[] => {
  const priorityIngredients = items
    .filter((item) => {
      const expiryGroup = getExpiryDetails(item.expiryDate, referenceDate).group;
      return expiryGroup === 'expired' || expiryGroup === 'expiringSoon';
    })
    .map((item) => item.name.toLowerCase());

  if (priorityIngredients.length === 0) {
    return [];
  }

  return RECIPES.map((recipe) => {
    const matchedIngredientCount = recipe.ingredients.filter((ingredient) =>
      priorityIngredients.some((inventoryName) => matchesIngredient(inventoryName, ingredient)),
    ).length;

    return {
      recipe,
      matchedIngredientCount,
    };
  })
    .filter(({ matchedIngredientCount }) => matchedIngredientCount > 0)
    .sort((left, right) => {
      if (right.matchedIngredientCount !== left.matchedIngredientCount) {
        return right.matchedIngredientCount - left.matchedIngredientCount;
      }

      return left.recipe.name.localeCompare(right.recipe.name);
    })
    .slice(0, 3)
    .map(({ recipe }) => recipe);
};
