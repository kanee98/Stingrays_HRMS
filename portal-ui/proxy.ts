import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_SESSION_COOKIE } from './shared/lib/session';

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === '/login' || pathname === '/logout') {
    return NextResponse.next();
  }

  if (request.cookies.has(AUTH_SESSION_COOKIE)) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
