// ─── Neon Arcade · Server action result envelope ───────────────────────────────
// Every mutation returns this shape so client forms can render field-level
// errors instead of throwing. `ok: false` always carries `errors` keyed by
// field name (or `form` for a whole-form problem).

export type FieldErrors = Record<string, string>;

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; message: string; errors: FieldErrors };

export const ok = <T>(data?: T): ActionResult<T> =>
  ({ ok: true, data }) as ActionResult<T>;

export const fail = (message: string, errors: FieldErrors = {}): ActionResult<never> => ({
  ok: false,
  message,
  errors,
});

/** Flatten a ZodError into { field: firstMessage }. */
export const fieldErrorsFrom = (error: {
  issues: { path: (string | number | symbol)[]; message: string }[];
}): FieldErrors =>
  error.issues.reduce<FieldErrors>((acc, issue) => {
    const key = String(issue.path[0] ?? 'form');
    if (!acc[key]) acc[key] = issue.message;
    return acc;
  }, {});

export const firstMessage = (error: {
  issues: { message: string }[];
}): string => error.issues[0]?.message ?? 'Something went wrong';

/** Uniform handler for Prisma's known unique-constraint error. */
export const describeDbError = (error: unknown): string => {
  const code = (error as { code?: string } | null)?.code;
  if (code === 'P2002') return 'That value is already taken.';
  if (code === 'P2025') return 'That record no longer exists.';
  if (code === 'P2003') return 'That change would break a related record.';
  if (typeof (error as { message?: string })?.message === 'string') {
    return 'The database rejected that change.';
  }
  return 'Something went wrong. Please try again.';
};