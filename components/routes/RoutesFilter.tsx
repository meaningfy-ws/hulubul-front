"use client";

import type { RouteFilter, Transporter, Frequency, DayCode, RouteStatus } from "@/lib/routes-types";
import { countActiveFilters } from "@/lib/routes-filter";

const STATUS_PILLS: Array<{ value: RouteFilter["status"]; label: string }> = [
  { value: "all", label: "Toate" },
  { value: "approved", label: "Aprobate" },
  { value: "draft", label: "Ciornă" },
  { value: "suspended", label: "Suspendate" },
];

const FREQUENCY_OPTIONS: Array<{ value: Frequency; label: string }> = [
  { value: "daily", label: "Zilnic" },
  { value: "weekly", label: "Săptămânal" },
  { value: "biweekly", label: "La 2 săptămâni" },
  { value: "monthly", label: "Lunar" },
  { value: "on_demand", label: "La cerere" },
];

const DAY_OPTIONS: Array<{ value: DayCode; label: string }> = [
  { value: "mon", label: "Lu" },
  { value: "tue", label: "Ma" },
  { value: "wed", label: "Mi" },
  { value: "thu", label: "Jo" },
  { value: "fri", label: "Vi" },
  { value: "sat", label: "Sâ" },
  { value: "sun", label: "Du" },
];

interface Props {
  filter: RouteFilter;
  onChange: (f: RouteFilter) => void;
  onReset: () => void;
  transporters: Transporter[];
  hideStatus?: boolean;
}

export function RoutesFilter({ filter, onChange, onReset, transporters, hideStatus }: Props) {
  const activeCount = countActiveFilters(filter);

  function toggleTransporter(id: number) {
    const ids = filter.transporterIds.includes(id)
      ? filter.transporterIds.filter((i) => i !== id)
      : [...filter.transporterIds, id];
    onChange({ ...filter, transporterIds: ids });
  }

  function toggleFrequency(f: Frequency) {
    const freqs = filter.frequencies.includes(f)
      ? filter.frequencies.filter((x) => x !== f)
      : [...filter.frequencies, f];
    onChange({ ...filter, frequencies: freqs });
  }

  function toggleDay(d: DayCode) {
    const days = filter.departureDays.includes(d)
      ? filter.departureDays.filter((x) => x !== d)
      : [...filter.departureDays, d];
    onChange({ ...filter, departureDays: days });
  }

  return (
    <div role="search" aria-label="Filtre rute">
      {!hideStatus && (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
          {STATUS_PILLS.map((p) => (
            <button
              key={p.value}
              type="button"
              aria-pressed={filter.status === p.value}
              onClick={() => onChange({ ...filter, status: p.value })}
              style={{
                padding: "4px 12px",
                borderRadius: "16px",
                border: "1px solid",
                borderColor: filter.status === p.value ? "#1d4ed8" : "#d1d5db",
                backgroundColor: filter.status === p.value ? "#1d4ed8" : "#fff",
                color: filter.status === p.value ? "#fff" : "#374151",
                fontWeight: filter.status === p.value ? 600 : 400,
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ marginBottom: "8px" }}>
        <input
          type="text"
          aria-label="Filtrează după oraș"
          placeholder="Filtrează după oraș…"
          value={filter.cityQuery}
          onChange={(e) => onChange({ ...filter, cityQuery: e.target.value })}
          style={{
            width: "100%",
            padding: "6px 10px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "0.875rem",
          }}
        />
      </div>

      {transporters.length > 0 && (
        <details style={{ marginBottom: "8px" }}>
          <summary style={{ cursor: "pointer", fontSize: "0.875rem", fontWeight: 600, marginBottom: "4px" }}>
            Transportator
          </summary>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingTop: "4px" }}>
            {transporters.map((t) => (
              <label key={t.id} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.875rem" }}>
                <input
                  type="checkbox"
                  checked={filter.transporterIds.includes(t.id)}
                  onChange={() => toggleTransporter(t.id)}
                />
                {t.name}
              </label>
            ))}
          </div>
        </details>
      )}

      <details style={{ marginBottom: "8px" }}>
        <summary style={{ cursor: "pointer", fontSize: "0.875rem", fontWeight: 600, marginBottom: "4px" }}>
          Frecvență
        </summary>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingTop: "4px" }}>
          {FREQUENCY_OPTIONS.map((f) => (
            <label key={f.value} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.875rem" }}>
              <input
                type="checkbox"
                checked={filter.frequencies.includes(f.value)}
                onChange={() => toggleFrequency(f.value)}
              />
              {f.label}
            </label>
          ))}
        </div>
      </details>

      <details style={{ marginBottom: "8px" }}>
        <summary style={{ cursor: "pointer", fontSize: "0.875rem", fontWeight: 600, marginBottom: "4px" }}>
          Zile plecare
        </summary>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", paddingTop: "4px" }}>
          {DAY_OPTIONS.map((d) => (
            <label
              key={d.value}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "2px 8px",
                border: "1px solid",
                borderColor: filter.departureDays.includes(d.value) ? "#1d4ed8" : "#d1d5db",
                borderRadius: "12px",
                cursor: "pointer",
                fontSize: "0.875rem",
                backgroundColor: filter.departureDays.includes(d.value) ? "#eff6ff" : "#fff",
              }}
            >
              <input
                type="checkbox"
                checked={filter.departureDays.includes(d.value)}
                onChange={() => toggleDay(d.value)}
                style={{ display: "none" }}
              />
              {d.label}
            </label>
          ))}
        </div>
      </details>

      {activeCount > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
          <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>{activeCount} filtre active</span>
          <button
            type="button"
            onClick={onReset}
            style={{ fontSize: "0.75rem", color: "#1d4ed8", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
          >
            Resetează filtrele
          </button>
        </div>
      )}
    </div>
  );
}
