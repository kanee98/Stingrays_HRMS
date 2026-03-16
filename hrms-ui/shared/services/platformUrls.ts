import { getSharedCookieDomain } from '../lib/session';

function appUrl(port: number): string {
  if (typeof window === 'undefined') {
    return `http://localhost:${port}`;
  }

  return `${window.location.protocol}//${window.location.hostname}:${port}`;
}

function getServiceUrl(subdomain: string, port: number, envUrl?: string): string {
  if (typeof window === 'undefined') {
    return envUrl || `http://localhost:${port}`;
  }

  const baseDomain = getSharedCookieDomain(window.location.hostname);
  if (baseDomain) {
    return `${window.location.protocol}//${subdomain}.${baseDomain}`;
  }

  return appUrl(port);
}

export function getPortalUrl(): string {
  return getServiceUrl('portal', 3000, process.env.NEXT_PUBLIC_PORTAL_URL);
}

export function getHrmsAppUrl(): string {
  return getServiceUrl('hrms', 3002, process.env.NEXT_PUBLIC_HRMS_URL);
}

export function getSuperAdminApiUrl(): string {
  return getServiceUrl('super-admin-api', 4020, process.env.NEXT_PUBLIC_SUPER_ADMIN_API_URL);
}

export function getSuperAdminUrl(): string {
  return getServiceUrl('super-admin', 3020, process.env.NEXT_PUBLIC_SUPER_ADMIN_URL);
}

export function buildPortalLoginUrl(returnUrl?: string): string {
  const loginUrl = new URL('/login', getPortalUrl());

  if (returnUrl) {
    loginUrl.searchParams.set('returnUrl', returnUrl);
  }

  return loginUrl.toString();
}

export function buildPortalLogoutUrl(): string {
  return new URL('/logout', getPortalUrl()).toString();
}
