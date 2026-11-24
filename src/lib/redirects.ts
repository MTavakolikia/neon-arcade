// ─── Neon Arcade · Redirect helpers ────────────────────────────────────────────
// Only ever redirect to a path on this site. Guards against open-redirect via
// ?returnTo=https://evil.example and against protocol-relative //evil.example.

const SAFE = /^\/(?!\/)[A-Za-z0-9._~\-/?=&%+#]*$/;

export function sanitizeReturnTo(value: string | null | undefined, fallback = '/'): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!SAFE.test(trimmed)) return fallback;
  // Block anything that could be interpreted as a scheme.
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return fallback;
  return trimmed;
}