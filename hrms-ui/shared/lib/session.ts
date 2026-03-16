export const AUTH_SESSION_COOKIE = 'stingrays_hrms_session';
export const THEME_COOKIE = 'stingrays_hrms_theme';

const IPV4_HOSTNAME = /^(\d{1,3}\.){3}\d{1,3}$/;

export function isIpAddress(hostname: string): boolean {
  return IPV4_HOSTNAME.test(hostname) || hostname.includes(':');
}

export function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '127.0.0.1' || hostname === '::1';
}

export function getSharedCookieDomain(hostname: string): string | null {
  if (!hostname || isLocalHostname(hostname) || isIpAddress(hostname)) {
    return null;
  }

  const parts = hostname.split('.').filter(Boolean);
  if (parts.length < 3) {
    return null;
  }

  return parts.slice(1).join('.');
}

export function buildClientCookieAttributes(maxAgeSeconds: number): string {
  if (typeof window === 'undefined') {
    return `path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
  }

  const attributes = [`path=/`, `max-age=${maxAgeSeconds}`, 'SameSite=Lax'];
  const domain = getSharedCookieDomain(window.location.hostname);

  if (domain) {
    attributes.push(`domain=.${domain}`);
  }

  if (window.location.protocol === 'https:') {
    attributes.push('Secure');
  }

  return attributes.join('; ');
}
