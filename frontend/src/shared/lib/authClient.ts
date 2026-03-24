import { requestApi } from './http/apiRequest';
import { createSessionApiClient } from './auth/sessionApi';

export interface AuthUser {
  email: string;
  fullName?: string | null;
  mustChangePassword?: boolean;
  role: string;
}

const authSessionApi = createSessionApiClient<AuthUser>('/api/auth');

export async function loginWithPassword(email: string, password: string): Promise<AuthUser> {
  return authSessionApi.loginWithPassword(email, password);
}

export async function getSession(): Promise<AuthUser | null> {
  return authSessionApi.getSession();
}

export async function logoutSession(): Promise<void> {
  return authSessionApi.logoutSession();
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<AuthUser> {
  const payload = await requestApi<{ user?: AuthUser }>(
    '/api/auth/change-password',
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    },
    'Failed to change password',
  );

  if (!payload.user) {
    throw new Error('Failed to change password');
  }

  return payload.user;
}
