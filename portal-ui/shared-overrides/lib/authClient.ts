import {
  getSession as getBaseSession,
  loginWithPassword as loginWithBasePassword,
  logoutSession as logoutBaseSession,
} from '../../shared/lib/authClient';

export interface AuthUser {
  email: string;
  fullName?: string | null;
  mustChangePassword?: boolean;
  role: string;
}

export async function loginWithPassword(email: string, password: string): Promise<AuthUser> {
  return (await loginWithBasePassword(email, password)) as AuthUser;
}

export async function getSession(): Promise<AuthUser | null> {
  return (await getBaseSession()) as AuthUser | null;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<AuthUser> {
  const response = await fetch('/api/auth/change-password', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (!response.ok) {
    let message = 'Failed to change password';
    try {
      const data = (await response.json()) as { message?: string; error?: string };
      message = data.message || data.error || message;
    } catch {
      // Keep the default message when the response body is not JSON.
    }

    throw new Error(message);
  }

  const data = (await response.json()) as { user?: AuthUser };
  if (!data.user) {
    throw new Error('Failed to change password');
  }

  return data.user;
}

export async function logoutSession(): Promise<void> {
  await logoutBaseSession();
}
