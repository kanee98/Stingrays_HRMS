export interface SuperAdminUser {
  id: number;
  email: string;
  fullName: string;
}

interface AuthApiResponse {
  message?: string;
  user?: SuperAdminUser;
}

const ADMIN_API_BASE_PATH = '/api/admin';

function getAdminApiUrl(path: string): string {
  return `${ADMIN_API_BASE_PATH}/${path.replace(/^\/+/, '')}`;
}

async function getErrorMessage(response: Response, fallbackMessage: string): Promise<string> {
  try {
    const data = (await response.json()) as AuthApiResponse;
    return data.message || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

export async function loginWithPassword(email: string, password: string): Promise<SuperAdminUser> {
  const response = await fetch(getAdminApiUrl('auth/login'), {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
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

export async function getSession(): Promise<SuperAdminUser | null> {
  const response = await fetch(getAdminApiUrl('auth/session'), {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
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
  const response = await fetch(getAdminApiUrl('auth/logout'), {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok && response.status !== 401) {
    throw new Error(await getErrorMessage(response, 'Failed to log out'));
  }
}
