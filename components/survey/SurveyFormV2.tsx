"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { maxSelections } from "@/lib/survey-schema-v2";
import type {
  DecisionCriterionV2,
  DifficultyV2,
  HowFindV2,
  SearchDurationV2,
  SendingFrequencyV2,
  SurveyPayloadV2,
  SwitchReasonV2,
  TestingOptInV2,
  TrustSignalV2,
} from "@/lib/survey-schema-v2";
import { readRemembered } from "@/lib/remember-me";
import { humanizeFormError } from "@/lib/form-errors";
import { FORM_STATUS, type FormStatus } from "@/lib/form-status";
import { trackEvent } from "@/lib/tracking/events";
import { useConsent } from "@/components/consent/ConsentProvider";
import { CityTagInput } from "@/components/routes/CityTagInput";
import { resolveSurveyV2Locale, SURVEY_V2_COPY } from "./labels-v2";

type Status = FormStatus;

/** Toggles `value` in `list`, but never grows past `max` selections. */
function toggleCapped<T>(list: T[], value: T, max: number): T[] {
  if (list.includes(value)) return list.filter((x) => x !== value);
  if (list.length >= max) return list;
  return [...list, value];
}

export function SurveyFormV2() {
  const searchParams = useSearchParams();
  const consentCtx = useConsent();
  const copy = SURVEY_V2_COPY[resolveSurveyV2Locale(searchParams?.get("lang") ?? null)];

  // Identity
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Route
  const [routeCities, setRouteCities] = useState<string[]>([]);

  // Q1-Q9
  const [sendingFrequency, setSendingFrequency] = useState<SendingFrequencyV2 | "">("");
  const [howFindTransporter, setHowFindTransporter] = useState<HowFindV2[]>([]);
  const [howFindTransporterOther, setHowFindTransporterOther] = useState("");
  const [searchDuration, setSearchDuration] = useState<SearchDurationV2 | "">("");
  const [difficulties, setDifficulties] = useState<DifficultyV2[]>([]);
  const [difficultiesOther, setDifficultiesOther] = useState("");
  const [decisionCriteria, setDecisionCriteria] = useState<DecisionCriterionV2[]>([]);
  const [decisionCriteriaOther, setDecisionCriteriaOther] = useState("");
  const [trustSignals, setTrustSignals] = useState<TrustSignalV2[]>([]);
  const [trustSignalsOther, setTrustSignalsOther] = useState("");
  const [switchReasons, setSwitchReasons] = useState<SwitchReasonV2[]>([]);
  const [switchReasonsOther, setSwitchReasonsOther] = useState("");
  const [mostImportantThing, setMostImportantThing] = useState("");
  const [wantsToTest, setWantsToTest] = useState<TestingOptInV2 | "">("");
  const [testPhone, setTestPhone] = useState("");
  const [testConsent, setTestConsent] = useState(false);

  const [status, setStatus] = useState<Status>(FORM_STATUS.Idle);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // The form carries `noValidate` (see below) so the browser's own English
  // validation bubbles never show — this tracks every question's validity
  // ourselves, in Romanian, for a per-field highlight + inline message.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function clearFieldError(key: string) {
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    // Native HTML `required` exists on these inputs for accessibility
    // semantics, but the form carries `noValidate` so the browser's own
    // (English) validation bubble never shows — every message here is ours.
    if (!name.trim()) {
      errors.name = "Numele este obligatoriu.";
    }
    if (!email.trim()) {
      errors.email = "Email-ul este obligatoriu.";
    }
    if (routeCities.length !== 2) {
      errors.routeCities = "Adaugă orașul de plecare și cel de destinație.";
    }
    if (!sendingFrequency) {
      errors.sendingFrequency = "Selectează un răspuns.";
    }
    if (!searchDuration) {
      errors.searchDuration = "Selectează un răspuns.";
    }
    if (!mostImportantThing.trim()) {
      errors.mostImportantThing = "Te rugăm să completezi acest câmp.";
    }
    if (!wantsToTest) {
      errors.wantsToTest = "Selectează un răspuns.";
    }
    if (howFindTransporter.length === 0) {
      errors.howFindTransporter = "Selectează cel puțin o opțiune.";
    }
    if (difficulties.length === 0) {
      errors.difficulties = "Selectează cel puțin o opțiune.";
    }
    if (decisionCriteria.length === 0) {
      errors.decisionCriteria = "Selectează cel puțin o opțiune.";
    }
    if (trustSignals.length === 0) {
      errors.trustSignals = "Selectează cel puțin o opțiune.";
    }
    if (switchReasons.length === 0) {
      errors.switchReasons = "Selectează cel puțin o opțiune.";
    }
    if (wantsToTest !== "nu" && (!testPhone.trim() || !testConsent)) {
      errors.testConsent =
        "Ai nevoie de un număr de telefon și de acordul de contactare ca să te înscrii la testare.";
    }
    return errors;
  }

  // Prefill identity same as v1: URL params → remember-me → empty.
  useEffect(() => {
    const urlName = searchParams?.get("name");
    const urlEmail = searchParams?.get("email");
    const remembered = readRemembered();
    setName(urlName ?? remembered?.name ?? "");
    setEmail(urlEmail ?? remembered?.email ?? "");
    if (remembered?.whatsapp) setTestPhone(remembered.whatsapp);
  }, [searchParams]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const validationErrors = validate();
    setFieldErrors(validationErrors);
    const firstInvalidKey = Object.keys(validationErrors)[0];
    if (firstInvalidKey) {
      setErrorMessage("Verifică întrebările marcate mai jos.");
      document
        .getElementById(`s2-group-${firstInvalidKey}`)
        ?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      return;
    }

    setStatus(FORM_STATUS.Submitting);

    const payload: SurveyPayloadV2 = {
      name: name.trim(),
      email: email.trim(),
      routeCities,
      sendingFrequency: sendingFrequency as SendingFrequencyV2,
      howFindTransporter,
      ...(howFindTransporterOther.trim()
        ? { howFindTransporterOther: howFindTransporterOther.trim() }
        : {}),
      searchDuration: searchDuration as SearchDurationV2,
      difficulties,
      ...(difficultiesOther.trim() ? { difficultiesOther: difficultiesOther.trim() } : {}),
      decisionCriteria,
      ...(decisionCriteriaOther.trim()
        ? { decisionCriteriaOther: decisionCriteriaOther.trim() }
        : {}),
      trustSignals,
      ...(trustSignalsOther.trim() ? { trustSignalsOther: trustSignalsOther.trim() } : {}),
      switchReasons,
      ...(switchReasonsOther.trim()
        ? { switchReasonsOther: switchReasonsOther.trim() }
        : {}),
      mostImportantThing: mostImportantThing.trim(),
      wantsToTest: wantsToTest as TestingOptInV2,
      ...(wantsToTest !== "nu" && testPhone.trim() ? { testPhone: testPhone.trim() } : {}),
      ...(wantsToTest !== "nu" ? { testConsent } : {}),
      consent: {
        analytics: consentCtx.state.analytics,
        marketing: consentCtx.state.marketing,
        recordId: consentCtx.state.recordId,
      },
    };

    try {
      const res = await fetch("/api/survey-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as
        | { error?: string; path?: string[]; event_id?: string }
        | null;
      if (!res.ok) {
        // Defense in depth: the client-side checks above should already
        // catch anything Strapi/Zod would reject, but if a validation
        // failure still reaches the server, highlight the same field.
        const key = json?.path?.[0];
        if (key) setFieldErrors((prev) => ({ ...prev, [key]: json!.error! }));
        throw new Error(json?.error ?? `Request failed (${res.status})`);
      }
      if (json?.event_id) {
        trackEvent("survey_submit", {
          source: "sender_questionnaire_v2",
          event_id: json.event_id,
        });
      }
      setStatus(FORM_STATUS.Success);
    } catch (error) {
      setStatus(FORM_STATUS.Error);
      setErrorMessage(
        humanizeFormError(error, "A apărut o eroare. Încearcă din nou."),
      );
    }
  }

  if (status === FORM_STATUS.Success) {
    return (
      <div className="form-success" role="status">
        <div className="success-icon" aria-hidden="true">
          ✓
        </div>
        <h3>Mulțumim! Ne ajută enorm.</h3>
        <p>
          Răspunsurile tale modelează platforma înainte să lansăm. Te vom
          anunța pe email când e gata.
        </p>
        <p>
          <Link href="/" className="audience-link">
            ← Înapoi la pagina principală
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="survey-form">
      <section className="survey-section">
        <h2 className="serif survey-section-title">Despre tine</h2>
        <div
          id="s2-group-name"
          className={`form-group${fieldErrors.name ? " field-invalid" : ""}`}
        >
          <label htmlFor="s2-name">Nume</label>
          <input
            id="s2-name"
            type="text"
            className={fieldErrors.name ? "field-invalid" : undefined}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearFieldError("name");
            }}
            required
          />
          {fieldErrors.name ? <p className="field-error-text">{fieldErrors.name}</p> : null}
        </div>
        <div
          id="s2-group-routeCities"
          className={`form-group${fieldErrors.routeCities ? " field-invalid" : ""}`}
        >
          <label htmlFor="s2-route">
            {copy.routeQuestion}
            <span className="hint">{copy.routeHint}</span>
          </label>
          <CityTagInput
            value={routeCities}
            onChange={(cities) => {
              setRouteCities(cities);
              clearFieldError("routeCities");
            }}
            maxCities={2}
            originDestinationLabels
            inputId="s2-route"
          />
          {fieldErrors.routeCities ? (
            <p className="field-error-text">{fieldErrors.routeCities}</p>
          ) : null}
        </div>
      </section>

      <section className="survey-section">
        <div
          id="s2-group-sendingFrequency"
          className={`form-group${fieldErrors.sendingFrequency ? " field-invalid" : ""}`}
        >
          <label>{copy.sendingFrequencyQuestion}</label>
          <div className="radio-group" role="radiogroup">
            {copy.sendingFrequencyOptions.map((o) => {
              const id = `s2-freq-${o.value}`;
              return (
                <div key={o.value} className="radio-option">
                  <input
                    id={id}
                    type="radio"
                    name="sendingFrequency"
                    checked={sendingFrequency === o.value}
                    onChange={() => {
                      setSendingFrequency(o.value);
                      clearFieldError("sendingFrequency");
                    }}
                    required
                  />
                  <label htmlFor={id}>{o.label}</label>
                </div>
              );
            })}
          </div>
          {fieldErrors.sendingFrequency ? (
            <p className="field-error-text">{fieldErrors.sendingFrequency}</p>
          ) : null}
        </div>

        <div
          id="s2-group-howFindTransporter"
          className={`form-group${fieldErrors.howFindTransporter ? " field-invalid" : ""}`}
        >
          <label>
            {copy.howFindQuestion}{" "}
            {copy.maxSelectionsLabel(maxSelections(copy.howFindOptions.length))}
          </label>
          <div className="checkbox-grid">
            {copy.howFindOptions.map((o) => {
              const id = `s2-find-${o.value}`;
              const checked = howFindTransporter.includes(o.value);
              return (
                <label key={o.value} className="checkbox-option" htmlFor={id}>
                  <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setHowFindTransporter(
                        toggleCapped(
                          howFindTransporter,
                          o.value,
                          maxSelections(copy.howFindOptions.length),
                        ),
                      );
                      clearFieldError("howFindTransporter");
                    }}
                  />
                  <span>{o.label}</span>
                </label>
              );
            })}
          </div>
          {fieldErrors.howFindTransporter ? (
            <p className="field-error-text">{fieldErrors.howFindTransporter}</p>
          ) : null}
          {howFindTransporter.includes("altceva") ? (
            <input
              type="text"
              placeholder={copy.otherPlaceholder}
              value={howFindTransporterOther}
              onChange={(e) => setHowFindTransporterOther(e.target.value)}
              className="survey-followup-input"
            />
          ) : null}
        </div>

        <div
          id="s2-group-searchDuration"
          className={`form-group${fieldErrors.searchDuration ? " field-invalid" : ""}`}
        >
          <label>{copy.searchDurationQuestion}</label>
          <div className="radio-group" role="radiogroup">
            {copy.searchDurationOptions.map((o) => {
              const id = `s2-dur-${o.value}`;
              return (
                <div key={o.value} className="radio-option">
                  <input
                    id={id}
                    type="radio"
                    name="searchDuration"
                    checked={searchDuration === o.value}
                    onChange={() => {
                      setSearchDuration(o.value);
                      clearFieldError("searchDuration");
                    }}
                    required
                  />
                  <label htmlFor={id}>{o.label}</label>
                </div>
              );
            })}
          </div>
          {fieldErrors.searchDuration ? (
            <p className="field-error-text">{fieldErrors.searchDuration}</p>
          ) : null}
        </div>

        <div
          id="s2-group-difficulties"
          className={`form-group${fieldErrors.difficulties ? " field-invalid" : ""}`}
        >
          <label>
            {copy.difficultiesQuestion}{" "}
            {copy.maxSelectionsLabel(maxSelections(copy.difficultiesOptions.length))}
          </label>
          <div className="checkbox-grid">
            {copy.difficultiesOptions.map((o) => {
              const id = `s2-diff-${o.value}`;
              const checked = difficulties.includes(o.value);
              return (
                <label key={o.value} className="checkbox-option" htmlFor={id}>
                  <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setDifficulties(
                        toggleCapped(
                          difficulties,
                          o.value,
                          maxSelections(copy.difficultiesOptions.length),
                        ),
                      );
                      clearFieldError("difficulties");
                    }}
                  />
                  <span>{o.label}</span>
                </label>
              );
            })}
          </div>
          {fieldErrors.difficulties ? (
            <p className="field-error-text">{fieldErrors.difficulties}</p>
          ) : null}
          {difficulties.includes("altceva") ? (
            <input
              type="text"
              placeholder={copy.otherPlaceholder}
              value={difficultiesOther}
              onChange={(e) => setDifficultiesOther(e.target.value)}
              className="survey-followup-input"
            />
          ) : null}
        </div>

        <div
          id="s2-group-decisionCriteria"
          className={`form-group${fieldErrors.decisionCriteria ? " field-invalid" : ""}`}
        >
          <label>
            {copy.decisionCriteriaQuestion}{" "}
            {copy.maxSelectionsLabel(maxSelections(copy.decisionCriteriaOptions.length))}
          </label>
          <div className="checkbox-grid">
            {copy.decisionCriteriaOptions.map((o) => {
              const id = `s2-crit-${o.value}`;
              const checked = decisionCriteria.includes(o.value);
              return (
                <label key={o.value} className="checkbox-option" htmlFor={id}>
                  <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setDecisionCriteria(
                        toggleCapped(
                          decisionCriteria,
                          o.value,
                          maxSelections(copy.decisionCriteriaOptions.length),
                        ),
                      );
                      clearFieldError("decisionCriteria");
                    }}
                  />
                  <span>{o.label}</span>
                </label>
              );
            })}
          </div>
          {fieldErrors.decisionCriteria ? (
            <p className="field-error-text">{fieldErrors.decisionCriteria}</p>
          ) : null}
          {decisionCriteria.includes("altceva") ? (
            <input
              type="text"
              placeholder={copy.otherPlaceholder}
              value={decisionCriteriaOther}
              onChange={(e) => setDecisionCriteriaOther(e.target.value)}
              className="survey-followup-input"
            />
          ) : null}
        </div>

        <div
          id="s2-group-trustSignals"
          className={`form-group${fieldErrors.trustSignals ? " field-invalid" : ""}`}
        >
          <label>
            {copy.trustSignalsQuestion}{" "}
            {copy.maxSelectionsLabel(maxSelections(copy.trustSignalsOptions.length))}
          </label>
          <div className="checkbox-grid">
            {copy.trustSignalsOptions.map((o) => {
              const id = `s2-trust-${o.value}`;
              const checked = trustSignals.includes(o.value);
              return (
                <label key={o.value} className="checkbox-option" htmlFor={id}>
                  <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setTrustSignals(
                        toggleCapped(
                          trustSignals,
                          o.value,
                          maxSelections(copy.trustSignalsOptions.length),
                        ),
                      );
                      clearFieldError("trustSignals");
                    }}
                  />
                  <span>{o.label}</span>
                </label>
              );
            })}
          </div>
          {fieldErrors.trustSignals ? (
            <p className="field-error-text">{fieldErrors.trustSignals}</p>
          ) : null}
          {trustSignals.includes("altceva") ? (
            <input
              type="text"
              placeholder={copy.otherPlaceholder}
              value={trustSignalsOther}
              onChange={(e) => setTrustSignalsOther(e.target.value)}
              className="survey-followup-input"
            />
          ) : null}
        </div>

        <div
          id="s2-group-switchReasons"
          className={`form-group${fieldErrors.switchReasons ? " field-invalid" : ""}`}
        >
          <label>
            {copy.switchReasonsQuestion}{" "}
            {copy.maxSelectionsLabel(maxSelections(copy.switchReasonsOptions.length))}
          </label>
          <div className="checkbox-grid">
            {copy.switchReasonsOptions.map((o) => {
              const id = `s2-switch-${o.value}`;
              const checked = switchReasons.includes(o.value);
              return (
                <label key={o.value} className="checkbox-option" htmlFor={id}>
                  <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setSwitchReasons(
                        toggleCapped(
                          switchReasons,
                          o.value,
                          maxSelections(copy.switchReasonsOptions.length),
                        ),
                      );
                      clearFieldError("switchReasons");
                    }}
                  />
                  <span>{o.label}</span>
                </label>
              );
            })}
          </div>
          {fieldErrors.switchReasons ? (
            <p className="field-error-text">{fieldErrors.switchReasons}</p>
          ) : null}
          {switchReasons.includes("altceva") ? (
            <input
              type="text"
              placeholder={copy.otherPlaceholder}
              value={switchReasonsOther}
              onChange={(e) => setSwitchReasonsOther(e.target.value)}
              className="survey-followup-input"
            />
          ) : null}
        </div>

        <div
          id="s2-group-mostImportantThing"
          className={`form-group${fieldErrors.mostImportantThing ? " field-invalid" : ""}`}
        >
          <label htmlFor="s2-most-important">{copy.mostImportantThingQuestion}</label>
          <textarea
            id="s2-most-important"
            rows={3}
            className={fieldErrors.mostImportantThing ? "field-invalid" : undefined}
            value={mostImportantThing}
            onChange={(e) => {
              setMostImportantThing(e.target.value);
              clearFieldError("mostImportantThing");
            }}
            required
          />
          {fieldErrors.mostImportantThing ? (
            <p className="field-error-text">{fieldErrors.mostImportantThing}</p>
          ) : null}
        </div>

        <div
          id="s2-group-wantsToTest"
          className={`form-group${fieldErrors.wantsToTest ? " field-invalid" : ""}`}
        >
          <label>{copy.testingQuestion}</label>
          <div className="radio-group" role="radiogroup">
            {copy.testingOptions.map((o) => {
              const id = `s2-test-${o.value}`;
              return (
                <div key={o.value} className="radio-option">
                  <input
                    id={id}
                    type="radio"
                    name="wantsToTest"
                    checked={wantsToTest === o.value}
                    onChange={() => {
                      setWantsToTest(o.value);
                      clearFieldError("wantsToTest");
                      clearFieldError("testConsent");
                    }}
                    required
                  />
                  <label htmlFor={id}>{o.label}</label>
                </div>
              );
            })}
          </div>
          {fieldErrors.wantsToTest ? (
            <p className="field-error-text">{fieldErrors.wantsToTest}</p>
          ) : null}
        </div>

        {/* Email + phone, deliberately placed together at the end of the form. */}
        <div
          id="s2-group-email"
          className={`form-group${fieldErrors.email ? " field-invalid" : ""}`}
        >
          <label htmlFor="s2-email">Email</label>
          <input
            id="s2-email"
            type="email"
            className={fieldErrors.email ? "field-invalid" : undefined}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearFieldError("email");
            }}
            required
            autoComplete="email"
          />
          {fieldErrors.email ? <p className="field-error-text">{fieldErrors.email}</p> : null}
        </div>
        {wantsToTest && wantsToTest !== "nu" ? (
          <div
            id="s2-group-testConsent"
            className={`form-group${fieldErrors.testConsent ? " field-invalid" : ""}`}
          >
            <label htmlFor="s2-phone">{copy.testPhoneLabel}</label>
            <input
              id="s2-phone"
              type="tel"
              placeholder="+373 600 00 000"
              value={testPhone}
              onChange={(e) => {
                setTestPhone(e.target.value);
                clearFieldError("testConsent");
              }}
              autoComplete="tel"
              className="survey-followup-input"
            />
            <label className="checkbox-option survey-single-check" htmlFor="s2-test-consent">
              <input
                id="s2-test-consent"
                type="checkbox"
                checked={testConsent}
                onChange={(e) => {
                  setTestConsent(e.target.checked);
                  clearFieldError("testConsent");
                }}
              />
              <span>{copy.testConsentLabel}</span>
            </label>
            {fieldErrors.testConsent ? (
              <p className="field-error-text">{fieldErrors.testConsent}</p>
            ) : null}
          </div>
        ) : null}
      </section>

      {errorMessage ? (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <button type="submit" className="form-submit" disabled={status === FORM_STATUS.Submitting}>
        {status === FORM_STATUS.Submitting ? copy.submittingLabel : copy.submitLabel}
      </button>
    </form>
  );
}
