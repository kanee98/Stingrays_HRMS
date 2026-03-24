function buildPath(pathname: string, params?: URLSearchParams): string {
  const query = params?.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function getHrmsUrl(): string {
  return '/dashboard';
}

export function getEmployeeUrl(): string {
  return '/employee';
}

export function getPayrollUrl(): string {
  return '/payroll';
}

export function getEmployeeApiUrl(): string {
  return '/api/onboarding';
}

export function getPayrollApiUrl(): string {
  return '/api/payroll';
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

    return target.origin === window.location.origin;
  } catch {
    return false;
  }
}

export function buildHrmsLoginUrl(returnUrl?: string): string {
  const params = new URLSearchParams();
  if (returnUrl) {
    params.set('returnUrl', returnUrl);
  }

  return buildPath('/login', params);
}

export function buildLocalLoginUrl(nextPath?: string): string {
  if (!nextPath || !isSafeRelativePath(nextPath)) {
    return '/login';
  }

  const params = new URLSearchParams();
  params.set('next', nextPath);
  return `/login?${params.toString()}`;
}

export function buildLocalChangePasswordUrl(nextPath?: string): string {
  if (!nextPath || !isSafeRelativePath(nextPath)) {
    return '/change-password';
  }

  const params = new URLSearchParams();
  params.set('next', nextPath);
  return `/change-password?${params.toString()}`;
}
