import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_SESSION_COOKIE, getSharedCookieDomain } from './shared/lib/session';

function getHrmsBaseUrl(request: NextRequest): string {
  const baseDomain = getSharedCookieDomain(request.nextUrl.hostname);
  if (baseDomain) {
    return `${request.nextUrl.protocol}//hrms.${baseDomain}`;
  }

  return `${request.nextUrl.protocol}//${request.nextUrl.hostname}:3000`;
}

export function proxy(request: NextRequest) {
  if (request.cookies.has(AUTH_SESSION_COOKIE)) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', getHrmsBaseUrl(request));
  loginUrl.searchParams.set('returnUrl', request.nextUrl.href);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
