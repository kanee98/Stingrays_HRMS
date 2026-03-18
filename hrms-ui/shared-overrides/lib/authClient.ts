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

export async function logoutSession(): Promise<void> {
  await logoutBaseSession();
}
