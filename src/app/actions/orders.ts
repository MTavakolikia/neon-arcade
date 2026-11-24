'use server';

import { revalidatePath } from 'next/cache';
import { currentUser, can } from '@/auth';
import { db } from '@/lib/db';
import { fail, ok, describeDbError, fieldErrorsFrom } from '@/lib/action-result';
import { orderStatusSchema, orderNoteSchema, checkoutSchema } from '@/lib/validation';
import { makeOrderNumber } from '@/lib/constants';
import type { ActionResult } from '@/lib/action-result';

const REVOKE = () => {
  revalidatePath('/admin/orders');
  revalidatePath('/admin/orders/[id]');
  revalidatePath('/admin');
};

export async function updateOrderStatusAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const actor = await currentUser();
  if (!can(actor, 'manageOrders')) return fail('Only admins can manage orders.');

  const id = String(formData.get('id') ?? '').trim();
  const parsed = orderStatusSchema.safeParse({ status: formData.get('status') });
  if (!parsed.success) return fail('Pick a valid status.', fieldErrorsFrom(parsed.error));

  const order = await db.order.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!order) return fail('That order no longer exists.');

  await db.order.update({ where: { id }, data: { status: parsed.data.status } });
  REVOKE();
  return ok();
}

export async function updateOrderNotesAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const actor = await currentUser();
  if (!can(actor, 'manageOrders')) return fail('Only admins can manage orders.');

  const id = String(formData.get('id') ?? '').trim();
  const parsed = orderNoteSchema.safeParse({ notes: formData.get('notes') ?? '' });
  if (!parsed.success) return fail('That note is too long.', fieldErrorsFrom(parsed.error));

  await db.order.update({ where: { id }, data: { notes: parsed.data.notes || null } });
  REVOKE();
  return ok();
}

export async function deleteOrderAction(id: string): Promise<ActionResult> {
  const actor = await currentUser();
  if (!can(actor, 'manageOrders')) return fail('Only admins can delete orders.');

  try {
    await db.order.delete({ where: { id } });
  } catch {
    return fail('That order no longer exists.');
  }

  REVOKE();
  return ok();
}

/**
 * Cart checkout. Physical merch only — digital goods are bought with coins and
 * settled on the client so they never touch the network.
 *
 * Prices are recomputed from the database rather than trusted from the client,
 * which is what makes the order totals tamper-proof.
 */
export async function checkoutAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ orderNumber: string }>> {
  const parsed = checkoutSchema.safeParse({
    productIds: formData.getAll('productIds').map(String),
    customerName: formData.get('customerName'),
    email: formData.get('email'),
    notes: formData.get('notes') ?? '',
  });
  if (!parsed.success) return fail('Check the highlighted fields.', fieldErrorsFrom(parsed.error));

  const { productIds, customerName, email, notes } = parsed.data;
  const uniqueIds = [...new Set(productIds)];

  const products = await db.product.findMany({
    where: { id: { in: uniqueIds }, type: 'PHYSICAL', status: 'ACTIVE' },
    select: { id: true, name: true, emoji: true, priceCents: true, shippingCents: true, stock: true },
  });

  if (products.length === 0) {
    return fail('None of those items are available right now.', { productIds: 'Cart is no longer valid' });
  }

  for (const product of products) {
    if (product.stock !== null && product.stock <= 0) {
      return fail(`${product.name} just sold out.`, { productIds: `${product.name} is sold out` });
    }
  }

  const user = await currentUser();
  const subtotal = products.reduce((sum, p) => sum + p.priceCents, 0);
  const shipping = products.reduce((sum, p) => sum + p.shippingCents, 0);
  const total = subtotal + shipping;

  try {
    const order = await db.order.create({
      data: {
        orderNumber: makeOrderNumber(),
        status: 'PENDING',
        userId: user?.id ?? null,
        email,
        customerName,
        notes: notes || null,
        subtotalCents: subtotal,
        shippingCents: shipping,
        totalCents: total,
        items: {
          create: products.map((p) => ({
            productId: p.id,
            productName: p.name,
            productEmoji: p.emoji,
            quantity: 1,
            unitCents: p.priceCents,
            lineCents: p.priceCents,
          })),
        },
      },
    });

    // Decrement stock so the admin view reflects reality. Never go negative.
    await Promise.all(
      products
        .filter((p) => p.stock !== null)
        .map((p) =>
          db.product.update({
            where: { id: p.id },
            data: { stock: { decrement: 1 } },
          }),
        ),
    );

    REVOKE();
    return ok({ orderNumber: order.orderNumber });
  } catch (error) {
    return fail(describeDbError(error));
  }
}