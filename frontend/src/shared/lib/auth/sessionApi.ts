import { requestApi, requestNoContent, requestOptionalApi } from '../http/apiRequest';

type AuthEnvelope<User> = {
  user?: User;
};

function buildApiUrl(basePath: string, path: string): string {
  return `${basePath.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

export function createSessionApiClient<User>(basePath: string) {
  return {
    async loginWithPassword(email: string, password: string): Promise<User> {
      const payload = await requestApi<AuthEnvelope<User>>(
        buildApiUrl(basePath, 'login'),
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        },
        'Login failed',
      );

      if (!payload.user) {
        throw new Error('Login failed');
      }

      return payload.user;
    },

    async getSession(): Promise<User | null> {
      const payload = await requestOptionalApi<AuthEnvelope<User>>(
        buildApiUrl(basePath, 'session'),
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        },
        {
          nullStatuses: [401],
          fallbackMessage: 'Failed to validate the current session',
        },
      );

      return payload?.user ?? null;
    },

    async logoutSession(): Promise<void> {
      await requestNoContent(
        buildApiUrl(basePath, 'logout'),
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
          },
        },
        {
          allowedStatuses: [401],
          fallbackMessage: 'Failed to log out',
        },
      );
    },
  };
}
