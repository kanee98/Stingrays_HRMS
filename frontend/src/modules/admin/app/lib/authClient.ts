import { createSessionApiClient } from '@shared/lib/auth/sessionApi';

export interface SuperAdminUser {
  id: number;
  email: string;
  fullName: string;
}

const superAdminSessionApi = createSessionApiClient<SuperAdminUser>('/api/admin/auth');

export async function loginWithPassword(email: string, password: string): Promise<SuperAdminUser> {
  return superAdminSessionApi.loginWithPassword(email, password);
}

export async function getSession(): Promise<SuperAdminUser | null> {
  return superAdminSessionApi.getSession();
}

export async function logoutSession(): Promise<void> {
  return superAdminSessionApi.logoutSession();
}
