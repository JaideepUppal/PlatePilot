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

const TITLE_MODIFIER_TOKENS = new Set([
  'a',
  'an',
  'best',
  'classic',
  'easy',
  'homemade',
  'quick',
  'simple',
  'the',
  'traditional',
]);

const normalizeName = (value: string): string => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, ' ');
};

const normalizeRecipeTitle = (value: string): string => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const hasNonEmptyText = (value: string | null | undefined): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

const hasValidInstructions = (recipe: Pick<RecipeMatch, 'instructions'>): boolean => {
  return recipe.instructions?.some((instruction) => hasNonEmptyText(instruction)) ?? false;
};

const hasRecipeImage = (recipe: Pick<RecipeMatch, 'imageUrl'>): boolean => {
  return hasNonEmptyText(recipe.imageUrl);
};

const countNutritionFields = (nutrition?: RecipeNutritionSummary): number => {
  if (!nutrition) {
    return 0;
  }

  return [nutrition.calories, nutrition.protein, nutrition.carbs, nutrition.fat].filter(
    hasNonEmptyText,
  ).length;
};

const countInsightFields = (recipe: Pick<RecipeMatch, 'platePilotInsight'>): number => {
  if (!recipe.platePilotInsight) {
    return 0;
  }

  return [
    recipe.platePilotInsight.summary,
    recipe.platePilotInsight.whatToCookFirst,
    recipe.platePilotInsight.substitutionTip,
    recipe.platePilotInsight.cookingTip,
  ].filter(hasNonEmptyText).length;
};

const getRecipeTitleTokens = (value: string): string[] => {
  return normalizeRecipeTitle(value).split(' ').filter(Boolean);
};

const getMeaningfulRecipeTitleTokens = (value: string): string[] => {
  const tokens = getRecipeTitleTokens(value);
  const meaningfulTokens = tokens.filter((token) => !TITLE_MODIFIER_TOKENS.has(token));

  return meaningfulTokens.length > 0 ? meaningfulTokens : tokens;
};

const getEditDistance = (left: string, right: string): number => {
  if (left === right) {
    return 0;
  }

  if (left.length === 0) {
    return right.length;
  }

  if (right.length === 0) {
    return left.length;
  }

  const distances = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let previousDiagonal = distances[0];
    distances[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const currentValue = distances[rightIndex];

      if (left[leftIndex - 1] === right[rightIndex - 1]) {
        distances[rightIndex] = previousDiagonal;
      } else {
        distances[rightIndex] = Math.min(
          distances[rightIndex] + 1,
          distances[rightIndex - 1] + 1,
          previousDiagonal + 1,
        );
      }

      previousDiagonal = currentValue;
    }
  }

  return distances[right.length];
};

const areRecipeTitlesEquivalent = (leftTitle: string, rightTitle: string): boolean => {
  const normalizedLeft = normalizeRecipeTitle(leftTitle);
  const normalizedRight = normalizeRecipeTitle(rightTitle);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  if (normalizedLeft === normalizedRight) {
    return true;
  }

  const meaningfulLeft = getMeaningfulRecipeTitleTokens(leftTitle);
  const meaningfulRight = getMeaningfulRecipeTitleTokens(rightTitle);

  if (meaningfulLeft.join(' ') === meaningfulRight.join(' ')) {
    return true;
  }

  if (meaningfulLeft.length !== meaningfulRight.length || meaningfulLeft.length < 2) {
    return false;
  }

  let fuzzyMismatchCount = 0;
  let exactMatchCount = 0;

  for (let index = 0; index < meaningfulLeft.length; index += 1) {
    const leftToken = meaningfulLeft[index];
    const rightToken = meaningfulRight[index];

    if (leftToken === rightToken) {
      exactMatchCount += 1;
      continue;
    }

    const longestTokenLength = Math.max(leftToken.length, rightToken.length);
    const editDistance = getEditDistance(leftToken, rightToken);

    if (longestTokenLength < 5 || editDistance > 1) {
      return false;
    }

    fuzzyMismatchCount += 1;

    if (fuzzyMismatchCount > 1) {
      return false;
    }
  }

  return exactMatchCount >= meaningfulLeft.length - 1 && fuzzyMismatchCount > 0;
};

const getRecipeRichnessScore = (recipe: RecipeMatch): number => {
  const instructionCount = recipe.instructions?.filter(hasNonEmptyText).length ?? 0;
  const timingCount = [recipe.servings, recipe.readyInMinutes, recipe.preparationMinutes].filter(
    (value): value is number => typeof value === 'number',
  ).length;
  const ingredientCount = uniqueNormalizedValues([
    ...recipe.requiredIngredients,
    ...recipe.matchedIngredients,
    ...recipe.missingIngredients,
  ]).length;

  return (
    instructionCount * 3 +
    countNutritionFields(recipe.nutrition) * 2 +
    timingCount * 2 +
    ingredientCount +
    countInsightFields(recipe) * 2
  );
};

const compareRecipeDisplayOrder = (left: RecipeMatch, right: RecipeMatch): number => {
  if (right.matchCount !== left.matchCount) {
    return right.matchCount - left.matchCount;
  }

  if (left.missingIngredients.length !== right.missingIngredients.length) {
    return left.missingIngredients.length - right.missingIngredients.length;
  }

  const rightHasInstructions = hasValidInstructions(right) ? 1 : 0;
  const leftHasInstructions = hasValidInstructions(left) ? 1 : 0;

  if (rightHasInstructions !== leftHasInstructions) {
    return rightHasInstructions - leftHasInstructions;
  }

  const rightHasImage = hasRecipeImage(right) ? 1 : 0;
  const leftHasImage = hasRecipeImage(left) ? 1 : 0;

  if (rightHasImage !== leftHasImage) {
    return rightHasImage - leftHasImage;
  }

  const richnessDifference = getRecipeRichnessScore(right) - getRecipeRichnessScore(left);

  if (richnessDifference !== 0) {
    return richnessDifference;
  }

  return left.name.localeCompare(right.name);
};

const compareRecipeQuality = (left: RecipeMatch, right: RecipeMatch): number => {
  const rightHasInstructions = hasValidInstructions(right) ? 1 : 0;
  const leftHasInstructions = hasValidInstructions(left) ? 1 : 0;

  if (rightHasInstructions !== leftHasInstructions) {
    return rightHasInstructions - leftHasInstructions;
  }

  const rightHasImage = hasRecipeImage(right) ? 1 : 0;
  const leftHasImage = hasRecipeImage(left) ? 1 : 0;

  if (rightHasImage !== leftHasImage) {
    return rightHasImage - leftHasImage;
  }

  const richnessDifference = getRecipeRichnessScore(right) - getRecipeRichnessScore(left);

  if (richnessDifference !== 0) {
    return richnessDifference;
  }

  return compareRecipeDisplayOrder(left, right);
};

const dedupeRecipeMatches = (recipes: RecipeMatch[]): RecipeMatch[] => {
  const dedupedRecipes: RecipeMatch[] = [];

  recipes.forEach((recipe) => {
    const comparableTitle = recipe.name || recipe.id;
    const duplicateIndex = dedupedRecipes.findIndex((existingRecipe) =>
      areRecipeTitlesEquivalent(existingRecipe.name || existingRecipe.id, comparableTitle),
    );

    if (duplicateIndex === -1) {
      dedupedRecipes.push(recipe);
      return;
    }

    if (compareRecipeQuality(recipe, dedupedRecipes[duplicateIndex]) < 0) {
      dedupedRecipes[duplicateIndex] = recipe;
    }
  });

  return dedupedRecipes;
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
  return Array.from(new Set(values.map((value) => normalizeName(value)).filter(Boolean)));
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

export const mapRecipeSuggestionsToMatches = (recipes: RecipeSuggestion[]): RecipeMatch[] => {
  return dedupeRecipeMatches(
    recipes.map((recipe) => {
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
    }),
  ).sort(compareRecipeDisplayOrder);
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

  return dedupeRecipeMatches(
    RECIPES.map((recipe) => {
      const matchedIngredients = collectMatchedIngredients(recipe.ingredients, allInventoryNames);
      const priorityMatchedIngredients = collectMatchedIngredients(
        recipe.ingredients,
        priorityInventoryNames,
      );
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
      .map(({ priorityMatchCount: _priorityMatchCount, ...recipeMatch }) => recipeMatch),
  )
    .sort(compareRecipeDisplayOrder)
    .slice(0, 3);
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

  return dedupeRecipeMatches(
    recipes.map((recipe) => ({
      ...recipe,
      platePilotInsight: insightsByRecipeId.get(recipe.id),
    })),
  ).sort(compareRecipeDisplayOrder);
};
