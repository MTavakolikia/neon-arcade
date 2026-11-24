// ─── Neon Arcade · Shared validation schemas ───────────────────────────────────
// Used by server actions. Every mutation validates here rather than trusting
// FormData, so a hand-crafted POST cannot set fields the UI does not expose.

import { z } from 'zod';
import {
  DIFFICULTIES,
  GAME_IDS,
  ORDER_STATUSES,
  POST_STATUSES,
  PRODUCT_STATUSES,
  PRODUCT_TYPES,
  ROLES,
  USER_STATUSES,
} from './constants';

const trimmed = z.string().trim();

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address')
  .max(190, 'Email is too long');

export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(200, 'Password is too long');

export const callsignSchema = trimmed
  .min(2, 'Callsign must be at least 2 characters')
  .max(24, 'Callsign must be 24 characters or fewer')
  .regex(/^[a-zA-Z0-9_.-]+$/, 'Use letters, numbers, dot, dash or underscore only');

export const registerSchema = z.object({
  name: trimmed.min(2, 'Enter your name').max(60, 'Name is too long'),
  email: emailSchema,
  password: passwordSchema,
  callsign: callsignSchema.optional().or(z.literal('')),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const profileSchema = z.object({
  name: trimmed.min(1, 'Enter your name').max(60, 'Name is too long'),
  bio: trimmed.max(280, 'Bio must be 280 characters or fewer'),
  callsign: callsignSchema.optional().or(z.literal('')),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: passwordSchema,
});
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

// ─── Blog ─────────────────────────────────────────────────────────────────────

const hexColor = trimmed.regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #22d3ee');

export const postSchema = z.object({
  title: trimmed.min(4, 'Title must be at least 4 characters').max(140, 'Title is too long'),
  slug: trimmed
    .max(80, 'Slug is too long')
    .regex(/^[a-z0-9-]*$/, 'Slug may only contain lowercase letters, numbers and dashes')
    .optional()
    .or(z.literal('')),
  excerpt: trimmed.min(10, 'Excerpt must be at least 10 characters').max(400, 'Excerpt is too long'),
  body: trimmed.min(50, 'Body must be at least 50 characters'),
  emoji: trimmed.min(1, 'Add an emoji').max(8),
  accent: hexColor,
  tags: trimmed.max(200).optional().or(z.literal('')),
  readMin: z.coerce.number().int().min(1, 'Minimum 1 minute').max(120, 'Maximum 120 minutes'),
  status: z.enum(POST_STATUSES),
  featured: z.coerce.boolean().optional(),
  authorId: trimmed.optional().or(z.literal('')),
});
export type PostInput = z.infer<typeof postSchema>;

// ─── Shop ─────────────────────────────────────────────────────────────────────

export const themeSchema = z.object({
  id: trimmed
    .min(2, 'Id must be at least 2 characters')
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'Id may only contain lowercase letters, numbers and dashes'),
  name: trimmed.min(2, 'Name is too short').max(60),
  emoji: trimmed.min(1, 'Add an emoji').max(8),
  css: trimmed.min(8, 'Enter a CSS background').max(300),
  glow: trimmed.max(80).optional().or(z.literal('')),
  price: z.coerce.number().int().min(0, 'Price cannot be negative').max(1_000_000),
  active: z.coerce.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});
export type ThemeInput = z.infer<typeof themeSchema>;

export const productSchema = z.object({
  name: trimmed.min(2, 'Name is too short').max(120),
  description: trimmed.min(10, 'Description must be at least 10 characters').max(500),
  emoji: trimmed.min(1, 'Add an emoji').max(8),
  type: z.enum(PRODUCT_TYPES),
  status: z.enum(PRODUCT_STATUSES),
  priceCents: z.coerce.number().int().min(0, 'Price cannot be negative').max(10_000_000),
  coinPrice: z.coerce.number().int().min(0).max(1_000_000).optional(),
  coinGrant: z.coerce.number().int().min(0).max(1_000_000).optional(),
  shippingCents: z.coerce.number().int().min(0).max(1_000_000).optional(),
  stock: z.coerce.number().int().min(0).max(100_000).optional(),
  tag: trimmed.max(24).optional().or(z.literal('')),
  themeId: trimmed.optional().or(z.literal('')),
  featured: z.coerce.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});
export type ProductInput = z.infer<typeof productSchema>;

// ─── Users ────────────────────────────────────────────────────────────────────

export const userCreateSchema = z.object({
  name: trimmed.min(2, 'Enter their name').max(60),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(ROLES),
  callsign: callsignSchema.optional().or(z.literal('')),
});
export type UserCreateInput = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = z.object({
  name: trimmed.min(1, 'Enter their name').max(60),
  role: z.enum(ROLES),
  status: z.enum(USER_STATUSES),
  bio: trimmed.max(280).optional().or(z.literal('')),
  xp: z.coerce.number().int().min(0).max(100_000_000),
  coins: z.coerce.number().int().min(0).max(100_000_000),
  callsign: callsignSchema.optional().or(z.literal('')),
});
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

// ─── Orders ───────────────────────────────────────────────────────────────────

export const orderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});
export type OrderStatusInput = z.infer<typeof orderStatusSchema>;

export const orderNoteSchema = z.object({
  notes: trimmed.max(500, 'Note must be 500 characters or fewer'),
});
export type OrderNoteInput = z.infer<typeof orderNoteSchema>;

export const checkoutSchema = z.object({
  productIds: z.array(trimmed.min(1)).min(1, 'Your cart is empty').max(20),
  customerName: trimmed.min(2, 'Enter a name for the order').max(80),
  email: emailSchema,
  notes: trimmed.max(500).optional().or(z.literal('')),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

// ─── Telemetry ────────────────────────────────────────────────────────────────

export const scoreSchema = z.object({
  gameId: z.enum(GAME_IDS),
  difficulty: z.enum(DIFFICULTIES),
  score: z.coerce.number().int().min(0).max(100_000_000),
  stars: z.coerce.number().int().min(0).max(3).optional(),
  won: z.coerce.boolean(),
  xpEarned: z.coerce.number().int().min(0).max(100_000),
  coinsEarned: z.coerce.number().int().min(0).max(100_000),
  durationMs: z.coerce.number().int().min(0).max(86_400_000).optional(),
  sessionKey: trimmed.max(64).optional().or(z.literal('')),
});
export type ScoreInput = z.infer<typeof scoreSchema>;

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Coerce a checkbox or "on"/"true"/"1" into a boolean. */
export const toBool = (v: FormDataEntryValue | null | undefined): boolean => {
  if (v === null || v === undefined) return false;
  const s = String(v).toLowerCase();
  return s === 'on' || s === 'true' || s === '1' || s === 'yes';
};

/** Empty string -> undefined, so optional DB columns stay null. */
export const optional = <T extends z.ZodTypeAny>(schema: T, v: unknown) => {
  const parsed = schema.safeParse(v);
  if (!parsed.success) return undefined;
  const value = parsed.data as unknown;
  return value === '' ? undefined : (value as z.infer<T>);
};
