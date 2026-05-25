"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { SignupSection } from "@/lib/types";
import { WAITLIST_ROLES, parseRoleIn, type WaitlistRole as Role } from "@/lib/roles";
import {
  clearRememberedIdentity,
  readRemembered,
  saveRemembered,
} from "@/lib/remember-me";
import { CitiesQuestion } from "@/components/landing/CitiesQuestion";
import {
  GdprConsent,
  type GdprConsentValue,
} from "@/components/landing/GdprConsent";
import { captureUtmFromUrl, readStoredUtm } from "@/lib/utm";
import { GDPR_CONSENT_VERSION } from "@/lib/gdpr-consent";
import { requestLocation, type LocationGranted } from "@/lib/geolocation";
import { humanizeFormError } from "@/lib/form-errors";
import { parseErrorResponse, reportClientError } from "@/lib/errors/report";
import { ErrorCode } from "@/lib/errors/codes";
import { validationMessage } from "@/lib/errors/messages";
import { FORM_STATUS, type FormStatus } from "@/lib/form-status";
import { trackWaitlistSubmit } from "@/lib/tracking/events";
import { useConsent } from "@/components/consent/ConsentProvider";
import type { AuthProvider } from "@/lib/auth-providers";
import { verifiedTag } from "@/lib/auth-copy";

// Defensive fallback: stale links shared in the wild can have the malformed
// shape `/#signup?role=X` (query embedded in the fragment). Parse it so the
// role still lands in the form even though `useSearchParams()` returns nothing.
function parseRoleFromFragment(hash: string): string | null {
  const qIndex = hash.indexOf("?");
  if (qIndex < 0) return null;
  const params = new URLSearchParams(hash.slice(qIndex + 1));
  return params.get("role");
}

interface LocationState {
  consent: "granted" | "denied" | "not_asked";
  location: LocationGranted | null;
}

interface RoleRadio {
  value: Role;
  label: string;
  icon: string;
}

// Order: sender → receiver → transporter (transporter last per UX call).
const ROLE_OPTIONS_FALLBACK: RoleRadio[] = [
  { value: "expeditor", label: "Trimit pachete", icon: "📤" },
  { value: "destinatar", label: "Primesc pachete", icon: "📥" },
  { value: "transportator", label: "Transport pachete", icon: "🚚" },
];

function resolveRoleOptions(
  cms: { value: Role; label: string; icon?: string }[] | undefined,
): RoleRadio[] {
  // Map CMS entries (when valid) to the v2 trio in the canonical order, falling
  // back per-field to the hardcoded defaults. Stale CMS values like "ambele" are
  // ignored. Editors can override label and icon per role; if either is empty,
  // the fallback fills the gap.
  return ROLE_OPTIONS_FALLBACK.map((fallback) => {
    const match = cms?.find((o) => o.value === fallback.value);
    return {
      value: fallback.value,
      label: match?.label || fallback.label,
      icon: match?.icon || fallback.icon,
    };
  });
}

type Status = FormStatus;

const parseRole = (value: string | null, fallback: Role): Role =>
  parseRoleIn(value, WAITLIST_ROLES, fallback);

export interface SignupFormPrefill {
  email: string;
  name: string;
  emailVerified: boolean;
  provider: AuthProvider;
}

export function SignupForm({
  data,
  initialPrefill,
}: {
  data: SignupSection;
  initialPrefill?: SignupFormPrefill;
}) {
  const searchParams = useSearchParams();
  const consentCtx = useConsent();
  const defaultRole = (data.roleDefault as Role) ?? "expeditor";
  const initialRole = useMemo(
    () => parseRole(searchParams?.get("role") ?? null, defaultRole),
    [searchParams, defaultRole],
  );

  const [role, setRole] = useState<Role>(initialRole);

  useEffect(() => {
    // Hydration step: if the URL is the malformed legacy shape
    // `/#signup?role=X`, useSearchParams won't see the role — recover it from
    // the fragment and scroll the form into view. Safe to run after the
    // server-rendered initial role lands.
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash || !hash.includes("?")) return;
    const fragmentRole = parseRoleFromFragment(hash);
    if (fragmentRole) {
      setRole(parseRole(fragmentRole, defaultRole));
    }
    if (hash.startsWith("#signup")) {
      document.getElementById("signup")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [defaultRole]);
  const [name, setName] = useState(initialPrefill?.name ?? "");
  const [email, setEmail] = useState(initialPrefill?.email ?? "");
  const [whatsapp, setWhatsapp] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [remember, setRemember] = useState(true);
  const [hasPrefill, setHasPrefill] = useState(false);
  const [location, setLocation] = useState<LocationState>({
    consent: "not_asked",
    location: null,
  });
  const [consent, setConsent] = useState<GdprConsentValue>({
    consent: false,
    consentAt: null,
    version: GDPR_CONSENT_VERSION,
  });
  const [status, setStatus] = useState<Status>(FORM_STATUS.Idle);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // "info" for non-failure outcomes the user can't fix by retrying
  // (already registered, rate-limited) — rendered calmly, not as a red error.
  const [errorTone, setErrorTone] = useState<"error" | "info">("error");

  useEffect(() => {
    // Precedence (spec §3.3): an initialPrefill from a fresh Google round-trip
    // wins over the remember-me cookie. Only consult remember-me when no
    // initialPrefill is supplied.
    if (initialPrefill) {
      setHasPrefill(true);
    } else {
      const remembered = readRemembered();
      if (remembered) {
        setName(remembered.name);
        setEmail(remembered.email);
        if (remembered.whatsapp) setWhatsapp(remembered.whatsapp);
        setRemember(true);
        setHasPrefill(true);
      }
    }
    if (typeof window !== "undefined") {
      captureUtmFromUrl(window.location.search, document.referrer);
    }
    // Silent geolocation request — no in-form prompt. The browser shows its
    // native permission dialog the first time; we record the outcome.
    void (async () => {
      const loc = await requestLocation();
      setLocation(
        loc
          ? { consent: "granted", location: loc }
          : { consent: "denied", location: null },
      );
    })();
  }, []);

  function handleClearIdentity() {
    clearRememberedIdentity();
    setName("");
    setEmail("");
    setWhatsapp("");
    setRemember(false);
    setHasPrefill(false);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent.consent) return;
    setStatus(FORM_STATUS.Submitting);
    setErrorMessage(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedWhatsapp = whatsapp.trim();

    // Re-stamp consentAt at submit time to satisfy the backend's 1-hour freshness window.
    const submitConsentAt = new Date().toISOString();

    const payload: Record<string, unknown> = {
      name: trimmedName,
      email: trimmedEmail,
      role,
      cities,
      source: "landing",
      gdprConsent: true,
      gdprConsentAt: submitConsentAt,
      gdprConsentVersion: consent.version,
      locationConsent: location.consent,
      location: location.location,
      client: {
        viewport:
          typeof window !== "undefined"
            ? { w: window.innerWidth, h: window.innerHeight }
            : undefined,
        timezone:
          typeof Intl !== "undefined"
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : undefined,
      },
    };
    if (trimmedWhatsapp) payload.whatsapp = trimmedWhatsapp;

    const utm = readStoredUtm();
    if (utm && Object.keys(utm).length > 0) payload.utm = utm;

    // Tracker-cookie consent passed to the route handler so it can
    // decide whether to dispatch server-side conversions. Optional.
    payload.consent = {
      analytics: consentCtx.state.analytics,
      marketing: consentCtx.state.marketing,
      recordId: consentCtx.state.recordId,
    };

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as
        | { error?: string; event_id?: string }
        | null;
      if (!res.ok) {
        const structured = parseErrorResponse(json);
        if (structured) {
          reportClientError("form/waitlist", structured, {
            email: trimmedEmail,
            endpoint: "/api/waitlist",
          });
          setStatus(FORM_STATUS.Error);
          setErrorTone(
            structured.code === ErrorCode.AlreadyRegistered ||
              structured.code === ErrorCode.RateLimited
              ? "info"
              : "error",
          );
          // For validation failures, show exactly which fields are wrong
          // (the server sends per-field Romanian messages) instead of the
          // generic "check the form" copy.
          const specific =
            structured.code === ErrorCode.ClientValidation
              ? validationMessage(structured.details)
              : null;
          setErrorMessage(specific ?? structured.message);
          return;
        }
        throw new Error(json?.error ?? `Request failed (${res.status})`);
      }
      if (remember) {
        saveRemembered({
          name: trimmedName,
          email: trimmedEmail,
          whatsapp: trimmedWhatsapp || undefined,
        });
      } else {
        clearRememberedIdentity();
      }
      // Tracking event — gated downstream by analytics consent in <Analytics>.
      // event_id is echoed by the route handler so the browser-side and
      // (eventual) server-side conversion events dedupe at the platform.
      if (json?.event_id) {
        trackWaitlistSubmit(role, "landing", json.event_id);
      }
      setStatus(FORM_STATUS.Success);
    } catch (error) {
      setStatus(FORM_STATUS.Error);
      setErrorTone("error");
      setErrorMessage(
        humanizeFormError(
          error,
          "A apărut o eroare. Încearcă din nou, te rog.",
        ),
      );
    }
  }

  if (status === FORM_STATUS.Success) {
    function goToSurvey() {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("hulubul:from-waitlist", "1");
      }
    }
    return (
      <div className="form-success" role="status">
        <div className="success-icon" aria-hidden="true">
          ✓
        </div>
        <h3>{data.successTitle}</h3>
        <p>{data.successMessage}</p>
        <div className="form-success-cta">
          <Link
            href="/sondaj/expeditori"
            className="cta-primary"
            onClick={goToSurvey}
          >
            Împărtășește experiența ta de expeditor (3 min)
          </Link>
          <p className="form-success-secondary">
            <Link href="/">Rămâi pe pagina principală</Link>
          </p>
        </div>
      </div>
    );
  }

  const submitDisabled = status === FORM_STATUS.Submitting || !consent.consent;

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="form-group">
        <div className="form-label-row">
          <label htmlFor="waitlist-name">
            {data.nameLabel}
            {data.nameHint ? (
              <span className="hint">{data.nameHint}</span>
            ) : null}
          </label>
          {hasPrefill ? (
            <button
              type="button"
              className="form-identity-clear"
              onClick={handleClearIdentity}
            >
              Nu ești tu? Șterge.
            </button>
          ) : null}
        </div>
        <input
          id="waitlist-name"
          name="name"
          type="text"
          placeholder={data.namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="waitlist-email">
          Email
          <span className="hint">Aici îți trimitem anunțul de lansare.</span>
          {initialPrefill?.emailVerified ? (
            <span className="form-verified-tag" data-provider={initialPrefill.provider}>
              {verifiedTag(initialPrefill.provider)}
            </span>
          ) : null}
        </label>
        <input
          id="waitlist-email"
          name="email"
          type="email"
          placeholder="email@exemplu.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          readOnly={Boolean(initialPrefill)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="waitlist-whatsapp">
          WhatsApp
          <span className="hint">
            Opțional — mai rapid pentru anunțuri scurte.
          </span>
        </label>
        <input
          id="waitlist-whatsapp"
          name="whatsapp"
          type="tel"
          placeholder="+373 600 00 000"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          autoComplete="tel"
        />
      </div>

      <fieldset className="form-group role-fieldset">
        <legend>{data.roleLabel}</legend>
        <div className="radio-group">
          {resolveRoleOptions(data.roleOptions).map((option) => {
            const id = `waitlist-role-${option.value}`;
            return (
              <div key={option.value} className="radio-option">
                <input
                  id={id}
                  type="radio"
                  name="role"
                  value={option.value}
                  checked={role === option.value}
                  onChange={() => setRole(option.value)}
                />
                <label htmlFor={id}>
                  <span className="role-icon" aria-hidden="true">
                    {option.icon}
                  </span>
                  <span className="role-label-text">{option.label}</span>
                </label>
              </div>
            );
          })}
        </div>
      </fieldset>

      <CitiesQuestion role={role} value={cities} onChange={setCities} />

      <div className="form-remember">
        <input
          id="waitlist-remember"
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
        />
        <label htmlFor="waitlist-remember">
          Reține-mă pe acest dispozitiv
          <span className="hint">
            Data viitoare găsești formularul deja completat. Datele rămân doar
            aici — le poți șterge oricând.
          </span>
        </label>
      </div>

      <GdprConsent onChange={setConsent} />

      <button
        type="submit"
        className="form-submit"
        disabled={submitDisabled}
      >
        {status === FORM_STATUS.Submitting ? "Se înscrie..." : data.submitLabel}
      </button>

      {data.privacyNote ? (
        <p className="form-footer">{data.privacyNote}</p>
      ) : null}

      {status === FORM_STATUS.Error && errorMessage ? (
        <p
          className={
            errorTone === "info" ? "form-error form-error--info" : "form-error"
          }
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
