export type GooglePlacesPriceLevel =
  | 'PRICE_LEVEL_INEXPENSIVE'
  | 'PRICE_LEVEL_MODERATE'
  | 'PRICE_LEVEL_EXPENSIVE'
  | 'PRICE_LEVEL_VERY_EXPENSIVE';

export type DetectedIngredient = {
  ingredient: string;
  sourceLabel: string;
  confidence: number;
};

export type VisionDetectRequest = {
  imageBase64: string;
  maxResults?: number;
};

export type VisionDetectResponse = {
  ingredients: DetectedIngredient[];
};

export type RecipeIngredient = {
  id?: number | string;
  name: string;
  original?: string;
};

export type RecipeNutritionSummary = {
  calories?: string;
  protein?: string;
  carbs?: string;
  fat?: string;
};

export type RecipeSuggestion = {
  id: string;
  title: string;
  image?: string;
  matchedIngredients: RecipeIngredient[];
  missingIngredients: RecipeIngredient[];
  unusedIngredients?: RecipeIngredient[];
  likes?: number;
  instructions?: string[];
  servings?: number;
  readyInMinutes?: number;
  preparationMinutes?: number;
  nutrition?: RecipeNutritionSummary;
};

export type RecipesFindRequest = {
  ingredients: string[];
  number?: number;
  ranking?: 1 | 2;
  ignorePantry?: boolean;
};

export type RecipesFindResponse = {
  recipes: RecipeSuggestion[];
};

export type CookingIntent = {
  budget: 'low' | 'medium' | 'high' | 'any';
  spiceLevel: 'mild' | 'medium' | 'spicy' | 'any';
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'any';
  cuisine: string | null;
  constraints: string[];
};

export type AiRecipeContext = {
  id: string;
  title: string;
  matchedIngredients: string[];
  missingIngredients: string[];
  instructions?: string[];
  servings?: number;
  readyInMinutes?: number;
  nutrition?: RecipeNutritionSummary;
};

export type PlatePilotRecipeInsight = {
  recipeId: string;
  summary: string;
  whatToCookFirst?: string | null;
  substitutionTip?: string | null;
  cookingTip?: string | null;
};

export type PlatePilotAssistantResult = {
  message: string;
  intent: CookingIntent;
  title?: string | null;
  whyItMatches?: string | null;
  ingredientsUsed?: string[];
  missingIngredients?: string[];
  shortInstructions?: string[];
  substitutionTip?: string | null;
  refusal?: boolean;
  recipeInsights?: PlatePilotRecipeInsight[];
};

export type AiAskRequest = {
  query: string;
  inventoryNames: string[];
  recipes?: AiRecipeContext[];
};

export type AiAskResponse = {
  result: PlatePilotAssistantResult;
};

export type NearbyRestaurant = {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  priceLevel: GooglePlacesPriceLevel | null;
  distanceMeters: number;
  latitude: number;
  longitude: number;
  primaryType?: string;
  openingHours?: string | null;
  website?: string | null;
  phone?: string | null;
};

export type PlacesSearchRequest = {
  latitude: number;
  longitude: number;
  placeTypes: string[];
  maxResults?: number;
  radiusMeters?: number;
  allowedPriceLevels?: GooglePlacesPriceLevel[];
};

export type PlacesSearchResponse = {
  restaurants: NearbyRestaurant[];
};
