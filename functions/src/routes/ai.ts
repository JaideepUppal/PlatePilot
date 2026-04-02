import { Router } from 'express';

import { requireAuth } from '../middleware/auth';
import { askPlatePilotAssistant } from '../services/groq';
import type {
  AiAskRequest,
  AiAskResponse,
  AiRecipeContext,
} from '../types/backend';
import { asyncHandler } from '../utils/http';
import {
  ValidationError,
  expectOptionalNumber,
  expectRecord,
  expectString,
  expectStringArray,
} from '../utils/validation';

export const aiRouter = Router();

const parseOptionalStringArray = (
  value: unknown,
  fieldName: string,
  { maxItems, maxItemLength }: { maxItems: number; maxItemLength: number },
): string[] => {
  if (typeof value === 'undefined') {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array of strings.`);
  }

  if (value.length > maxItems) {
    throw new ValidationError(`${fieldName} must include at most ${maxItems} values.`);
  }

  return Array.from(
    new Set(
      value
        .map((item) => expectString(item, fieldName, { maxLength: maxItemLength }))
        .filter(Boolean),
    ),
  );
};

const parseRecipeContext = (value: unknown): AiRecipeContext[] | undefined => {
  if (typeof value === 'undefined') {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new ValidationError('recipes must be an array.');
  }

  return value.slice(0, 4).map((recipe, index) => {
    const record = expectRecord(recipe, `recipes[${index}]`);
    const nutritionRecord =
      typeof record.nutrition === 'undefined'
        ? undefined
        : expectRecord(record.nutrition, `recipes[${index}].nutrition`);

    return {
      id: expectString(record.id, `recipes[${index}].id`, {
        maxLength: 80,
      }),
      title: expectString(record.title, `recipes[${index}].title`, {
        maxLength: 160,
      }),
      matchedIngredients: parseOptionalStringArray(
        record.matchedIngredients,
        `recipes[${index}].matchedIngredients`,
        {
          maxItems: 20,
          maxItemLength: 80,
        },
      ),
      missingIngredients: parseOptionalStringArray(
        record.missingIngredients,
        `recipes[${index}].missingIngredients`,
        {
          maxItems: 20,
          maxItemLength: 80,
        },
      ),
      instructions: parseOptionalStringArray(
        record.instructions,
        `recipes[${index}].instructions`,
        {
          maxItems: 6,
          maxItemLength: 240,
        },
      ),
      servings: expectOptionalNumber(record.servings, `recipes[${index}].servings`, {
        min: 1,
        max: 20,
      }),
      readyInMinutes: expectOptionalNumber(
        record.readyInMinutes,
        `recipes[${index}].readyInMinutes`,
        {
          min: 1,
          max: 1440,
        },
      ),
      nutrition: !nutritionRecord
        ? undefined
        : {
            calories:
              typeof nutritionRecord.calories === 'undefined'
                ? undefined
                : expectString(nutritionRecord.calories, `recipes[${index}].nutrition.calories`, {
                    maxLength: 32,
                  }),
            protein:
              typeof nutritionRecord.protein === 'undefined'
                ? undefined
                : expectString(nutritionRecord.protein, `recipes[${index}].nutrition.protein`, {
                    maxLength: 32,
                  }),
            carbs:
              typeof nutritionRecord.carbs === 'undefined'
                ? undefined
                : expectString(nutritionRecord.carbs, `recipes[${index}].nutrition.carbs`, {
                    maxLength: 32,
                  }),
            fat:
              typeof nutritionRecord.fat === 'undefined'
                ? undefined
                : expectString(nutritionRecord.fat, `recipes[${index}].nutrition.fat`, {
                    maxLength: 32,
                  }),
          },
    };
  });
};

aiRouter.post(
  '/ask',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = expectRecord(req.body);
    const inventoryNames =
      typeof body.inventoryNames === 'undefined'
        ? []
        : Array.isArray(body.inventoryNames) && body.inventoryNames.length === 0
          ? []
        : expectStringArray(body.inventoryNames, 'inventoryNames', {
            maxItems: 40,
            maxItemLength: 80,
          });

    const payload: AiAskRequest = {
      query: expectString(body.query, 'query', {
        maxLength: 500,
      }),
      inventoryNames,
      recipes: parseRecipeContext(body.recipes),
    };

    const response: AiAskResponse = {
      result: await askPlatePilotAssistant(payload),
    };

    res.status(200).json(response);
  }),
);
