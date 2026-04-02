import { getOptionalEnv, getRequiredEnv } from '../config/env';
import { ExternalServiceError } from '../utils/http';
import type {
  AiAskRequest,
  CookingIntent,
  PlatePilotAssistantResult,
  PlatePilotRecipeInsight,
} from '../types/backend';

type GroqChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type GroqChatResponse = {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
};

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const DEFAULT_GROQ_MODEL = 'llama-3.1-8b-instant';

const DEFAULT_INTENT: CookingIntent = {
  budget: 'any',
  spiceLevel: 'any',
  mealType: 'any',
  cuisine: null,
  constraints: [],
};

const extractJsonBlock = <T>(value: string): T | null => {
  const startIndex = value.indexOf('{');
  const endIndex = value.lastIndexOf('}');

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return null;
  }

  try {
    return JSON.parse(value.slice(startIndex, endIndex + 1)) as T;
  } catch {
    return null;
  }
};

const normalizeIntent = (intent: CookingIntent | undefined): CookingIntent => {
  return {
    budget:
      intent?.budget === 'low' ||
      intent?.budget === 'medium' ||
      intent?.budget === 'high' ||
      intent?.budget === 'any'
        ? intent.budget
        : DEFAULT_INTENT.budget,
    spiceLevel:
      intent?.spiceLevel === 'mild' ||
      intent?.spiceLevel === 'medium' ||
      intent?.spiceLevel === 'spicy' ||
      intent?.spiceLevel === 'any'
        ? intent.spiceLevel
        : DEFAULT_INTENT.spiceLevel,
    mealType:
      intent?.mealType === 'breakfast' ||
      intent?.mealType === 'lunch' ||
      intent?.mealType === 'dinner' ||
      intent?.mealType === 'snack' ||
      intent?.mealType === 'any'
        ? intent.mealType
        : DEFAULT_INTENT.mealType,
    cuisine: typeof intent?.cuisine === 'string' ? intent.cuisine : null,
    constraints: Array.isArray(intent?.constraints)
      ? intent.constraints.filter(
          (item): item is string => typeof item === 'string' && item.trim().length > 0,
        )
      : [],
  };
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
    .filter((item): item is PlatePilotRecipeInsight => item !== null)
    .slice(0, 6);
};

const parseGroqError = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as {
      error?: {
        message?: string;
      };
    };

    if (typeof payload.error?.message === 'string' && payload.error.message.trim()) {
      return payload.error.message;
    }
  } catch {
    // Ignore parse failures and fall back to the generic message below.
  }

  return `Groq request failed (${response.status}).`;
};

const createGroqCompletion = async (
  messages: GroqChatMessage[],
): Promise<string> => {
  const apiKey = getRequiredEnv('GROQ_API_KEY');
  const model = getOptionalEnv('GROQ_MODEL') ?? DEFAULT_GROQ_MODEL;

  const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 700,
      messages,
    }),
  });

  if (!response.ok) {
    throw new ExternalServiceError(await parseGroqError(response));
  }

  const payload = (await response.json()) as GroqChatResponse;
  const content = payload.choices?.[0]?.message?.content;

  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new ExternalServiceError('Groq returned an empty response.');
  }

  return content;
};

const buildRecipeContext = (recipes: AiAskRequest['recipes']): string => {
  if (!Array.isArray(recipes) || recipes.length === 0) {
    return 'none';
  }

  return JSON.stringify(
    recipes.slice(0, 4).map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      matchedIngredients: recipe.matchedIngredients.slice(0, 8),
      missingIngredients: recipe.missingIngredients.slice(0, 8),
      instructions: recipe.instructions?.slice(0, 3) ?? [],
      servings: recipe.servings ?? null,
      readyInMinutes: recipe.readyInMinutes ?? null,
      nutrition: recipe.nutrition ?? null,
    })),
    null,
    2,
  );
};

const buildSystemPrompt = (): string => {
  return [
    'You are PlatePilot, a concise cooking-only assistant.',
    'You may only help with recipes, cooking, substitutions, pantry usage, meal ideas, ingredient prioritization, and nutrition.',
    'If the user asks about any unrelated topic, respond warmly and briefly: say PlatePilot focuses on cooking, recipes, substitutions, pantry planning, and nutrition, then suggest one relevant cooking question they could ask instead.',
    'Return valid JSON only with this exact shape:',
    '{"message": string, "title": string|null, "whyItMatches": string|null, "ingredientsUsed": string[], "missingIngredients": string[], "shortInstructions": string[], "substitutionTip": string|null, "refusal": boolean, "recipeInsights": [{"recipeId": string, "summary": string, "whatToCookFirst": string|null, "substitutionTip": string|null, "cookingTip": string|null}], "intent": {"budget": "low|medium|high|any", "spiceLevel": "mild|medium|spicy|any", "mealType": "breakfast|lunch|dinner|snack|any", "cuisine": string|null, "constraints": string[]}}',
    'Rules:',
    '- Keep the main message under 2 sentences.',
    '- Keep shortInstructions to at most 4 brief steps.',
    '- Use only the pantry and recipe context provided.',
    '- If recipe context is provided, Spoonacular is the source of truth for recipe facts. Use recipeInsights only to explain why a recipe fits, what to cook first, an easy substitution, or a practical cooking tip.',
    '- Keep each recipe insight premium and compact: summary under 20 words, and each optional field to one short sentence.',
    '- Do not duplicate full recipe instructions, nutrition, or ingredient lists inside recipeInsights.',
    '- If the request is a refusal, set refusal to true, keep recipeInsights empty, keep arrays empty unless pantry items directly support the refusal, and use the default "any" intent.',
    '- If no recipe context is provided, use title, whyItMatches, ingredientsUsed, missingIngredients, shortInstructions, and substitutionTip when they are helpful.',
  ].join('\n');
};

const sanitizeAssistantResult = (
  value: PlatePilotAssistantResult | null,
): PlatePilotAssistantResult | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const message = trimAndLimitString(value.message, 240);

  if (!message) {
    return null;
  }

  return {
    message,
    intent: normalizeIntent(value.intent),
    title: trimAndLimitString(value.title, 70),
    whyItMatches: trimAndLimitString(value.whyItMatches, 180),
    ingredientsUsed: sanitizeStringArray(value.ingredientsUsed),
    missingIngredients: sanitizeStringArray(value.missingIngredients),
    shortInstructions: sanitizeStringArray(value.shortInstructions, 4),
    substitutionTip: trimAndLimitString(value.substitutionTip, 140),
    refusal: value.refusal === true,
    recipeInsights: sanitizeRecipeInsights(value.recipeInsights),
  };
};

export const askPlatePilotAssistant = async ({
  query,
  inventoryNames,
  recipes,
}: AiAskRequest): Promise<PlatePilotAssistantResult> => {
  const content = await createGroqCompletion([
    {
      role: 'system',
      content: buildSystemPrompt(),
    },
    {
      role: 'user',
      content: [
        `User request: ${query}`,
        `Pantry: ${inventoryNames.join(', ') || 'none'}`,
        `Recipe context: ${buildRecipeContext(recipes)}`,
      ].join('\n'),
    },
  ]);

  const parsed = extractJsonBlock<PlatePilotAssistantResult>(content);
  const sanitized = sanitizeAssistantResult(parsed);

  if (!sanitized) {
    throw new ExternalServiceError('Groq returned an invalid assistant payload.');
  }

  return sanitized;
};
