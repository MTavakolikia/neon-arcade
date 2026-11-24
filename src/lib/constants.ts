// ─── Neon Arcade · Domain constants ───────────────────────────────────────────
// Single source of truth shared by Prisma, Zod validators, server actions and UI.
// Keep in sync with the enums in prisma/schema.prisma.

export const ROLES = ['PLAYER', 'EDITOR', 'ADMIN'] as const
export type Role = (typeof ROLES)[number]

export const USER_STATUSES = ['ACTIVE', 'SUSPENDED'] as const
export type UserStatus = (typeof USER_STATUSES)[number]

export const POST_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const
export type PostStatus = (typeof POST_STATUSES)[number]

export const PRODUCT_TYPES = ['DIGITAL', 'PHYSICAL'] as const
export type ProductType = (typeof PRODUCT_TYPES)[number]

export const PRODUCT_STATUSES = ['ACTIVE', 'HIDDEN', 'SOLD_OUT'] as const
export type ProductStatus = (typeof PRODUCT_STATUSES)[number]

export const ORDER_STATUSES = ['PENDING', 'PAID', 'FULFILLED', 'CANCELLED', 'REFUNDED'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const DIFFICULTIES = ['easy', 'normal', 'hard'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

export const GAME_IDS = ['memory', 'fruit', 'simon', '2048', 'mole'] as const
export type GameId = (typeof GAME_IDS)[number]

// ─── Role hierarchy ───────────────────────────────────────────────────────────

const RANK: Record<Role, number> = { PLAYER: 0, EDITOR: 1, ADMIN: 2 }

export const atLeast = (role: Role | undefined | null, min: Role): boolean =>
  RANK[role ?? 'PLAYER'] >= RANK[min]

export const isStaff = (role: Role | undefined | null): boolean => atLeast(role, 'EDITOR')
export const isAdmin = (role: Role | undefined | null): boolean => atLeast(role, 'ADMIN')

// Staff can manage content; only admins can manage users and orders.
export const CAN = {
  viewAdmin: isStaff,
  managePosts: isStaff,
  manageShop: isStaff,
  manageUsers: isAdmin,
  manageOrders: isAdmin,
} as const

export const ROLE_LABELS: Record<Role, string> = {
  PLAYER: 'Player',
  EDITOR: 'Editor',
  ADMIN: 'Admin',
}

export const STATUS_LABELS: Record<Uppercase<string>, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
  ACTIVE: 'Active',
  HIDDEN: 'Hidden',
  SOLD_OUT: 'Sold out',
  PENDING: 'Pending',
  PAID: 'Paid',
  FULFILLED: 'Fulfilled',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
  SUSPENDED: 'Suspended',
  PLAYER: 'Player',
  EDITOR: 'Editor',
  ADMIN: 'Admin',
}

// ─── Formatting ───────────────────────────────────────────────────────────────

export const centsToUsd = (cents: number): string =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })

export const formatDate = (d: Date | string | null | undefined): string => {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export const formatDateTime = (d: Date | string | null | undefined): string => {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Tolerant JSON array parse — the DB stores String[] as a JSON string. */
export const parseTags = (raw: string | null | undefined): string[] => {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

export const slugify = (input: string): string =>
  input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'untitled'

/** Deterministic order numbers, e.g. NA-20260101-4F2K9 */
export const makeOrderNumber = (now = new Date()): string => {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase()
  return `NA-${y}${m}${d}-${rand}`
}
