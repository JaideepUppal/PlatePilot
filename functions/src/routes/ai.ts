import { Router } from 'express';

import { requireAuth } from '../middleware/auth';
import { askPlatePilotAssistant } from '../services/groq';
import type { AiAskRequest, AiAskResponse } from '../types/backend';
import { asyncHandler } from '../utils/http';
import { expectRecord, expectString, expectStringArray } from '../utils/validation';

export const aiRouter = Router();

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
    };

    const response: AiAskResponse = {
      result: await askPlatePilotAssistant(payload),
    };

    res.status(200).json(response);
  }),
);
