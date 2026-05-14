"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import type {
  ContactedCount,
  HowFind,
  IssueExperienced,
  PackageType,
  PainPoint,
  Role,
  SafetyPriceAttitude,
  SearchDuration,
  SelectionCriterion,
  SendingFrequency,
  Source,
  SurveyPayload,
  TrustSignal,
} from "@/lib/survey-schema";
import { readRemembered } from "@/lib/remember-me";
import { humanizeFormError } from "@/lib/form-errors";
import { FORM_STATUS, type FormStatus } from "@/lib/form-status";
import { SURVEY_ROLES } from "@/lib/roles";
import { trackSurveySubmit } from "@/lib/tracking/events";
import { useConsent } from "@/components/consent/ConsentProvider";
import {
  contactedCountLabels,
  howFindLabels,
  issueExperiencedLabels,
  packageTypeLabels,
  painPointLabels,
  roleLabels,
  safetyPriceAttitudeLabels,
  searchDurationLabels,
  selectionCriterionLabels,
  sendingFrequencyLabels,
  trustSignalLabels,
} from "./labels";
import { SelectionCriteriaPicker } from "./SelectionCriteriaPicker";

const SOURCE_FLAG_KEY = "hulubul:from-waitlist";

type Status = FormStatus;

function parseRole(value: string | null): Role | null {
  if (value && (SURVEY_ROLES as readonly string[]).includes(value)) {
    return value as Role;
  }
  return null;
}

function toggleIn<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

export function SurveyForm() {
  const searchParams = useSearchParams();
  const consentCtx = useConsent();

  // Identity
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [role, setRole] = useState<Role>("expeditor");
  const [routes, setRoutes] = useState("");
  const [source, setSource] = useState<Source>("standalone");

  // Context
  const [sendingFrequency, setSendingFrequency] =
    useState<SendingFrequency | "">("");
  const [packageTypes, setPackageTypes] = useState<PackageType[]>([]);
  const [packageTypesOther, setPackageTypesOther] = useState("");

  // Process
  const [howFindTransporter, setHowFindTransporter] = useState<HowFind[]>([]);
  const [howFindTransporterOther, setHowFindTransporterOther] = useState("");
  const [searchDuration, setSearchDuration] = useState<SearchDuration | "">("");
  const [contactedCount, setContactedCount] = useState<ContactedCount | "">("");

  // Decision
  const [selectionCriteria, setSelectionCriteria] = useState<SelectionCriterion[]>([]);
  const [safetyPriceAttitude, setSafetyPriceAttitude] =
    useState<SafetyPriceAttitude | "">("");

  // Problems
  const [painPointsStructured, setPainPointsStructured] = useState<PainPoint[]>([]);
  const [painPointDetails, setPainPointDetails] = useState("");
  const [issuesExperienced, setIssuesExperienced] = useState<IssueExperienced[]>([]);

  // Trust
  const [trustSignals, setTrustSignals] = useState<TrustSignal[]>([]);
  const [platformTrustRequirements, setPlatformTrustRequirements] = useState("");

  // Ideal
  const [idealExperience, setIdealExperience] = useState("");
  const [biggestTimeSaver, setBiggestTimeSaver] = useState("");

  // Validation
  const [willShipSoon, setWillShipSoon] = useState(false);
  const [wantsCallback, setWantsCallback] = useState(false);
  const [callbackPhone, setCallbackPhone] = useState("");

  const [status, setStatus] = useState<Status>(FORM_STATUS.Idle);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // On mount: pre-fill identity in priority order URL → remember-me → empty.
  // Source: waitlist_followup if sessionStorage flag is set, standalone otherwise.
  useEffect(() => {
    const urlName = searchParams?.get("name");
    const urlEmail = searchParams?.get("email");
    const urlRole = parseRole(searchParams?.get("role") ?? null);

    const remembered = readRemembered();

    setName(urlName ?? remembered?.name ?? "");
    setEmail(urlEmail ?? remembered?.email ?? "");
    setWhatsapp(remembered?.whatsapp ?? "");
    if (urlRole) setRole(urlRole);

    if (typeof window !== "undefined") {
      const flag = window.sessionStorage.getItem(SOURCE_FLAG_KEY);
      setSource(flag === "1" ? "waitlist_followup" : "standalone");
    }
  }, [searchParams]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(FORM_STATUS.Submitting);
    setErrorMessage(null);

    const payload: SurveyPayload = {
      name: name.trim(),
      email: email.trim(),
      whatsapp: whatsapp.trim() || undefined,
      role,
      routes: routes.trim() || undefined,
      source,
      ...(sendingFrequency ? { sendingFrequency } : {}),
      ...(packageTypes.length ? { packageTypes } : {}),
      ...(packageTypesOther.trim()
        ? { packageTypesOther: packageTypesOther.trim() }
        : {}),
      ...(howFindTransporter.length ? { howFindTransporter } : {}),
      ...(howFindTransporterOther.trim()
        ? { howFindTransporterOther: howFindTransporterOther.trim() }
        : {}),
      ...(searchDuration ? { searchDuration } : {}),
      ...(contactedCount ? { contactedCount } : {}),
      ...(selectionCriteria.length ? { selectionCriteria } : {}),
      ...(safetyPriceAttitude ? { safetyPriceAttitude } : {}),
      ...(painPointsStructured.length ? { painPointsStructured } : {}),
      ...(painPointDetails.trim()
        ? { painPointDetails: painPointDetails.trim() }
        : {}),
      ...(issuesExperienced.length ? { issuesExperienced } : {}),
      ...(trustSignals.length ? { trustSignals } : {}),
      ...(platformTrustRequirements.trim()
        ? { platformTrustRequirements: platformTrustRequirements.trim() }
        : {}),
      ...(idealExperience.trim()
        ? { idealExperience: idealExperience.trim() }
        : {}),
      ...(biggestTimeSaver.trim()
        ? { biggestTimeSaver: biggestTimeSaver.trim() }
        : {}),
      willShipSoon,
      wantsCallback,
      ...(wantsCallback && callbackPhone.trim()
        ? { callbackPhone: callbackPhone.trim() }
        : {}),
      consent: {
        analytics: consentCtx.state.analytics,
        marketing: consentCtx.state.marketing,
        recordId: consentCtx.state.recordId,
      },
    };

    try {
      const res = await fetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as
        | { error?: string; event_id?: string }
        | null;
      if (!res.ok) {
        throw new Error(json?.error ?? `Request failed (${res.status})`);
      }
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(SOURCE_FLAG_KEY);
      }
      if (json?.event_id) {
        trackSurveySubmit(role, source, json.event_id);
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
          Răspunsurile tale modelează platforma înainte să lansăm. Te vom anunța
          pe email când e gata.
        </p>
        <p>
          <Link href="/" className="audience-link">
            ← Înapoi la pagina principală
          </Link>
        </p>
      </div>
    );
  }

  return <SurveyBody
    state={{
      name, email, whatsapp, role, routes,
      sendingFrequency, packageTypes, packageTypesOther,
      howFindTransporter, howFindTransporterOther, searchDuration, contactedCount,
      selectionCriteria, safetyPriceAttitude,
      painPointsStructured, painPointDetails, issuesExperienced,
      trustSignals, platformTrustRequirements,
      idealExperience, biggestTimeSaver,
      willShipSoon, wantsCallback, callbackPhone,
    }}
    setters={{
      setName, setEmail, setWhatsapp, setRole, setRoutes,
      setSendingFrequency, setPackageTypes, setPackageTypesOther,
      setHowFindTransporter, setHowFindTransporterOther, setSearchDuration, setContactedCount,
      setSelectionCriteria, setSafetyPriceAttitude,
      setPainPointsStructured, setPainPointDetails, setIssuesExperienced,
      setTrustSignals, setPlatformTrustRequirements,
      setIdealExperience, setBiggestTimeSaver,
      setWillShipSoon, setWantsCallback, setCallbackPhone,
    }}
    onSubmit={onSubmit}
    status={status}
    errorMessage={errorMessage}
  />;
}

// Body rendering kept in a separate component for readability — it is
// purely presentational over the state+setters shapes defined above.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SurveyBody(props: any) {
  const { state: s, setters: x, onSubmit, status, errorMessage } = props;

  return (
    <form onSubmit={onSubmit} noValidate className="survey-form">
      {/* --- Identity --- */}
      <section className="survey-section">
        <h2 className="serif survey-section-title">Despre tine</h2>
        <div className="form-group">
          <label htmlFor="s-name">Nume</label>
          <input
            id="s-name"
            type="text"
            value={s.name}
            onChange={(e) => x.setName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="s-email">Email</label>
          <input
            id="s-email"
            type="email"
            value={s.email}
            onChange={(e) => x.setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="form-group">
          <label htmlFor="s-whatsapp">
            WhatsApp
            <span className="hint">Opțional.</span>
          </label>
          <input
            id="s-whatsapp"
            type="tel"
            value={s.whatsapp}
            onChange={(e) => x.setWhatsapp(e.target.value)}
            autoComplete="tel"
          />
        </div>
        <div className="form-group">
          <label>Rolul tău</label>
          <div className="radio-group" role="radiogroup">
            {roleLabels.map((o) => {
              const id = `s-role-${o.value}`;
              return (
                <div key={o.value} className="radio-option">
                  <input
                    id={id}
                    type="radio"
                    name="role"
                    value={o.value}
                    checked={s.role === o.value}
                    onChange={() => x.setRole(o.value)}
                  />
                  <label htmlFor={id}>{o.label}</label>
                </div>
              );
            })}
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="s-routes">
            Rutele care te interesează
            <span className="hint">Opțional. Una sau mai multe, separate prin virgulă.</span>
          </label>
          <input
            id="s-routes"
            type="text"
            value={s.routes}
            onChange={(e) => x.setRoutes(e.target.value)}
          />
        </div>
      </section>

      {/* --- Context --- */}
      <section className="survey-section">
        <h2 className="serif survey-section-title">Context</h2>
        <div className="form-group">
          <label>Cât de des trimiți pachete acasă?</label>
          <div className="radio-group">
            {sendingFrequencyLabels.map((o) => {
              const id = `s-freq-${o.value}`;
              return (
                <div key={o.value} className="radio-option">
                  <input
                    id={id}
                    type="radio"
                    name="sendingFrequency"
                    checked={s.sendingFrequency === o.value}
                    onChange={() => x.setSendingFrequency(o.value)}
                  />
                  <label htmlFor={id}>{o.label}</label>
                </div>
              );
            })}
          </div>
        </div>
        <div className="form-group">
          <label>Ce trimiți de obicei?</label>
          <div className="checkbox-grid">
            {packageTypeLabels.map((o) => {
              const id = `s-pkg-${o.value}`;
              const checked = s.packageTypes.includes(o.value);
              return (
                <label key={o.value} className="checkbox-option" htmlFor={id}>
                  <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      x.setPackageTypes(toggleIn(s.packageTypes, o.value))
                    }
                  />
                  <span>{o.label}</span>
                </label>
              );
            })}
          </div>
          {s.packageTypes.includes("altele") ? (
            <input
              type="text"
              placeholder="Descrie — altele"
              value={s.packageTypesOther}
              onChange={(e) => x.setPackageTypesOther(e.target.value)}
              className="survey-followup-input"
            />
          ) : null}
        </div>
      </section>

      {/* --- Proces --- */}
      <section className="survey-section">
        <h2 className="serif survey-section-title">Cum găsești un transportator</h2>
        <div className="form-group">
          <label>De unde găsești transportatorii?</label>
          <div className="checkbox-grid">
            {howFindLabels.map((o) => {
              const id = `s-find-${o.value}`;
              const checked = s.howFindTransporter.includes(o.value);
              return (
                <label key={o.value} className="checkbox-option" htmlFor={id}>
                  <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      x.setHowFindTransporter(
                        toggleIn(s.howFindTransporter, o.value),
                      )
                    }
                  />
                  <span>{o.label}</span>
                </label>
              );
            })}
          </div>
          {s.howFindTransporter.includes("altul") ? (
            <input
              type="text"
              placeholder="Descrie — alt mod"
              value={s.howFindTransporterOther}
              onChange={(e) => x.setHowFindTransporterOther(e.target.value)}
              className="survey-followup-input"
            />
          ) : null}
        </div>
        <div className="form-group">
          <label>Cât îți ia să găsești pe cineva?</label>
          <div className="radio-group">
            {searchDurationLabels.map((o) => {
              const id = `s-dur-${o.value}`;
              return (
                <div key={o.value} className="radio-option">
                  <input
                    id={id}
                    type="radio"
                    name="searchDuration"
                    checked={s.searchDuration === o.value}
                    onChange={() => x.setSearchDuration(o.value)}
                  />
                  <label htmlFor={id}>{o.label}</label>
                </div>
              );
            })}
          </div>
        </div>
        <div className="form-group">
          <label>Câți transportatori contactezi de obicei?</label>
          <div className="radio-group">
            {contactedCountLabels.map((o) => {
              const id = `s-cnt-${o.value}`;
              return (
                <div key={o.value} className="radio-option">
                  <input
                    id={id}
                    type="radio"
                    name="contactedCount"
                    checked={s.contactedCount === o.value}
                    onChange={() => x.setContactedCount(o.value)}
                  />
                  <label htmlFor={id}>{o.label}</label>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* --- Decizie --- */}
      <section className="survey-section">
        <h2 className="serif survey-section-title">Cum decizi</h2>
        <div className="form-group">
          <label>
            Ordonează criteriile după importanță
            <span className="hint">
              Click pe un criteriu ca să-l adaugi. Folosește săgețile pentru a
              ordona.
            </span>
          </label>
          <SelectionCriteriaPicker
            options={selectionCriterionLabels as never[]}
            value={s.selectionCriteria}
            onChange={x.setSelectionCriteria}
          />
        </div>
        <div className="form-group">
          <label>Ai plăti mai mult pentru siguranță?</label>
          <div className="radio-group">
            {safetyPriceAttitudeLabels.map((o) => {
              const id = `s-spa-${o.value}`;
              return (
                <div key={o.value} className="radio-option">
                  <input
                    id={id}
                    type="radio"
                    name="safetyPriceAttitude"
                    checked={s.safetyPriceAttitude === o.value}
                    onChange={() => x.setSafetyPriceAttitude(o.value)}
                  />
                  <label htmlFor={id}>{o.label}</label>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* --- Probleme --- */}
      <section className="survey-section">
        <h2 className="serif survey-section-title">Ce te enervează</h2>
        <div className="form-group">
          <label>Unde simți cel mai mult fricțiunea?</label>
          <div className="checkbox-grid">
            {painPointLabels.map((o) => {
              const id = `s-pain-${o.value}`;
              const checked = s.painPointsStructured.includes(o.value);
              return (
                <label key={o.value} className="checkbox-option" htmlFor={id}>
                  <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      x.setPainPointsStructured(
                        toggleIn(s.painPointsStructured, o.value),
                      )
                    }
                  />
                  <span>{o.label}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="s-pain-details">
            Povestește puțin mai mult
            <span className="hint">Opțional. Exemple concrete ajută enorm.</span>
          </label>
          <textarea
            id="s-pain-details"
            rows={4}
            value={s.painPointDetails}
            onChange={(e) => x.setPainPointDetails(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Probleme pe care le-ai avut</label>
          <div className="checkbox-grid">
            {issueExperiencedLabels.map((o) => {
              const id = `s-iss-${o.value}`;
              const checked = s.issuesExperienced.includes(o.value);
              return (
                <label key={o.value} className="checkbox-option" htmlFor={id}>
                  <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      x.setIssuesExperienced(
                        toggleIn(s.issuesExperienced, o.value),
                      )
                    }
                  />
                  <span>{o.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </section>

      {/* --- Încredere --- */}
      <section className="survey-section">
        <h2 className="serif survey-section-title">Încredere</h2>
        <div className="form-group">
          <label>Ce semnale te conving că un transportator e de încredere?</label>
          <div className="checkbox-grid">
            {trustSignalLabels.map((o) => {
              const id = `s-ts-${o.value}`;
              const checked = s.trustSignals.includes(o.value);
              return (
                <label key={o.value} className="checkbox-option" htmlFor={id}>
                  <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      x.setTrustSignals(toggleIn(s.trustSignals, o.value))
                    }
                  />
                  <span>{o.label}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="s-platform-trust">
            Ce ar trebui să existe ca să ai încredere într-o platformă?
          </label>
          <textarea
            id="s-platform-trust"
            rows={3}
            value={s.platformTrustRequirements}
            onChange={(e) => x.setPlatformTrustRequirements(e.target.value)}
          />
        </div>
      </section>

      {/* --- Ideal --- */}
      <section className="survey-section">
        <h2 className="serif survey-section-title">Ideal</h2>
        <div className="form-group">
          <label htmlFor="s-ideal">Cum ar arăta experiența perfectă?</label>
          <textarea
            id="s-ideal"
            rows={3}
            value={s.idealExperience}
            onChange={(e) => x.setIdealExperience(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="s-saver">Ce ți-ar economisi cel mai mult timp?</label>
          <textarea
            id="s-saver"
            rows={3}
            value={s.biggestTimeSaver}
            onChange={(e) => x.setBiggestTimeSaver(e.target.value)}
          />
        </div>
      </section>

      {/* --- Validare --- */}
      <section className="survey-section">
        <h2 className="serif survey-section-title">La final</h2>
        <div className="form-group">
          <label
            className="checkbox-option survey-single-check"
            htmlFor="s-ship-soon"
          >
            <input
              id="s-ship-soon"
              type="checkbox"
              checked={s.willShipSoon}
              onChange={(e) => x.setWillShipSoon(e.target.checked)}
            />
            <span>Voi trimite un pachet în următoarele 2–4 săptămâni</span>
          </label>
        </div>
        <div className="form-group">
          <label
            className="checkbox-option survey-single-check"
            htmlFor="s-callback"
          >
            <input
              id="s-callback"
              type="checkbox"
              checked={s.wantsCallback}
              onChange={(e) => x.setWantsCallback(e.target.checked)}
            />
            <span>Sună-mă / scrie-mi cu opțiuni concrete dacă există</span>
          </label>
          {s.wantsCallback ? (
            <input
              type="tel"
              placeholder="+373 600 00 000"
              value={s.callbackPhone}
              onChange={(e) => x.setCallbackPhone(e.target.value)}
              required
              className="survey-followup-input"
            />
          ) : null}
        </div>
      </section>

      {errorMessage ? <p className="form-error" role="alert">{errorMessage}</p> : null}

      <button type="submit" className="form-submit" disabled={status === FORM_STATUS.Submitting}>
        {status === FORM_STATUS.Submitting ? "Se trimite..." : "Trimite răspunsurile"}
      </button>
    </form>
  );
}
