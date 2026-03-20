const normalizePublicEnv = (value: string | undefined): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
};

export const publicEnv = {
  apiBaseUrl: normalizePublicEnv(process.env.EXPO_PUBLIC_API_BASE_URL),
} as const;
