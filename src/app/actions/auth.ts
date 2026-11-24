'use server';

import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { signIn, signOut } from '@/auth';
import { currentUser } from '@/auth';
import { db } from '@/lib/db';
import { fail, ok, describeDbError, fieldErrorsFrom } from '@/lib/action-result';
import {
  loginSchema,
  registerSchema,
  profileSchema,
  passwordChangeSchema,
} from '@/lib/validation';
import { sanitizeReturnTo } from '@/lib/redirects';

export async function loginAction(_prev: unknown, formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return fail('Check the highlighted fields.', fieldErrorsFrom(parsed.error));

  const returnTo = sanitizeReturnTo(String(formData.get('returnTo') ?? '/'));

  try {
    await signIn('credentials', {
      ...parsed.data,
      redirectTo: returnTo,
    });
  } catch (error) {
    // next-auth throws a redirect on success; anything else is a credential failure.
    if (error instanceof Error && /redirect/i.test(error.message) === false) {
      const message = error.message.includes('suspended')
        ? error.message
        : 'That email and password combination did not match.';
      return fail(message, { password: ' ' });
    }
    // Re-throw the internal redirect so Next can complete navigation.
    throw error;
  }
  return ok();
}

export async function registerAction(_prev: unknown, formData: FormData) {
  const parsed = registerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    callsign: formData.get('callsign') ?? undefined,
  });
  if (!parsed.success) return fail('Check the highlighted fields.', fieldErrorsFrom(parsed.error));

  const { name, email, password, callsign } = parsed.data;
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return fail('That email is already registered.', { email: 'Already registered' });

  if (callsign) {
    const taken = await db.user.findUnique({ where: { callsign }, select: { id: true } });
    if (taken) return fail('That callsign is taken.', { callsign: 'Already taken' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        callsign: callsign || null,
        role: 'PLAYER',
        status: 'ACTIVE',
      },
    });
  } catch (error) {
    return fail(describeDbError(error), { email: 'Could not create that account' });
  }

  // Sign the new player straight in.
  try {
    await signIn('credentials', { email, password, redirectTo: '/admin' });
  } catch {
    await signIn('credentials', { email, password, redirectTo: '/' });
  }
  return ok();
}

export async function logoutAction() {
  await signOut({ redirectTo: '/' });
}

export async function updateProfileAction(_prev: unknown, formData: FormData) {
  const user = await currentUser();
  if (!user) return fail('You need to sign in first.');

  const parsed = profileSchema.safeParse({
    name: formData.get('name'),
    bio: formData.get('bio') ?? '',
    callsign: formData.get('callsign') ?? '',
  });
  if (!parsed.success) return fail('Check the highlighted fields.', fieldErrorsFrom(parsed.error));

  const { name, bio, callsign } = parsed.data;

  if (callsign && callsign !== user.callsign) {
    const taken = await db.user.findUnique({ where: { callsign }, select: { id: true } });
    if (taken) return fail('That callsign is taken.', { callsign: 'Already taken' });
  }

  try {
    await db.user.update({
      where: { id: user.id },
      data: { name, bio: bio || null, callsign: callsign || null },
    });
  } catch (error) {
    return fail(describeDbError(error));
  }

  return ok();
}

export async function changePasswordAction(_prev: unknown, formData: FormData) {
  const session = await currentUser();
  if (!session) return fail('You need to sign in first.');

  const parsed = passwordChangeSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
  });
  if (!parsed.success) return fail('Check the highlighted fields.', fieldErrorsFrom(parsed.error));

  const { currentPassword, newPassword } = parsed.data;

  const record = await db.user.findUnique({ where: { id: session.id }, select: { passwordHash: true } });
  if (!record?.passwordHash) return fail('This account uses a different sign-in method.');

  const matches = await bcrypt.compare(currentPassword, record.passwordHash);
  if (!matches) return fail('Your current password is not correct.', { currentPassword: 'Incorrect' });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.user.update({ where: { id: session.id }, data: { passwordHash } });

  // Force a fresh sign-in everywhere else.
  await db.session.deleteMany({ where: { userId: session.id } });

  redirect('/account?password=changed');
}