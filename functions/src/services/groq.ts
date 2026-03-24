import { getOptionalEnv, getRequiredEnv } from '../config/env';
import { ExternalServiceError } from '../utils/http';
import type {
  AiAskRequest,
  CookingIntent,
  PlatePilotAssistantResult,
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
      temperature: 0.2,
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

export const askPlatePilotAssistant = async ({
  query,
  inventoryNames,
}: AiAskRequest): Promise<PlatePilotAssistantResult> => {
  const content = await createGroqCompletion([
    {
      role: 'system',
      content:
        'You are PlatePilot, a concise food planning assistant. Return valid JSON only with shape {"message": string, "intent": {"budget": "low|medium|high|any", "spiceLevel": "mild|medium|spicy|any", "mealType": "breakfast|lunch|dinner|snack|any", "cuisine": string|null, "constraints": string[]}}. Keep the message under 3 sentences, practical, and grounded in the provided pantry context.',
    },
    {
      role: 'user',
      content: `User request: ${query}\nPantry: ${inventoryNames.join(', ') || 'none'}`,
    },
  ]);

  const parsed = extractJsonBlock<PlatePilotAssistantResult>(content);

  if (!parsed?.message) {
    throw new ExternalServiceError('Groq returned an invalid assistant payload.');
  }

  return {
    message: parsed.message.trim(),
    intent: normalizeIntent(parsed.intent),
  };
};
