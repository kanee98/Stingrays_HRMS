import { getSharedCookieDomain } from './session';

function appUrl(port: number): string {
  if (typeof window === 'undefined') {
    // Server-side rendering for client components runs without `window`.
    // Returning an empty string avoids silently generating localhost links.
    return '';
  }

  return `${window.location.protocol}//${window.location.hostname}:${port}`;
}

function getServiceUrl(subdomain: string, port: number, envUrl?: string): string {
  if (typeof window === 'undefined') {
    // Avoid a localhost fallback during SSR; use the baked-in URL if provided.
    return envUrl ?? '';
  }

  const baseDomain = getSharedCookieDomain(window.location.hostname);
  if (baseDomain) {
    return `${window.location.protocol}//${subdomain}.${baseDomain}`;
  }

  // In the browser, follow the current host so local/IP dev never jumps to a hosted URL.
  return appUrl(port);
}

export function getAuthServiceUrl(): string {
  return getServiceUrl('auth', 4001, process.env.NEXT_PUBLIC_AUTH_SERVICE_URL);
}

export function getHrmsUrl(): string {
  return getServiceUrl('hrms', 3000, process.env.NEXT_PUBLIC_HRMS_URL);
}

export function getEmployeeUrl(): string {
  return getServiceUrl('employee', 3001, process.env.NEXT_PUBLIC_EMPLOYEE_UI_URL);
}

export function getPayrollUrl(): string {
  return getServiceUrl('payroll', 3010, process.env.NEXT_PUBLIC_PAYROLL_URL);
}

export function getEmployeeApiUrl(): string {
  return getServiceUrl(
    'employee-api',
    4000,
    process.env.NEXT_PUBLIC_EMPLOYEE_API_URL || process.env.NEXT_PUBLIC_API_URL,
  );
}

export function getPayrollApiUrl(): string {
  return getServiceUrl('payroll-api', 4010, process.env.NEXT_PUBLIC_PAYROLL_API_URL);
}

export function getCurrentUrl(): string {
  return typeof window === 'undefined' ? '' : window.location.href;
}

export function getCurrentPathWithSearch(): string {
  if (typeof window === 'undefined') {
    return '/';
  }

  return `${window.location.pathname}${window.location.search}`;
}

export function isSafeRelativePath(value: string | null): value is string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');
}

export function isTrustedReturnUrl(value: string | null): value is string {
  if (typeof window === 'undefined' || !value) {
    return false;
  }

  try {
    const target = new URL(value);
    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      return false;
    }

    if (target.hostname === window.location.hostname) {
      return true;
    }

    const currentBaseDomain = getSharedCookieDomain(window.location.hostname);
    const targetBaseDomain = getSharedCookieDomain(target.hostname);

    return currentBaseDomain !== null && currentBaseDomain === targetBaseDomain;
  } catch {
    return false;
  }
}

export function buildHrmsLoginUrl(returnUrl?: string): string {
  const loginUrl = new URL('/login', getHrmsUrl());

  if (returnUrl) {
    loginUrl.searchParams.set('returnUrl', returnUrl);
  }

  return loginUrl.toString();
}

export function buildLocalLoginUrl(nextPath?: string): string {
  if (!nextPath || !isSafeRelativePath(nextPath)) {
    return '/login';
  }

  // Build a server-safe relative login path.
  const params = new URLSearchParams();
  params.set('next', nextPath);
  return `/login?${params.toString()}`;
}