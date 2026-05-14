"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import {
  initialState,
  needsBanner,
  readConsent,
  subscribe,
  writeConsent,
} from "@/lib/consent/store";
import type { ConsentChoice, ConsentState } from "@/lib/consent/store";

interface ConsentContextValue {
  state: ConsentState;
  needsBanner: boolean;
  setChoice: (choice: ConsentChoice) => ConsentState;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

/**
 * SSR-safe provider for the consent state.
 *
 * `useSyncExternalStore` ensures the server and the client agree on
 * the first render: both see `initialState()` (no choice yet, all
 * non-essential denied). After hydration the client reconciles with
 * the actual stored value via the `getSnapshot` callback. No hydration
 * mismatch.
 *
 * Subscribers (e.g. `<Analytics>`) react to `setChoice` calls via the
 * store's pub/sub.
 */
export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(
    subscribe,
    readConsent, // client snapshot
    initialState, // server snapshot
  );

  const setChoice = useCallback((choice: ConsentChoice) => {
    return writeConsent(choice);
  }, []);

  const value: ConsentContextValue = {
    state,
    needsBanner: needsBanner(state),
    setChoice,
  };

  return (
    <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
  );
}

/**
 * Hook for any component that needs to read consent state or react to
 * it. Throws if used outside `<ConsentProvider>` so wiring bugs are
 * loud rather than silent.
 */
export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error("useConsent must be used inside <ConsentProvider>");
  }
  return ctx;
}
