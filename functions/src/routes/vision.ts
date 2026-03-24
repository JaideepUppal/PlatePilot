import { Router } from 'express';

import { requireAuth } from '../middleware/auth';
import { detectIngredients } from '../services/googleVision';
import type {
  VisionDetectRequest,
  VisionDetectResponse,
} from '../types/backend';
import { asyncHandler } from '../utils/http';
import {
  expectOptionalNumber,
  expectRecord,
  expectString,
} from '../utils/validation';

export const visionRouter = Router();

visionRouter.post(
  '/detect',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = expectRecord(req.body);
    const payload: VisionDetectRequest = {
      imageBase64: expectString(body.imageBase64, 'imageBase64', {
        maxLength: 15_000_000,
      }),
      maxResults: expectOptionalNumber(body.maxResults, 'maxResults', {
        integer: true,
        min: 1,
        max: 50,
      }),
    };

    const response: VisionDetectResponse = {
      ingredients: await detectIngredients(
        payload.imageBase64,
        payload.maxResults ?? 20,
      ),
    };

    res.status(200).json(response);
  }),
);
