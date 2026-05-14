import { CURRENT_CONSENT_VERSION } from "./version";
import type { ConsentChoice, ConsentState } from "./types";

export { CURRENT_CONSENT_VERSION };
export type { ConsentChoice, ConsentDecision, ConsentState } from "./types";

export const CONSENT_STORAGE_KEY = "hulubul:consent:v1";

type Listener = (state: ConsentState) => void;

const listeners = new Set<Listener>();

// React's `useSyncExternalStore` requires `getSnapshot` and
// `getServerSnapshot` to return the SAME reference between calls when
// nothing has changed — otherwise the hook detects a "store mutation"
// every render and infinite-loops.
//
// We hold a frozen default singleton + a cached client snapshot that
// only refreshes when `writeConsent` runs. The snapshot is invalidated
// at module scope (subscribers fire after the cache update).

const FROZEN_INITIAL_STATE: ConsentState = Object.freeze({
  necessary: true as const,
  analytics: "denied",
  marketing: "denied",
  version: CURRENT_CONSENT_VERSION,
  choseAt: null,
}) as ConsentState;

let cachedSnapshot: ConsentState | null = null;

/**
 * The default state for a visitor who hasn't yet made a choice on the
 * current banner version. All non-essential categories are denied —
 * required by GDPR (consent must be opt-in, not opt-out) and by
 * Google Consent Mode v2 (default state must be sent before any
 * tracker fires).
 *
 * Returns the same frozen reference every call — required for
 * `useSyncExternalStore`'s server snapshot.
 */
export function initialState(): ConsentState {
  return FROZEN_INITIAL_STATE;
}

function isValidStored(record: unknown): record is ConsentState {
  if (!record || typeof record !== "object") return false;
  const r = record as Record<string, unknown>;
  return (
    r.necessary === true &&
    (r.analytics === "granted" || r.analytics === "denied") &&
    (r.marketing === "granted" || r.marketing === "denied") &&
    typeof r.version === "string" &&
    (r.choseAt === null || typeof r.choseAt === "string")
  );
}

/**
 * Reads the current consent state from localStorage. Returns
 * `initialState()` when localStorage is empty, the JSON is malformed,
 * or the stored version is older than the current banner copy.
 *
 * SSR-safe: returns `initialState()` when `window` is undefined so
 * `<ConsentProvider>` produces the same first-render output on the
 * server and on the client (no hydration mismatch).
 */
export function readConsent(): ConsentState {
  if (cachedSnapshot) return cachedSnapshot;
  cachedSnapshot = computeFromStorage();
  return cachedSnapshot;
}

/**
 * Test-only: reset the in-module snapshot cache so a test that mutates
 * localStorage directly observes the new value on the next
 * `readConsent`. Production code never calls this.
 */
export function __resetConsentCache(): void {
  cachedSnapshot = null;
}

function computeFromStorage(): ConsentState {
  if (typeof window === "undefined") return initialState();
  const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
  if (!raw) return initialState();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return initialState();
  }
  if (!isValidStored(parsed)) return initialState();
  if (parsed.version !== CURRENT_CONSENT_VERSION) return initialState();
  return parsed;
}

/**
 * True when the visitor needs to be shown the banner — either no
 * choice yet, or the banner copy has been versioned since.
 */
export function needsBanner(state: ConsentState): boolean {
  return state.choseAt === null || state.version !== CURRENT_CONSENT_VERSION;
}

/**
 * Persists a new consent state and notifies subscribers. Returns the
 * resulting state so callers can use it directly.
 */
export function writeConsent(choice: ConsentChoice): ConsentState {
  const next: ConsentState = {
    necessary: true,
    analytics: choice.analytics,
    marketing: choice.marketing,
    version: CURRENT_CONSENT_VERSION,
    choseAt: new Date().toISOString(),
  };
  // Update the cached snapshot first so the next `readConsent()` (e.g.
  // from `useSyncExternalStore` triggered by the listener loop below)
  // returns the new reference.
  cachedSnapshot = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage can be disabled / quota-exceeded; consent UX still
      // proceeds, just without persistence. Banner will re-prompt next visit.
    }
  }
  for (const listener of listeners) listener(next);
  return next;
}

/**
 * Subscribe to consent changes. Returns an unsubscribe function.
 * Used by `<Analytics>` to react to `Accept all` / `Withdraw all`
 * without prop drilling through the layout.
 */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
