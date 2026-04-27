"use client";

import { useState } from "react";
import { requestLocation, type LocationGranted } from "@/lib/geolocation";

type Consent = "granted" | "denied" | "not_asked";

export interface LocationPromptValue {
  consent: Consent;
  location: LocationGranted | null;
}

interface Props {
  onChange: (value: LocationPromptValue) => void;
}

export function LocationPrompt({ onChange }: Props) {
  const [state, setState] = useState<LocationPromptValue>({
    consent: "not_asked",
    location: null,
  });
  const [busy, setBusy] = useState(false);

  function emit(next: LocationPromptValue) {
    setState(next);
    onChange(next);
  }

  async function handleShare() {
    setBusy(true);
    const loc = await requestLocation();
    setBusy(false);
    if (loc) emit({ consent: "granted", location: loc });
    else emit({ consent: "denied", location: null });
  }

  function handleHide() {
    emit({ consent: "denied", location: null });
  }

  function handleReopen() {
    emit({ consent: "not_asked", location: null });
  }

  if (state.consent === "granted") {
    return (
      <div className="form-location form-location--granted">
        <span>Locație partajată ✓</span>
        <button type="button" onClick={handleHide}>
          Ascunde
        </button>
      </div>
    );
  }

  if (state.consent === "denied") {
    return (
      <div className="form-location form-location--denied">
        <span>Locație ascunsă.</span>
        <button type="button" onClick={handleReopen}>
          Schimbă
        </button>
      </div>
    );
  }

  return (
    <div className="form-location form-location--prompt">
      <p>
        🌍 Pot afla locația ta aproximativă?
        <span className="hint">Ne ajută să prioritizăm orașele de pornire.</span>
      </p>
      <div className="form-location-actions">
        <button type="button" onClick={handleShare} disabled={busy}>
          Da, partajează
        </button>
        <button type="button" onClick={handleHide} disabled={busy}>
          Nu, ascunde
        </button>
      </div>
    </div>
  );
}
