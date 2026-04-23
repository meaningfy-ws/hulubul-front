"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Role, SignupSection } from "@/lib/types";
import {
  clearRememberedIdentity,
  readRemembered,
  saveRemembered,
} from "@/lib/remember-me";

type Status = "idle" | "submitting" | "success" | "error";

const ROLES: readonly Role[] = ["expeditor", "transportator", "ambele"] as const;

function parseRole(value: string | null, fallback: Role): Role {
  if (value && (ROLES as readonly string[]).includes(value)) return value as Role;
  return fallback;
}

export function SignupForm({ data }: { data: SignupSection }) {
  const searchParams = useSearchParams();
  const defaultRole = data.roleDefault ?? "expeditor";
  const initialRole = useMemo(
    () => parseRole(searchParams?.get("role") ?? null, defaultRole),
    [searchParams, defaultRole],
  );

  const [role, setRole] = useState<Role>(initialRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [routes, setRoutes] = useState("");
  const [remember, setRemember] = useState(true);
  const [hasPrefill, setHasPrefill] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Prefill from localStorage on mount. Purely client-side; the server
  // rendered this form with empty values, which is correct (SSR cannot
  // see localStorage, and we don't want a hydration mismatch).
  useEffect(() => {
    const remembered = readRemembered();
    if (remembered) {
      setName(remembered.name);
      setEmail(remembered.email);
      if (remembered.whatsapp) setWhatsapp(remembered.whatsapp);
      setRemember(true);
      setHasPrefill(true);
    }
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
    setStatus("submitting");
    setErrorMessage(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedWhatsapp = whatsapp.trim();
    const trimmedRoutes = routes.trim();

    const payload: Record<string, string> = {
      name: trimmedName,
      email: trimmedEmail,
      role,
      routes: trimmedRoutes,
    };
    if (trimmedWhatsapp) payload.whatsapp = trimmedWhatsapp;

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
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
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "A apărut o eroare. Încearcă din nou, te rog.",
      );
    }
  }

  if (status === "success") {
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

  // CMS exposes `contactLabel`/`routeLabel` from the old single-field design.
  // For the new schema (email + whatsapp + routes) we prefer explicit field
  // labels so the editor doesn't need to remember that `contactLabel` really
  // means the email field. Fall back to the CMS value only where it still fits.
  const emailLabel = data.contactLabel?.toLowerCase().includes("email")
    ? "Email"
    : "Email";
  const emailPlaceholder = "email@exemplu.com";
  const whatsappPlaceholder = "+373 600 00 000";
  const routesLabel = data.routeLabel ?? "Rutele care te interesează";
  const routesPlaceholder =
    data.routePlaceholder ?? "Ex: Luxembourg - Chișinău, Milano - Chișinău";

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="form-group">
        <div className="form-label-row">
          <label htmlFor="waitlist-name">
            {data.nameLabel}
            {data.nameHint ? <span className="hint">{data.nameHint}</span> : null}
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
          {emailLabel}
          <span className="hint">Aici îți trimitem anunțul de lansare.</span>
        </label>
        <input
          id="waitlist-email"
          name="email"
          type="email"
          placeholder={emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <div className="form-group">
        <label htmlFor="waitlist-whatsapp">
          WhatsApp
          <span className="hint">Opțional — mai rapid pentru anunțuri scurte.</span>
        </label>
        <input
          id="waitlist-whatsapp"
          name="whatsapp"
          type="tel"
          placeholder={whatsappPlaceholder}
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          autoComplete="tel"
        />
      </div>

      <div className="form-group">
        <label>{data.roleLabel}</label>
        <div className="radio-group" role="radiogroup">
          {data.roleOptions.map((option) => {
            const id = `waitlist-role-${option.value}`;
            return (
              <div key={option.id} className="radio-option">
                <input
                  id={id}
                  type="radio"
                  name="role"
                  value={option.value}
                  checked={role === option.value}
                  onChange={() => setRole(option.value)}
                />
                <label htmlFor={id}>{option.label}</label>
              </div>
            );
          })}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="waitlist-routes">
          {routesLabel}
          <span className="hint">Una sau mai multe, separate prin virgulă.</span>
        </label>
        <input
          id="waitlist-routes"
          name="routes"
          type="text"
          placeholder={routesPlaceholder}
          value={routes}
          onChange={(e) => setRoutes(e.target.value)}
          required
        />
      </div>

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

      <button
        type="submit"
        className="form-submit"
        disabled={status === "submitting"}
      >
        {status === "submitting" ? "Se înscrie..." : data.submitLabel}
      </button>

      {data.privacyNote ? (
        <p className="form-footer">{data.privacyNote}</p>
      ) : null}

      {status === "error" && errorMessage ? (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
