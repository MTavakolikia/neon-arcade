import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { authConfigPage } from '@/app/auth-meta';
import { AuthForm } from '@/components/auth/auth-form';
import { auth } from '@/auth';
import { sanitizeReturnTo } from '@/lib/redirects';

export const metadata: Metadata = authConfigPage('Sign in');

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; registered?: string; denied?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  if (session?.user) {
    redirect(sanitizeReturnTo(params.callbackUrl, '/'));
  }

  return <AuthForm mode="login" callbackUrl={params.callbackUrl} flags={params} />;
}