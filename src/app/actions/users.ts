'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { currentUser, can } from '@/auth';
import { db } from '@/lib/db';
import { fail, ok, describeDbError, fieldErrorsFrom } from '@/lib/action-result';
import { userCreateSchema, userUpdateSchema } from '@/lib/validation';
import type { ActionResult } from '@/lib/action-result';
import type { Role, UserStatus } from '@/lib/constants';

const REVOKE = () => {
  revalidatePath('/admin/users');
  revalidatePath('/admin/users/[id]');
  revalidatePath('/admin');
};

export async function createUserAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const actor = await currentUser();
  if (!can(actor, 'manageUsers')) return fail('Only admins can create users.');

  const parsed = userCreateSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    role: formData.get('role'),
    callsign: formData.get('callsign') ?? '',
  });
  if (!parsed.success) return fail('Check the highlighted fields.', fieldErrorsFrom(parsed.error));

  const { name, email, password, role, callsign } = parsed.data;

  const emailTaken = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (emailTaken) return fail('That email is already registered.', { email: 'Already registered' });

  if (callsign) {
    const csTaken = await db.user.findUnique({ where: { callsign }, select: { id: true } });
    if (csTaken) return fail('That callsign is taken.', { callsign: 'Already taken' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const created = await db.user.create({
      data: { name, email, passwordHash, role, callsign: callsign || null },
    });
    REVOKE();
    return ok({ id: created.id });
  } catch (error) {
    return fail(describeDbError(error));
  }
}

export async function updateUserAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const actor = await currentUser();
  if (!can(actor, 'manageUsers')) return fail('Only admins can manage users.');

  const id = String(formData.get('id') ?? '').trim();
  if (!id) return fail('Missing user id.');

  const parsed = userUpdateSchema.safeParse({
    name: formData.get('name'),
    role: formData.get('role'),
    status: formData.get('status'),
    bio: formData.get('bio') ?? '',
    xp: formData.get('xp') ?? 0,
    coins: formData.get('coins') ?? 0,
    callsign: formData.get('callsign') ?? '',
  });
  if (!parsed.success) return fail('Check the highlighted fields.', fieldErrorsFrom(parsed.error));

  const { name, role, status, bio, xp, coins, callsign } = parsed.data;

  // Lock-out protection: an admin must not be able to strip the last admin, or
  // demote/suspend themselves into a state nobody can undo.
  const target = await db.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target) return fail('That user no longer exists.');

  if (target.id === actor?.id && (role !== 'ADMIN' || status !== 'ACTIVE')) {
    return fail('You cannot demote or suspend your own account.', { role: 'Cannot change yourself' });
  }

  if (target.role === 'ADMIN' && (role !== 'ADMIN' || status !== 'ACTIVE')) {
    const adminCount = await db.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } });
    if (adminCount <= 1) {
      return fail('At least one active admin must remain.', { role: 'Last admin' });
    }
  }

  if (callsign) {
    const clash = await db.user.findUnique({
      where: { callsign },
      select: { id: true },
    });
    if (clash && clash.id !== id) return fail('That callsign is taken.', { callsign: 'Already taken' });
  }

  try {
    await db.user.update({
      where: { id },
      data: { name, role, status, bio: bio || null, xp, coins, callsign: callsign || null },
    });
  } catch (error) {
    return fail(describeDbError(error));
  }

  REVOKE();
  return ok();
}

export async function setUserRoleAction(id: string, role: Role): Promise<ActionResult> {
  const actor = await currentUser();
  if (!can(actor, 'manageUsers')) return fail('Only admins can change roles.');

  const target = await db.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target) return fail('That user no longer exists.');
  if (target.id === actor?.id && role !== 'ADMIN') return fail('You cannot demote yourself.');
  if (target.role === 'ADMIN' && role !== 'ADMIN') {
    const adminCount = await db.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } });
    if (adminCount <= 1) return fail('At least one active admin must remain.');
  }

  await db.user.update({ where: { id }, data: { role } });
  REVOKE();
  return ok();
}

export async function setUserStatusAction(id: string, status: UserStatus): Promise<ActionResult> {
  const actor = await currentUser();
  if (!can(actor, 'manageUsers')) return fail('Only admins can change account status.');

  const target = await db.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target) return fail('That user no longer exists.');
  if (target.id === actor?.id && status !== 'ACTIVE') return fail('You cannot suspend yourself.');
  if (target.role === 'ADMIN' && status !== 'ACTIVE') {
    const adminCount = await db.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } });
    if (adminCount <= 1) return fail('At least one active admin must remain.');
  }

  await db.user.update({
    where: { id },
    data: {
      status,
      // Suspending must kill live sessions, otherwise the JWT keeps working
      // until it expires on its own.
      ...(status === 'SUSPENDED' ? { sessions: { deleteMany: {} } } : {}),
    },
  });

  REVOKE();
  return ok();
}

export async function toggleAchievementAction(userId: string, achievementId: string): Promise<ActionResult<{ granted: boolean }>> {
  const actor = await currentUser();
  if (!can(actor, 'manageUsers')) return fail('Only admins can grant achievements.');

  const existing = await db.userAchievement.findUnique({
    where: { userId_achievementId: { userId, achievementId } },
    select: { userId: true },
  });

  if (existing) {
    await db.userAchievement.delete({ where: { userId_achievementId: { userId, achievementId } } });
    REVOKE();
    return ok({ granted: false });
  }

  const [user, achievement] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { id: true } }),
    db.achievement.findUnique({ where: { id: achievementId }, select: { id: true } }),
  ]);
  if (!user || !achievement) return fail('That user or achievement no longer exists.');

  await db.userAchievement.create({ data: { userId, achievementId } });
  REVOKE();
  return ok({ granted: true });
}

export async function deleteUserAction(id: string): Promise<ActionResult> {
  const actor = await currentUser();
  if (!can(actor, 'manageUsers')) return fail('Only admins can delete users.');

  if (id === actor?.id) return fail('You cannot delete your own account.');

  const target = await db.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) return fail('That user no longer exists.');

  if (target.role === 'ADMIN') {
    const adminCount = await db.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } });
    if (adminCount <= 1) return fail('At least one active admin must remain.');
  }

  try {
    // Posts and scores cascade; orders are preserved for accounting.
    await db.user.delete({ where: { id } });
  } catch (error) {
    return fail(describeDbError(error));
  }

  REVOKE();
  return ok();
}

export async function resetUserPasswordAction(id: string, formData: FormData): Promise<ActionResult> {
  const actor = await currentUser();
  if (!can(actor, 'manageUsers')) return fail('Only admins can reset passwords.');

  const password = String(formData.get('password') ?? '');
  if (password.length < 8) return fail('Password must be at least 8 characters.', { password: 'Too short' });

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    await db.user.update({
      where: { id },
      data: { passwordHash, sessions: { deleteMany: {} } },
    });
  } catch {
    return fail('That user no longer exists.');
  }

  REVOKE();
  return ok();
}