import type { Metadata } from 'next';

export const authConfigPage = (title: string): Metadata => ({
  title: `${title} · Neon Arcade`,
  description: 'Sign in to Neon Arcade to reach the staff dashboard and your player profile.',
  robots: { index: false, follow: false },
});