/**
 * Client-side "remember me" store for waitlist-form prefill.
 *
 * Contract: see `design/epic-signup/remember-me.md`.
 *
 * HANDSHAKE with the forthcoming Zitadel auth epic
 * (`design/epic-signup/login.md`): the sign-in success handler MUST call
 * `clearRememberedIdentity()` to avoid stale prefill once the user has a
 * real session. Do not remove `clearRememberedIdentity` from the exports.
 */

export const REMEMBER_STORAGE_KEY = "hulubul:remember";
const SCHEMA_VERSION = 2 as const;
const TTL_MS = 365 * 24 * 60 * 60 * 1000;

// v1 → v2 migration (2026-04-24): v1 stored `contact` (single string). v2
// stores `email` + optional `whatsapp` to match the updated waitlist-submission
// schema. Old v1 entries read back as null (safe drop; users re-enter once).

export interface RememberedIdentity {
  v: typeof SCHEMA_VERSION;
  name: string;
  email: string;
  whatsapp?: string;
  savedAt: string;
}

function safeLocalStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function isRememberedIdentity(value: unknown): value is RememberedIdentity {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.v === SCHEMA_VERSION &&
    typeof v.name === "string" &&
    typeof v.email === "string" &&
    typeof v.savedAt === "string" &&
    (v.whatsapp === undefined || typeof v.whatsapp === "string")
  );
}

export function readRemembered(): RememberedIdentity | null {
  const storage = safeLocalStorage();
  if (!storage) return null;

  let raw: string | null;
  try {
    raw = storage.getItem(REMEMBER_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRememberedIdentity(parsed)) return null;

  const savedAtMs = Date.parse(parsed.savedAt);
  if (Number.isNaN(savedAtMs)) return null;
  if (Date.now() - savedAtMs > TTL_MS) {
    try {
      storage.removeItem(REMEMBER_STORAGE_KEY);
    } catch {
      // best-effort; don't bubble
    }
    return null;
  }

  return parsed;
}

export function saveRemembered(
  input: Pick<RememberedIdentity, "name" | "email"> &
    Partial<Pick<RememberedIdentity, "whatsapp">>,
): void {
  const storage = safeLocalStorage();
  if (!storage) return;

  const trimmedWhatsapp = input.whatsapp?.trim();
  const payload: RememberedIdentity = {
    v: SCHEMA_VERSION,
    name: input.name.trim(),
    email: input.email.trim(),
    ...(trimmedWhatsapp ? { whatsapp: trimmedWhatsapp } : {}),
    savedAt: new Date().toISOString(),
  };

  try {
    storage.setItem(REMEMBER_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // QuotaExceededError / SecurityError — silent fail is correct,
    // remember-me is a convenience, not a contract.
  }
}

export function clearRememberedIdentity(): void {
  const storage = safeLocalStorage();
  if (!storage) return;
  try {
    storage.removeItem(REMEMBER_STORAGE_KEY);
  } catch {
    // best-effort
  }
}
