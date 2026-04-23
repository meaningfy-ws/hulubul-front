import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { server } from "./msw/server";

// jsdom 25 ships an incomplete Storage on window.localStorage (getItem/setItem
// are undefined in some setups). Install a Map-backed polyfill when that's the
// case — real browsers are unaffected because the guard only kicks in when
// `setItem` is missing.
if (
  typeof window !== "undefined" &&
  (!window.localStorage || typeof window.localStorage.setItem !== "function")
) {
  const createStorage = (): Storage => {
    const store = new Map<string, string>();
    return {
      get length() {
        return store.size;
      },
      key(i) {
        return Array.from(store.keys())[i] ?? null;
      },
      getItem(k) {
        return store.has(k) ? store.get(k)! : null;
      },
      setItem(k, v) {
        store.set(k, String(v));
      },
      removeItem(k) {
        store.delete(k);
      },
      clear() {
        store.clear();
      },
    };
  };
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: createStorage(),
  });
  Object.defineProperty(window, "sessionStorage", {
    configurable: true,
    value: createStorage(),
  });
}

// jsdom doesn't implement matchMedia or IntersectionObserver — stub both.
if (typeof window !== "undefined") {
  if (!window.matchMedia) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }
  class IO {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
    root = null;
    rootMargin = "";
    thresholds = [];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).IntersectionObserver = IO;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).IntersectionObserver = IO;
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
