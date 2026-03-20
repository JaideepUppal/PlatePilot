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

export type RecipeSuggestion = {
  id: string;
  title: string;
  image?: string;
  matchedIngredients: RecipeIngredient[];
  missingIngredients: RecipeIngredient[];
  unusedIngredients?: RecipeIngredient[];
  likes?: number;
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

export type PlatePilotAssistantResult = {
  message: string;
  intent: CookingIntent;
};

export type AiAskRequest = {
  query: string;
  inventoryNames: string[];
};

export type AiAskResponse = {
  result: PlatePilotAssistantResult;
};

export type RestaurantVibeResult = {
  summary: string;
  placeTypes: string[];
  allowedPriceLevels: GooglePlacesPriceLevel[];
  keywords: string[];
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
