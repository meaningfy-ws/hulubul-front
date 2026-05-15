/**
 * Romanian long-date formatting for editorial pages.
 *
 * Strapi sends `lastUpdated` as an ISO `date`; the page renders it inline
 * ("Ultima actualizare: 14 mai 2026."). The build-time fallback already
 * stores a display string, so a non-ISO input is returned unchanged
 * rather than rendered as "Invalid Date".
 */

const RO_LONG_DATE = new Intl.DateTimeFormat("ro-RO", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatRoDate(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (raw === "") return "";
  const ts = Date.parse(raw);
  if (Number.isNaN(ts)) return raw;
  return RO_LONG_DATE.format(new Date(ts));
}
