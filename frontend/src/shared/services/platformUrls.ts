function buildPath(pathname: string, params?: URLSearchParams): string {
  const query = params?.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function getPortalUrl(): string {
  return '/';
}

export function getHrmsAppUrl(): string {
  return '/dashboard';
}

export function getSuperAdminApiUrl(): string {
  return '/api/admin';
}

export function getSuperAdminUrl(): string {
  return '/admin';
}

export function buildPortalLoginUrl(returnUrl?: string): string {
  const params = new URLSearchParams();
  if (returnUrl) {
    params.set('returnUrl', returnUrl);
  }

  return buildPath('/login', params);
}

export function buildPortalLogoutUrl(): string {
  return '/logout';
}

export function buildPortalPasswordChangeUrl(returnUrl?: string): string {
  const params = new URLSearchParams();
  if (returnUrl) {
    params.set('returnUrl', returnUrl);
  }

  return buildPath('/change-password', params);
}
