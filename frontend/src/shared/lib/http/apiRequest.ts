export class ApiRequestError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.payload = payload;
  }
}

async function readResponsePayload(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function getErrorMessage(payload: unknown, fallbackMessage: string): string {
  if (payload && typeof payload === 'object') {
    const message = 'message' in payload ? payload.message : null;
    const error = 'error' in payload ? payload.error : null;

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    if (typeof error === 'string' && error.trim()) {
      return error;
    }
  }

  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }

  return fallbackMessage;
}

export async function requestApi<T>(input: RequestInfo | URL, init: RequestInit, fallbackMessage: string): Promise<T> {
  const response = await fetch(input, {
    ...init,
    credentials: 'include',
    cache: 'no-store',
  });

  const payload = await readResponsePayload(response);
  if (!response.ok) {
    throw new ApiRequestError(getErrorMessage(payload, fallbackMessage), response.status, payload);
  }

  return payload as T;
}

export async function requestOptionalApi<T>(
  input: RequestInfo | URL,
  init: RequestInit,
  options: { nullStatuses?: number[]; fallbackMessage: string },
): Promise<T | null> {
  const response = await fetch(input, {
    ...init,
    credentials: 'include',
    cache: 'no-store',
  });

  const payload = await readResponsePayload(response);
  if (options.nullStatuses?.includes(response.status)) {
    return null;
  }

  if (!response.ok) {
    throw new ApiRequestError(getErrorMessage(payload, options.fallbackMessage), response.status, payload);
  }

  return payload as T;
}

export async function requestNoContent(
  input: RequestInfo | URL,
  init: RequestInit,
  options: { allowedStatuses?: number[]; fallbackMessage: string },
): Promise<void> {
  const response = await fetch(input, {
    ...init,
    credentials: 'include',
    cache: 'no-store',
  });

  if (response.ok || options.allowedStatuses?.includes(response.status)) {
    return;
  }

  const payload = await readResponsePayload(response);
  throw new ApiRequestError(getErrorMessage(payload, options.fallbackMessage), response.status, payload);
}
