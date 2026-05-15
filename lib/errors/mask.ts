/**
 * PII redaction for logs and the browser console. Pure — no I/O.
 *
 * Keeps just enough to correlate a report with a person (first local
 * char + domain) without writing a full address into logs the user can
 * see in their devtools.
 */

export function maskEmail(email: string): string {
  if (typeof email !== "string") return "***";
  const normalized = email.trim().toLowerCase();
  const at = normalized.indexOf("@");
  // Reject anything that isn't `local@domain.tld`.
  if (at <= 0 || at === normalized.length - 1) return "***";
  const domain = normalized.slice(at + 1);
  if (!domain.includes(".")) return "***";
  return `${normalized[0]}***@${domain}`;
}
