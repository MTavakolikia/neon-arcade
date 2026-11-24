import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authConfig } from '@/auth.config';
import { CAN, type Role, type UserStatus } from '@/lib/constants';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: Role;
      status: UserStatus;
      callsign: string | null;
    } & import('next-auth').DefaultSession['user'];
  }
  interface User {
    role: Role;
    status: UserStatus;
    callsign: string | null;
  }
}

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// A valid bcrypt hash of a value nobody will ever guess. Comparing against it on
// the "no such user" path keeps login responses constant-time-ish, so the API
// does not reveal which email addresses have accounts.
const DUMMY_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers: [
    Credentials({
      name: 'Email and password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await db.user.findUnique({ where: { email } });

        if (!user?.passwordHash) {
          await bcrypt.compare(password, DUMMY_HASH);
          return null;
        }
        if (user.status === 'SUSPENDED') {
          throw new Error('This account is suspended. Contact an administrator.');
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          status: user.status,
          callsign: user.callsign,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: Role }).role;
        token.status = (user as { status: UserStatus }).status;
        token.callsign = (user as { callsign: string | null }).callsign;
      }
      // Re-read on every explicit session update so a role change lands at once.
      else if (trigger === 'update' && token.id) {
        const fresh = await db.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, status: true, callsign: true },
        });
        if (fresh) {
          token.role = fresh.role;
          token.status = fresh.status;
          token.callsign = fresh.callsign;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? session.user.id;
        session.user.role = (token.role as Role) ?? 'PLAYER';
        session.user.status = (token.status as UserStatus) ?? 'ACTIVE';
        session.user.callsign = (token.callsign as string | null) ?? null;
      }
      return session;
    },
  },
});

/** Authoritative user record from the database — never trust the JWT alone. */
export async function currentUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      status: true,
      bio: true,
      callsign: true,
      xp: true,
      coins: true,
      gamesPlayed: true,
      wins: true,
      bestStreak: true,
      createdAt: true,
    },
  });

  if (!user || user.status === 'SUSPENDED') return null;
  return user;
}

/** Permission check against a database-verified user. */
export const can = (user: { role: Role } | null | undefined, action: keyof typeof CAN): boolean =>
  !!user && CAN[action](user.role);

/**
 * Guard for staff pages. Redirects to /login (anonymous) or /admin?denied=1
 * (signed in but insufficient role), and returns null when access is granted.
 */
export async function requireStaff(minimum: 'EDITOR' | 'ADMIN' = 'EDITOR') {
  const user = await currentUser();
  if (!user) return { user: null, denied: 'unauthenticated' as const };
  if (!CAN.viewAdmin(user.role) || !CAN[minimum === 'ADMIN' ? 'manageUsers' : 'managePosts'](user.role)) {
    return { user: null, denied: 'forbidden' as const };
  }
  return { user, denied: null };
}
