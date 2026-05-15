/**
 * User-facing Romanian copy keyed by {@link ErrorCode}. Pure — no I/O.
 *
 * The route builds the message server-side and ships it in the response
 * envelope, so the client renders it verbatim and there is exactly one
 * source of truth for wording (no string-sniffing on the client).
 */

import { ErrorCode } from "./codes";

export interface MessageContext {
  /** ISO timestamp of the original registration (ALREADY_REGISTERED). */
  registeredAt?: string;
}

/** One field-level validation problem (CLIENT_VALIDATION `details`). */
export interface ValidationIssue {
  field: string;
  message: string;
}

/**
 * Turns the structured `CLIENT_VALIDATION` details into a single,
 * user-readable Romanian sentence (the Zod messages are already human).
 * Returns null when there's nothing usable so callers fall back to the
 * generic copy. Pure.
 */
export function validationMessage(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  const issues = (details as { issues?: unknown }).issues;
  if (!Array.isArray(issues) || issues.length === 0) return null;
  const messages = issues
    .map((i) =>
      i && typeof (i as ValidationIssue).message === "string"
        ? (i as ValidationIssue).message.trim()
        : "",
    )
    .filter((m) => m.length > 0);
  if (messages.length === 0) return null;
  return [...new Set(messages)].join(" ");
}

/** Formats an ISO date as DD/MM/YYYY, or null if it isn't a valid date. */
function formatRoDate(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function messageForCode(
  code: ErrorCode,
  ctx: MessageContext = {},
): string {
  switch (code) {
    case ErrorCode.AlreadyRegistered: {
      const date = formatRoDate(ctx.registeredAt);
      return date
        ? `Ești deja înscris cu acest email pe ${date}. Te anunțăm noi imediat ce avem vești — mulțumim pentru răbdare!`
        : "Ești deja înscris cu acest email. Te anunțăm noi imediat ce avem vești — mulțumim pentru răbdare!";
    }
    case ErrorCode.UpstreamDown:
      return "Serverul nu răspunde momentan. Te rugăm să încerci din nou mai târziu.";
    case ErrorCode.RateLimited:
      return "Prea multe încercări într-un timp scurt. Așteaptă un minut și încearcă din nou.";
    case ErrorCode.UpstreamValidation:
      return "Datele trimise nu au putut fi procesate. Verifică formularul și încearcă din nou.";
    case ErrorCode.ClientValidation:
      return "Verifică câmpurile formularului și încearcă din nou.";
    case ErrorCode.NotFound:
      return "Resursa cerută nu a fost găsită. Reîncarcă pagina și încearcă din nou.";
    case ErrorCode.AuthMisconfig:
    case ErrorCode.Unknown:
      return "A apărut o eroare neașteptată. Te rugăm să încerci din nou peste câteva minute.";
  }
}
