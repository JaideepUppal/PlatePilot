import { config as loadEnv } from 'dotenv';

import { ConfigurationError } from '../utils/http';

loadEnv();

const normalizeEnv = (value: string | undefined): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
};

export const getRequiredEnv = (name: string): string => {
  const value = normalizeEnv(process.env[name]);

  if (!value) {
    throw new ConfigurationError(`Missing required server secret: ${name}.`);
  }

  return value;
};

export const getOptionalEnv = (name: string): string | undefined => {
  return normalizeEnv(process.env[name]);
};
