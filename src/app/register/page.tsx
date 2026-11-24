import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { authConfigPage } from '@/app/auth-meta';
import { AuthForm } from '@/components/auth/auth-form';
import { auth } from '@/auth';
import { sanitizeReturnTo } from '@/lib/redirects';

export const metadata: Metadata = authConfigPage('Create account');

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect('/');

  const params = await searchParams;
  return <AuthForm mode="register" callbackUrl={params.callbackUrl} />;
}