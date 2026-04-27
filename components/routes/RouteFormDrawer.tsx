"use client";

import { useState, useEffect } from "react";
import type { Route, RouteStatus } from "@/lib/routes-types";
import type { RoutePayload } from "@/lib/routes-schema";
import { CityTagInput } from "./CityTagInput";

interface Props {
  open: boolean;
  route?: Route | null; // null = create mode
  onClose: () => void;
  onSave: (payload: RoutePayload) => Promise<void>;
}

const DEFAULT_STATUS: RouteStatus = "approved";

export function RouteFormDrawer({ open, route, onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [status, setStatus] = useState<RouteStatus>(DEFAULT_STATUS);
  const [submittedBy, setSubmittedBy] = useState("");
  const [claimedBy, setClaimedBy] = useState("");
  const [geoJsonText, setGeoJsonText] = useState("");
  const [showGeoJson, setShowGeoJson] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [geocodingWarning, setGeocodingWarning] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (route) {
      setName(route.name);
      setCities(route.citiesText.split(",").map((c) => c.trim()).filter(Boolean));
      setStatus(route.status);
      setSubmittedBy(route.submittedBy ?? "");
      setClaimedBy(route.claimedBy ?? "");
      setGeoJsonText(route.geoJson ? JSON.stringify(route.geoJson, null, 2) : "");
    } else {
      setName("");
      setCities([]);
      setStatus(DEFAULT_STATUS);
      setSubmittedBy("");
      setClaimedBy("");
      setGeoJsonText("");
    }
    setErrors({});
    setGeocodingWarning(false);
    setSaving(false);
  }, [open, route]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Denumirea este obligatorie";
    if (cities.length < 2) errs.cities = "Adaugă cel puțin 2 orașe";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const payload: RoutePayload = {
      name: name.trim(),
      citiesText: cities.join(", "),
      status,
      ...(submittedBy.trim() ? { submittedBy: submittedBy.trim() } : {}),
      ...(claimedBy.trim() ? { claimedBy: claimedBy.trim() } : {}),
      ...(geoJsonText.trim() ? { geoJson: JSON.parse(geoJsonText) } : {}),
    };

    setSaving(true);
    setGeocodingWarning(false);
    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      setSaving(false);
      throw err;
    }
    setSaving(false);
  }

  if (!open) return null;

  return (
    <>
      {/* backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.35)",
          zIndex: 1400,
        }}
      />
    <div
      role="dialog"
      aria-modal="true"
      aria-label={route ? "Editează ruta" : "Adaugă rută nouă"}
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "min(480px, 100vw)",
        backgroundColor: "#fff",
        boxShadow: "-4px 0 20px rgba(0,0,0,0.1)",
        zIndex: 1500,
        overflowY: "auto",
        padding: "24px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }}>
          {route ? "Editează ruta" : "Adaugă rută nouă"}
        </h2>
        <button
          type="button"
          aria-label="Închide formularul"
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem" }}
        >
          ✕
        </button>
      </div>

      <form onSubmit={(e) => { void handleSubmit(e); }} noValidate>
        <div style={{ marginBottom: "16px" }}>
          <label htmlFor="route-name" style={{ display: "block", fontWeight: 600, fontSize: "0.875rem", marginBottom: "4px" }}>
            Denumire *
          </label>
          <input
            id="route-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: Luxembourg → Chișinău"
            aria-invalid={!!errors.name}
            style={{
              width: "100%",
              padding: "8px 10px",
              border: `1px solid ${errors.name ? "#ef4444" : "#d1d5db"}`,
              borderRadius: "6px",
              fontSize: "0.875rem",
              boxSizing: "border-box",
            }}
          />
          {errors.name && (
            <p role="alert" style={{ color: "#ef4444", fontSize: "0.75rem", margin: "4px 0 0" }}>
              {errors.name}
            </p>
          )}
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontWeight: 600, fontSize: "0.875rem", marginBottom: "4px" }}>
            Orașe * <span style={{ fontWeight: 400, color: "#6b7280" }}>(primul = plecare, ultimul = destinație)</span>
          </label>
          <CityTagInput
            value={cities}
            onChange={setCities}
            placeholder="Adaugă un oraș…"
          />
          {errors.cities && (
            <p role="alert" style={{ color: "#ef4444", fontSize: "0.75rem", margin: "4px 0 0" }}>
              {errors.cities}
            </p>
          )}
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label htmlFor="route-status" style={{ display: "block", fontWeight: 600, fontSize: "0.875rem", marginBottom: "4px" }}>
            Status
          </label>
          <select
            id="route-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as RouteStatus)}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem" }}
          >
            <option value="approved">Aprobat</option>
            <option value="draft">Ciornă</option>
            <option value="suspended">Suspendat</option>
          </select>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label htmlFor="route-submitted-by" style={{ display: "block", fontWeight: 600, fontSize: "0.875rem", marginBottom: "4px" }}>
            Creat de (email, opțional)
          </label>
          <input
            id="route-submitted-by"
            type="email"
            value={submittedBy}
            onChange={(e) => setSubmittedBy(e.target.value)}
            placeholder="admin@hulubul.com"
            style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label htmlFor="route-claimed-by" style={{ display: "block", fontWeight: 600, fontSize: "0.875rem", marginBottom: "4px" }}>
            Gestionat de (email, opțional)
          </label>
          <input
            id="route-claimed-by"
            type="email"
            value={claimedBy}
            onChange={(e) => setClaimedBy(e.target.value)}
            placeholder="transporter@example.com"
            style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box" }}
          />
        </div>

        <details open={showGeoJson} onToggle={(e) => setShowGeoJson((e.currentTarget as HTMLDetailsElement).open)}>
          <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: "0.875rem", marginBottom: "4px" }}>
            GeoJSON (corecție manuală)
          </summary>
          <textarea
            aria-label="GeoJSON manual"
            value={geoJsonText}
            onChange={(e) => setGeoJsonText(e.target.value)}
            rows={6}
            placeholder='{"type":"LineString","coordinates":[[6.13,49.61],[28.86,47.01]]}'
            style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.75rem", fontFamily: "monospace", boxSizing: "border-box" }}
          />
        </details>

        {geocodingWarning && (
          <div role="alert" style={{ marginTop: "12px", padding: "10px", backgroundColor: "#fff7ed", borderLeft: "3px solid #f59e0b", borderRadius: "4px", fontSize: "0.8rem" }}>
            Geocodificarea a eșuat. Poți introduce coordonatele manual în câmpul GeoJSON.
          </div>
        )}

        <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
          <button
            type="submit"
            disabled={saving}
            style={{ flex: 1, padding: "10px", backgroundColor: "#1d4ed8", color: "#fff", border: "none", borderRadius: "6px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Se calculează coordonatele…" : route ? "Salvează modificările" : "Adaugă ruta"}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: "10px 20px", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer" }}
          >
            Anulează
          </button>
        </div>
      </form>
    </div>
    </>
  );
}
