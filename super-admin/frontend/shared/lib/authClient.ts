export interface AuthUser {
  email: string;
  role: string;
}

interface AuthApiResponse {
  error?: string;
  message?: string;
  user?: AuthUser;
}

const AUTH_API_BASE_PATH = '/api/auth';

function getAuthApiUrl(path: string): string {
  return `${AUTH_API_BASE_PATH}/${path.replace(/^\/+/, '')}`;
}

async function getErrorMessage(response: Response, fallbackMessage: string): Promise<string> {
  try {
    const data = (await response.json()) as AuthApiResponse;
    return data.message || data.error || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

export async function loginWithPassword(email: string, password: string): Promise<AuthUser> {
  const response = await fetch(getAuthApiUrl('login'), {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Login failed'));
  }

  const data = (await response.json()) as AuthApiResponse;
  if (!data.user) {
    throw new Error('Login failed');
  }

  return data.user;
}

export async function getSession(): Promise<AuthUser | null> {
  const response = await fetch(getAuthApiUrl('session'), {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Failed to validate the current session'));
  }

  const data = (await response.json()) as AuthApiResponse;
  return data.user ?? null;
}

export async function logoutSession(): Promise<void> {
  const response = await fetch(getAuthApiUrl('logout'), {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok && response.status !== 401) {
    throw new Error(await getErrorMessage(response, 'Failed to log out'));
  }
}
