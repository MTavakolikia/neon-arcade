import { NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig, isStaffPath } from '@/auth.config';

const { auth } = NextAuth(authConfig);

/**
 * Staff areas are gated here (a session must exist) and then again,
 * authoritatively, in src/app/admin/layout.tsx which can query the database.
 * The middleware pass keeps unauthenticated visitors off the admin subtree
 * entirely rather than relying on a redirect from deep inside the tree.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const signedIn = Boolean(req.auth?.user);

  if (isStaffPath(pathname) && !signedIn) {
    const url = new URL('/login', req.nextUrl.origin);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Everything except API routes, Next internals and static assets.
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
