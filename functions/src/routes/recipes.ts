import { Router } from 'express';

import { requireAuth } from '../middleware/auth';
import { findRecipesByIngredients } from '../services/spoonacular';
import type {
  RecipesFindRequest,
  RecipesFindResponse,
} from '../types/backend';
import { asyncHandler } from '../utils/http';
import {
  expectOptionalBoolean,
  expectOptionalNumber,
  expectRecord,
  expectStringArray,
} from '../utils/validation';

export const recipesRouter = Router();

recipesRouter.post(
  '/find',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = expectRecord(req.body);
    const ranking = expectOptionalNumber(body.ranking, 'ranking', {
      integer: true,
      min: 1,
      max: 2,
    });

    const payload: RecipesFindRequest = {
      ingredients: expectStringArray(body.ingredients, 'ingredients', {
        maxItems: 20,
        maxItemLength: 80,
      }),
      number: expectOptionalNumber(body.number, 'number', {
        integer: true,
        min: 1,
        max: 12,
      }),
      ranking: ranking as 1 | 2 | undefined,
      ignorePantry: expectOptionalBoolean(body.ignorePantry, 'ignorePantry'),
    };

    const response: RecipesFindResponse = {
      recipes: await findRecipesByIngredients({
        ingredients: payload.ingredients,
        number: payload.number ?? 6,
        ranking: payload.ranking ?? 2,
        ignorePantry: payload.ignorePantry ?? true,
      }),
    };

    res.status(200).json(response);
  }),
);
