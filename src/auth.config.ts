// ─── Neon Arcade · Edge-safe auth config ──────────────────────────────────────
// Split out from src/auth.ts so middleware can run on the edge runtime without
// pulling in Prisma or bcrypt. The session is a JWT so the middleware can make
// routing decisions from the cookie alone; authoritative role/status checks
// happen in the admin layout and server actions via currentUser().

import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

export const authConfig = {
  pages: { signIn: '/login' },
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: 'jwt' as const, maxAge: 60 * 60 * 24 * 7 },
  // Declared here so the config satisfies NextAuthConfig on the edge. The real
  // provider list lives in src/auth.ts, which is the only place that touches
  // Prisma and bcrypt.
  providers: [
    Credentials({
      id: 'credentials-placeholder',
      name: 'Credentials',
      credentials: {},
      authorize: () => null,
    }),
  ],
  callbacks: {
    /**
     * Coarse gate for staff areas: any authenticated user passes. The precise
     * role check runs in the admin layout (which can query the database), so a
     * demoted user is still locked out on the very next request.
     */
    authorized({ auth: session }) {
      return Boolean(session?.user);
    },
  },
} satisfies NextAuthConfig;

export const STAFF_PREFIXES = ['/admin'] as const;
export const AUTH_ROUTES = ['/login', '/register'] as const;

export const isStaffPath = (pathname: string) =>
  STAFF_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export const isAuthRoute = (pathname: string) =>
  (AUTH_ROUTES as readonly string[]).includes(pathname);
