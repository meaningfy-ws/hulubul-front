export const UTM_STORAGE_KEY = "hulubul:utm";

export interface UtmCapture {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
  referrer?: string;
}

const KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
] as const;

function clip(v: string, max: number): string {
  return v.length > max ? v.slice(0, max) : v;
}

export function captureUtmFromUrl(search: string, referrer: string): void {
  if (typeof window === "undefined") return;
  if (window.sessionStorage.getItem(UTM_STORAGE_KEY)) return;

  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const out: UtmCapture = {};
  for (const k of KEYS) {
    const v = params.get(k);
    if (v) out[k] = clip(v, 256);
  }
  if (referrer) out.referrer = clip(referrer, 2048);

  if (Object.keys(out).length === 0) return;
  window.sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(out));
}

export function readStoredUtm(): UtmCapture | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = window.sessionStorage.getItem(UTM_STORAGE_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as UtmCapture;
  } catch {
    return undefined;
  }
}
