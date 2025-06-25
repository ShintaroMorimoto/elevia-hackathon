import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // Auth API routes - always allow
  if (nextUrl.pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // If user is not logged in and trying to access protected routes
  if (!isLoggedIn && nextUrl.pathname !== '/') {
    return NextResponse.redirect(new URL('/', nextUrl));
  }

  // If user is logged in and on the root page, continue (they'll see dashboard)
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match all paths except static files and images
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
  runtime: 'nodejs',
};
