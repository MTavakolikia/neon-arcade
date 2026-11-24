'use client';

// ─── Neon Arcade · Authentication form ────────────────────────────────────────
// Shared by /login and /register. Talks to the auth server actions and renders
// the ActionResult envelope (field errors + form message) inline.

import Link from 'next/link';
import { useActionState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { loginAction, registerAction } from '@/app/actions/auth';
import { Button, Field, Input } from '@/components/admin/ui';
import type { ActionResult, FieldErrors } from '@/lib/action-result';
import { sanitizeReturnTo } from '@/lib/redirects';
import { cn } from '@/lib/utils';

type AuthMode = 'login' | 'register';

type AuthFlags = {
  callbackUrl?: string;
  registered?: string;
  denied?: string;
};

type AuthFormProps = {
  mode: AuthMode;
  callbackUrl?: string;
  flags?: AuthFlags;
};

const INITIAL_STATE: ActionResult = { ok: true };

/** Submit button that reflects the enclosing form's pending state. */
function SubmitButton({ mode }: { mode: AuthMode }) {
  const { pending } = useFormStatus();
  const label = mode === 'login' ? 'Insert coin · Sign in' : 'Create my account';
  const pendingLabel = mode === 'login' ? 'Signing in…' : 'Creating account…';

  return (
    <Button type="submit" variant="primary" size="lg" disabled={pending} className="w-full">
      {pending ? pendingLabel : label}
    </Button>
  );
}

/** Inline notice for redirects (registered / denied) and action failures. */
function Banner({ tone, children }: { tone: 'success' | 'warn' | 'error'; children: ReactNode }) {
  const tones = {
    success: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
    warn: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
    error: 'border-rose-400/35 bg-rose-400/10 text-rose-200',
  } as const;

  return (
    <div
      role="status"
      className={cn(
        'mb-5 rounded-xl border px-3.5 py-2.5 text-center text-xs font-semibold',
        tones[tone],
      )}
    >
      {children}
    </div>
  );
}

export function AuthForm({ mode, callbackUrl, flags }: AuthFormProps) {
  const isLogin = mode === 'login';
  const action = (isLogin ? loginAction : registerAction) as (
    prev: ActionResult,
    formData: FormData,
  ) => Promise<ActionResult>;
  const [state, formAction] = useActionState(action, INITIAL_STATE);

  const errors: FieldErrors = state.ok ? {} : state.errors;
  // The hidden field is validated again by the action via sanitizeReturnTo().
  const returnTo = sanitizeReturnTo(callbackUrl ?? flags?.callbackUrl ?? '/');
  const otherHref = isLogin ? '/register' : '/login';
  const otherLabel = isLogin ? 'Create an account' : 'Already a player? Sign in';

  return (
    <main className="neon-root relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="arcade-crt" aria-hidden />
      <div className="arcade-vignette" aria-hidden />

      <section className="glass neon-border relative z-10 w-full max-w-md rounded-2xl p-6 shadow-[0_0_60px_rgba(232,121,249,.14)] sm:p-8">
        <div className="mb-7 text-center">
          <div className="mb-3 text-3xl" aria-hidden>{isLogin ? '🕹️' : '🎮'}</div>
          <h1 className="neon-text text-2xl font-black uppercase tracking-[0.16em] text-fuchsia-300">
            {isLogin ? 'Welcome back' : 'Join the arcade'}
          </h1>
          <p className="mt-2 text-sm text-white/55">
            {isLogin
              ? 'Sign in to reach the staff dashboard and your player profile.'
              : 'Save your callsign, unlock achievements and climb the ranks.'}
          </p>
        </div>

        {flags?.registered === '1' && (
          <Banner tone="success">Account created — sign in to continue.</Banner>
        )}
        {flags?.denied === '1' && (
          <Banner tone="warn">That area is for staff only. Sign in with a staff account.</Banner>
        )}
        {!state.ok && <Banner tone="error">{state.message}</Banner>}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="returnTo" value={returnTo} />

          {!isLogin && (
            <Field label="Name" name="name" required error={errors.name}>
              <Input
                id="name"
                name="name"
                autoComplete="name"
                placeholder="Your name"
                required
                aria-invalid={Boolean(errors.name)}
              />
            </Field>
          )}

          <Field
            label="Email"
            name="email"
            required
            error={errors.email}
            hint={isLogin ? undefined : 'Used for sign-in only'}
          >
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              aria-invalid={Boolean(errors.email)}
            />
          </Field>

          <Field
            label="Password"
            name="password"
            required
            error={errors.password}
            hint={isLogin ? undefined : 'At least 8 characters'}
          >
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              placeholder="••••••••"
              required
              aria-invalid={Boolean(errors.password)}
            />
          </Field>

          {!isLogin && (
            <Field
              label="Callsign"
              name="callsign"
              error={errors.callsign}
              hint="Optional · letters, numbers, . _ -"
            >
              <Input
                id="callsign"
                name="callsign"
                autoComplete="off"
                placeholder="NeoPlayer"
                aria-invalid={Boolean(errors.callsign)}
              />
            </Field>
          )}

          <div className="pt-2">
            <SubmitButton mode={mode} />
          </div>
        </form>

        <div className="mt-6 text-center text-xs text-white/45">
          <Link href={otherHref} className="font-semibold text-cyan-300 underline-offset-4 hover:underline">
            {otherLabel}
          </Link>
          <span className="mx-2 text-white/20">·</span>
          <Link href="/" className="hover:text-white/80">
            Back to arcade
          </Link>
        </div>
      </section>
    </main>
  );
}
