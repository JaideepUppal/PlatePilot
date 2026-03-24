import { AppError } from './http';

type NumberValidationOptions = {
  integer?: boolean;
  min?: number;
  max?: number;
};

type StringValidationOptions = {
  maxLength?: number;
  minLength?: number;
  allowEmpty?: boolean;
};

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export const expectRecord = (value: unknown, fieldName = 'request body'): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be a JSON object.`);
  }

  return value as Record<string, unknown>;
};

export const expectString = (
  value: unknown,
  fieldName: string,
  {
    maxLength,
    minLength = 1,
    allowEmpty = false,
  }: StringValidationOptions = {},
): string => {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string.`);
  }

  const trimmedValue = value.trim();

  if (!allowEmpty && trimmedValue.length < minLength) {
    throw new ValidationError(`${fieldName} is required.`);
  }

  if (allowEmpty && trimmedValue.length === 0) {
    return trimmedValue;
  }

  if (trimmedValue.length < minLength) {
    throw new ValidationError(`${fieldName} must be at least ${minLength} characters.`);
  }

  if (typeof maxLength === 'number' && trimmedValue.length > maxLength) {
    throw new ValidationError(`${fieldName} must be at most ${maxLength} characters.`);
  }

  return trimmedValue;
};

export const expectBoolean = (value: unknown, fieldName: string): boolean => {
  if (typeof value !== 'boolean') {
    throw new ValidationError(`${fieldName} must be a boolean.`);
  }

  return value;
};

export const expectNumber = (
  value: unknown,
  fieldName: string,
  { integer = false, min, max }: NumberValidationOptions = {},
): number => {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    throw new ValidationError(`${fieldName} must be a valid number.`);
  }

  if (integer && !Number.isInteger(value)) {
    throw new ValidationError(`${fieldName} must be an integer.`);
  }

  if (typeof min === 'number' && value < min) {
    throw new ValidationError(`${fieldName} must be at least ${min}.`);
  }

  if (typeof max === 'number' && value > max) {
    throw new ValidationError(`${fieldName} must be at most ${max}.`);
  }

  return value;
};

export const expectOptionalNumber = (
  value: unknown,
  fieldName: string,
  options: NumberValidationOptions = {},
): number | undefined => {
  if (typeof value === 'undefined') {
    return undefined;
  }

  return expectNumber(value, fieldName, options);
};

export const expectOptionalBoolean = (
  value: unknown,
  fieldName: string,
): boolean | undefined => {
  if (typeof value === 'undefined') {
    return undefined;
  }

  return expectBoolean(value, fieldName);
};

export const expectStringArray = (
  value: unknown,
  fieldName: string,
  { maxItems = 25, maxItemLength = 80 }: { maxItems?: number; maxItemLength?: number } = {},
): string[] => {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array of strings.`);
  }

  const normalizedValues = value
    .map((item) => expectString(item, fieldName, { maxLength: maxItemLength }))
    .filter(Boolean);

  if (normalizedValues.length === 0) {
    throw new ValidationError(`${fieldName} must include at least one value.`);
  }

  if (normalizedValues.length > maxItems) {
    throw new ValidationError(`${fieldName} must include at most ${maxItems} values.`);
  }

  return Array.from(new Set(normalizedValues));
};

export const expectOptionalEnumArray = <T extends string>(
  value: unknown,
  fieldName: string,
  allowedValues: readonly T[],
  { maxItems = allowedValues.length }: { maxItems?: number } = {},
): T[] | undefined => {
  if (typeof value === 'undefined') {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array.`);
  }

  const normalizedValues = value.map((item) => expectString(item, fieldName, { maxLength: 64 }));

  if (normalizedValues.length > maxItems) {
    throw new ValidationError(`${fieldName} must include at most ${maxItems} values.`);
  }

  const invalidValue = normalizedValues.find(
    (item) => !allowedValues.includes(item as T),
  );

  if (invalidValue) {
    throw new ValidationError(`${fieldName} contains an unsupported value: ${invalidValue}.`);
  }

  return Array.from(new Set(normalizedValues)) as T[];
};
