import type { DecodedIdToken } from 'firebase-admin/auth';
import type { NextFunction, Request, Response } from 'express';

import { adminAuth } from '../config/admin';
import { sendJsonError } from '../utils/http';

export type AuthenticatedRequest = Request & {
  authUser?: DecodedIdToken;
};

const extractBearerToken = (authorizationHeader: string | undefined): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token.trim();
};

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const token = extractBearerToken(
    typeof req.headers.authorization === 'string'
      ? req.headers.authorization
      : undefined,
  );

  if (!token) {
    sendJsonError(res, 401, 'Missing Firebase Bearer token.');
    return;
  }

  try {
    req.authUser = await adminAuth.verifyIdToken(token);
    next();
  } catch {
    sendJsonError(res, 401, 'Invalid or expired Firebase ID token.');
  }
};
