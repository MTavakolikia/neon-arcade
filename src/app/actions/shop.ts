'use server';

import { revalidatePath } from 'next/cache';
import { currentUser, can } from '@/auth';
import { db } from '@/lib/db';
import { fail, ok, describeDbError, fieldErrorsFrom } from '@/lib/action-result';
import { productSchema, themeSchema, toBool } from '@/lib/validation';
import type { ActionResult } from '@/lib/action-result';

const PUBLIC_SHOP = '/';
const ADMIN_SHOP = '/admin/shop';
const ADMIN_THEMES = '/admin/shop/themes';

const REVOKE = () => {
  revalidatePath(ADMIN_SHOP);
  revalidatePath(ADMIN_THEMES);
  revalidatePath(PUBLIC_SHOP);
  revalidatePath('/shop', 'page');
};

// ─── Card themes ──────────────────────────────────────────────────────────────

export async function saveThemeAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const user = await currentUser();
  if (!can(user, 'manageShop')) return fail('You do not have permission to edit themes.');

  const id = String(formData.get('id') ?? '').trim();
  const parsed = themeSchema.safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
    emoji: formData.get('emoji'),
    css: formData.get('css'),
    glow: formData.get('glow') ?? '',
    price: formData.get('price'),
    active: toBool(formData.get('active')),
    sortOrder: formData.get('sortOrder') ?? undefined,
  });
  if (!parsed.success) return fail('Check the highlighted fields.', fieldErrorsFrom(parsed.error));

  const { id: themeId, name, emoji, css, glow, price, sortOrder } = parsed.data;

  try {
    if (id) {
      // The primary key is the player-facing id used in localStorage. It is
      // immutable; the form exposes it read-only when editing.
      await db.cardTheme.update({
        where: { id },
        data: {
          name,
          emoji,
          css,
          glow: glow || 'rgba(232,121,249,0.55)',
          price,
          active: parsed.data.active ?? true,
          sortOrder: sortOrder ?? 0,
        },
      });
    } else {
      const clash = await db.cardTheme.findUnique({ where: { id: themeId }, select: { id: true } });
      if (clash) return fail('A theme with that id already exists.', { id: 'Already in use' });
      await db.cardTheme.create({
        data: {
          id: themeId,
          name,
          emoji,
          css,
          glow: glow || 'rgba(232,121,249,0.55)',
          price,
          active: parsed.data.active ?? true,
          sortOrder: sortOrder ?? 0,
        },
      });
    }
  } catch (error) {
    return fail(describeDbError(error));
  }

  REVOKE();
  return ok();
}

export async function toggleThemeActiveAction(id: string): Promise<ActionResult> {
  const user = await currentUser();
  if (!can(user, 'manageShop')) return fail('You do not have permission.');

  const theme = await db.cardTheme.findUnique({ where: { id }, select: { active: true } });
  if (!theme) return fail('That theme no longer exists.');

  await db.cardTheme.update({ where: { id }, data: { active: !theme.active } });
  REVOKE();
  return ok();
}

/**
 * Themes are referenced by Product.themeId, so deletion is blocked while a
 * product points at it. The admin should detach or delete the product first —
 * better than silently orphaning a purchasable item.
 */
export async function deleteThemeAction(id: string): Promise<ActionResult> {
  const user = await currentUser();
  if (!can(user, 'manageShop')) return fail('You do not have permission.');

  const linked = await db.product.count({ where: { themeId: id } });
  if (linked > 0) {
    return fail(`${linked} product${linked > 1 ? 's' : ''} still use this theme. Detach them first.`);
  }

  try {
    await db.cardTheme.delete({ where: { id } });
  } catch {
    return fail('That theme no longer exists.');
  }

  REVOKE();
  return ok();
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function saveProductAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await currentUser();
  if (!can(user, 'manageShop')) return fail('You do not have permission to edit products.');

  const id = String(formData.get('id') ?? '').trim();
  const parsed = productSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    emoji: formData.get('emoji'),
    type: formData.get('type'),
    status: formData.get('status'),
    priceCents: formData.get('priceCents'),
    coinPrice: formData.get('coinPrice') ?? undefined,
    coinGrant: formData.get('coinGrant') ?? undefined,
    shippingCents: formData.get('shippingCents') ?? undefined,
    stock: formData.get('stock') ?? undefined,
    tag: formData.get('tag') ?? '',
    themeId: formData.get('themeId') ?? '',
    featured: toBool(formData.get('featured')),
    sortOrder: formData.get('sortOrder') ?? undefined,
  });
  if (!parsed.success) return fail('Check the highlighted fields.', fieldErrorsFrom(parsed.error));

  const {
    name, description, emoji, type, status, priceCents, coinPrice, coinGrant,
    shippingCents, stock, tag, themeId, featured, sortOrder,
  } = parsed.data;

  // Invariants the UI cannot guarantee on its own.
  if (type === 'DIGITAL' && !coinPrice && !coinGrant && priceCents === 0) {
    return fail('A digital product needs a coin price, a coin grant, or a cash price.', {
      coinPrice: 'Set a coin price or grant',
    });
  }
  if (themeId) {
    const theme = await db.cardTheme.findUnique({ where: { id: themeId }, select: { id: true } });
    if (!theme) return fail('That theme does not exist.', { themeId: 'Unknown theme' });
  }

  const data = {
    name,
    description,
    emoji,
    type,
    status,
    priceCents,
    coinPrice: coinPrice ?? null,
    coinGrant: coinGrant ?? 0,
    shippingCents: shippingCents ?? 0,
    stock: stock ?? null,
    tag: tag || null,
    themeId: themeId || null,
    featured: featured ?? false,
    sortOrder: sortOrder ?? 0,
  };

  try {
    if (id) {
      await db.product.update({ where: { id }, data });
      REVOKE();
      return ok({ id });
    }
    const created = await db.product.create({ data });
    REVOKE();
    return ok({ id: created.id });
  } catch (error) {
    return fail(describeDbError(error));
  }
}

export async function toggleProductStatusAction(id: string): Promise<ActionResult> {
  const user = await currentUser();
  if (!can(user, 'manageShop')) return fail('You do not have permission.');

  const product = await db.product.findUnique({ where: { id }, select: { status: true } });
  if (!product) return fail('That product no longer exists.');

  const next = product.status === 'ACTIVE' ? 'HIDDEN' : 'ACTIVE';
  await db.product.update({ where: { id }, data: { status: next } });
  REVOKE();
  return ok();
}

export async function toggleProductFeaturedAction(id: string): Promise<ActionResult> {
  const user = await currentUser();
  if (!can(user, 'manageShop')) return fail('You do not have permission.');

  const product = await db.product.findUnique({ where: { id }, select: { featured: true } });
  if (!product) return fail('That product no longer exists.');

  await db.product.update({ where: { id }, data: { featured: !product.featured } });
  REVOKE();
  return ok();
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  const user = await currentUser();
  if (!can(user, 'manageShop')) return fail('You do not have permission.');

  const ordered = await db.orderItem.count({ where: { productId: id } });
  if (ordered > 0) {
    // Order history references the product; hide instead of destroying the record.
    await db.product.update({ where: { id }, data: { status: 'HIDDEN' } });
    REVOKE();
    return ok();
  }

  try {
    await db.product.delete({ where: { id } });
  } catch {
    return fail('That product no longer exists.');
  }

  REVOKE();
  return ok();
}