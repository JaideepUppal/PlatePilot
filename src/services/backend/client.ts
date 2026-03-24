import { publicEnv } from '../../config/env';
import { auth } from '../../config/firebase';

type BackendErrorCode =
  | 'missing_config'
  | 'not_implemented'
  | 'request_failed'
  | 'invalid_response'
  | 'unauthenticated';

type BackendClientOptions = {
  signal?: AbortSignal;
};

type BackendErrorPayload = {
  error?: {
    message?: string;
  };
  message?: string;
};

const trimTrailingSlash = (value: string): string => {
  return value.replace(/\/+$/, '');
};

const buildEndpointUrl = (endpoint: string): string => {
  const baseUrl = publicEnv.apiBaseUrl;

  if (!baseUrl) {
    throw new BackendServiceError(
      'missing_config',
      endpoint,
      `Secure backend is not configured. Add EXPO_PUBLIC_API_BASE_URL to reach ${endpoint}.`,
    );
  }

  const normalizedBaseUrl = trimTrailingSlash(baseUrl);
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  return `${normalizedBaseUrl}${normalizedEndpoint}`;
};

const parseBackendErrorMessage = async (response: Response, endpoint: string): Promise<string> => {
  try {
    const payload = (await response.json()) as BackendErrorPayload;

    if (typeof payload.error?.message === 'string' && payload.error.message.trim()) {
      return payload.error.message;
    }

    if (typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message;
    }
  } catch {
    // Ignore invalid JSON and fall back below.
  }

  return `Secure backend request failed for ${endpoint} (${response.status}).`;
};

export class BackendServiceError extends Error {
  readonly code: BackendErrorCode;
  readonly endpoint: string;

  constructor(code: BackendErrorCode, endpoint: string, message: string) {
    super(message);
    this.name = 'BackendServiceError';
    this.code = code;
    this.endpoint = endpoint;
  }
}

export const postBackend = async <ResponseBody, RequestBody>(
  endpoint: string,
  body: RequestBody,
  { signal }: BackendClientOptions = {},
): Promise<ResponseBody> => {
  const user = auth.currentUser;

  if (!user) {
    throw new BackendServiceError(
      'unauthenticated',
      endpoint,
      'You must be signed in before using secure backend features.',
    );
  }

  let authToken: string;
  try {
    authToken = await user.getIdToken(true);
  } catch {
    throw new BackendServiceError(
      'unauthenticated',
      endpoint,
      'Failed to get Firebase auth token for secure backend request.',
    );
  }

  const response = await fetch(buildEndpointUrl(endpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    signal,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await parseBackendErrorMessage(response, endpoint);
    const errorCode: BackendErrorCode =
      response.status === 401
        ? 'unauthenticated'
        : response.status === 404 || response.status === 405 || response.status === 501
          ? 'not_implemented'
          : 'request_failed';

    throw new BackendServiceError(errorCode, endpoint, detail);
  }

  try {
    return (await response.json()) as ResponseBody;
  } catch {
    throw new BackendServiceError(
      'invalid_response',
      endpoint,
      `Secure backend returned an invalid JSON response for ${endpoint}.`,
    );
  }
};
