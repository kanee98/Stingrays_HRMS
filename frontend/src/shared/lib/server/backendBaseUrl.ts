const DEFAULT_PORT = process.env.APP_BACKEND_PORT || process.env.BACKEND_PORT || '4000';
const DEFAULT_BACKEND_URL_CANDIDATES =
  process.env.NODE_ENV === 'production'
    ? [`http://backend:${DEFAULT_PORT}`, `http://127.0.0.1:${DEFAULT_PORT}`, `http://localhost:${DEFAULT_PORT}`]
    : [`http://127.0.0.1:${DEFAULT_PORT}`, `http://localhost:${DEFAULT_PORT}`, `http://backend:${DEFAULT_PORT}`];

export class BackendServiceConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackendServiceConfigurationError';
  }
}

export function getBackendBaseUrls(): string[] {
  const configuredUrls = [
    process.env.BACKEND_INTERNAL_URL ||
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL,
  ];

  const urls = Array.from(
    new Set(
      [...configuredUrls, ...DEFAULT_BACKEND_URL_CANDIDATES]
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );

  if (urls.length === 0) {
    throw new BackendServiceConfigurationError(
      'Backend service URL is not configured (set BACKEND_INTERNAL_URL, BACKEND_URL, or NEXT_PUBLIC_BACKEND_URL)',
    );
  }

  return urls;
}

export function getBackendBaseUrl(): string {
  const [url] = getBackendBaseUrls();
  if (!url) {
    throw new BackendServiceConfigurationError(
      'Backend service URL is not configured (set BACKEND_INTERNAL_URL, BACKEND_URL, or NEXT_PUBLIC_BACKEND_URL)',
    );
  }

  return url;
}
