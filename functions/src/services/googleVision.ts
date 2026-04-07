import { getRequiredEnv } from '../config/env';
import { ExternalServiceError } from '../utils/http';
import type { DetectedIngredient } from '../types/backend';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'; // free Groq vision model

type GroqMessage = {
  role: string;
  content: string | { type: string; text?: string; image_url?: { url: string } }[];
};

type GroqResponse = {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
  error?: { message?: string };
};

const normalizeIngredientName = (value: string): string => {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return '';

  const aliases: Record<string, string> = {
    apples: 'apple',
    bananas: 'banana',
    tomatoes: 'tomato',
    eggs: 'egg',
    carrots: 'carrot',
    onions: 'onion',
    potatoes: 'potato',
    lemons: 'lemon',
    oranges: 'orange',
    mushrooms: 'mushroom',
    peppers: 'pepper',
    grapes: 'grape',
  };
  if (normalized in aliases) return aliases[normalized];

  if (normalized.endsWith('ies') && normalized.length > 4) return `${normalized.slice(0, -3)}y`;
  if (normalized.endsWith('oes') && normalized.length > 4) return normalized.slice(0, -2);
  if (normalized.endsWith('s') && !normalized.endsWith('ss') && normalized.length > 3)
    return normalized.slice(0, -1);

  return normalized;
};

export const detectIngredients = async (
  imageBase64: string,
  maxResults = 20,
): Promise<DetectedIngredient[]> => {
  const apiKey = getRequiredEnv('GROQ_API_KEY');

  const prompt = `You are a kitchen assistant. Look at this image and list only the raw food ingredients or grocery items you can clearly see.

Rules:
- Return ONLY a JSON array of strings, nothing else
- Each string is a single ingredient name in lowercase (e.g. "tomato", "milk", "bread")
- Do not include prepared dishes, utensils, or non-food items
- Maximum ${maxResults} items
- If nothing food-related is visible, return []

Example output: ["tomato", "milk", "egg", "bread"]`;

  const messages: GroqMessage[] = [
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
        },
        {
          type: 'text',
          text: prompt,
        },
      ],
    },
  ];

  const response = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages,
      max_tokens: 300,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    let message = `Groq vision request failed (${response.status}).`;
    try {
      const err = (await response.json()) as GroqResponse;
      if (err.error?.message) message = err.error.message;
    } catch {
      /* ignore */
    }
    throw new ExternalServiceError(message);
  }

  const payload = (await response.json()) as GroqResponse;
  const content = payload.choices?.[0]?.message?.content?.trim() ?? '[]';

  let parsed: string[] = [];
  try {
    const cleaned = content.replace(/```json|```/g, '').trim();
    parsed = JSON.parse(cleaned) as string[];
    if (!Array.isArray(parsed)) parsed = [];
  } catch {
    parsed = [];
  }

  const seen = new Set<string>();
  return parsed
    .filter((item) => typeof item === 'string' && item.trim().length >= 2)
    .map((item) => {
      const ingredient = normalizeIngredientName(item.trim());
      return {
        ingredient,
        sourceLabel: item.trim(),
        confidence: 0.9, // Groq doesn't return confidence scores, default high
      };
    })
    .filter((item) => {
      if (!item.ingredient || seen.has(item.ingredient)) return false;
      seen.add(item.ingredient);
      return true;
    })
    .slice(0, maxResults);
};
