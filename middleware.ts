import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const sessionId = request.cookies.get('session_id')?.value;
  const databaseConfigured =
    Boolean(process.env.DATABASE_URL) &&
    (!process.env.DATABASE_URL?.startsWith('libsql://') || Boolean(process.env.DATABASE_AUTH_TOKEN));

  if (sessionId && !databaseConfigured) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('session_id');
    return response;
  }

  // Already authenticated: skip login page
  if (isPublic && sessionId) {
    return NextResponse.redirect(new URL('/overview', request.url));
  }

  // Not authenticated: go to login
  if (!isPublic && !sessionId) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|fare-tessile.png).*)',
  ],
};
