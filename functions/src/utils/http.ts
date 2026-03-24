import type {
  ErrorRequestHandler,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from 'express';

export class AppError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string) {
    super(message, 500);
    this.name = 'ConfigurationError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string, statusCode = 502) {
    super(message, statusCode);
    this.name = 'ExternalServiceError';
  }
}

type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;

export const asyncHandler = (handler: AsyncRouteHandler): RequestHandler => {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
};

export const sendJsonError = (
  res: Response,
  statusCode: number,
  message: string,
): Response => {
  return res.status(statusCode).json({
    error: {
      message,
    },
  });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (res.headersSent) {
    return;
  }

  if (error instanceof AppError) {
    sendJsonError(res, error.statusCode, error.message);
    return;
  }

  if (error instanceof SyntaxError) {
    sendJsonError(res, 400, 'Request body must be valid JSON.');
    return;
  }

  console.error(error);
  sendJsonError(res, 500, 'Internal server error.');
};
