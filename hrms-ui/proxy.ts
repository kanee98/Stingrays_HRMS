import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_SESSION_COOKIE, getSharedCookieDomain } from './shared/lib/session';

function getPortalBaseUrl(request: NextRequest): string {
  const baseDomain = getSharedCookieDomain(request.nextUrl.hostname);
  if (baseDomain) {
    return `${request.nextUrl.protocol}//portal.${baseDomain}`;
  }

  return `${request.nextUrl.protocol}//${request.nextUrl.hostname}:3000`;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/login') {
    const loginUrl = new URL('/login', getPortalBaseUrl(request));
    loginUrl.searchParams.set('returnUrl', new URL('/dashboard', request.nextUrl.origin).toString());
    return NextResponse.redirect(loginUrl);
  }

  if (request.cookies.has(AUTH_SESSION_COOKIE)) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', getPortalBaseUrl(request));
  loginUrl.searchParams.set('returnUrl', request.nextUrl.href);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
