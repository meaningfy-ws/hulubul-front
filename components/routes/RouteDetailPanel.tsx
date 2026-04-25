"use client";

import type { Route } from "@/lib/routes-types";
import { RouteStatusBadge } from "./RouteStatusBadge";

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Săptămânal",
  biweekly: "La 2 săptămâni",
  monthly: "Lunar",
  on_demand: "La cerere",
};

const DAY_LABELS: Record<string, string> = {
  mon: "Luni",
  tue: "Marți",
  wed: "Miercuri",
  thu: "Joi",
  fri: "Vineri",
  sat: "Sâmbătă",
  sun: "Duminică",
};

interface Props {
  route: Route;
  onClose: () => void;
  readonly?: boolean;
  onEdit?: (route: Route) => void;
}

export function RouteDetailPanel({ route, onClose, readonly, onEdit }: Props) {
  const cities = route.citiesText.split(",").map((c) => c.trim()).filter(Boolean);

  return (
    <div style={{ padding: "16px", border: "1px solid #e5e7eb", borderRadius: "8px", backgroundColor: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>{route.name}</h3>
        <button
          type="button"
          aria-label="Închide panoul"
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem" }}
        >
          ✕
        </button>
      </div>

      <div style={{ marginBottom: "8px" }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
          Orașe
        </span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
          {cities.map((city, i) => (
            <span key={i} style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start" }}>
              {(i === 0 || i === cities.length - 1) && (
                <span style={{ fontSize: "0.6rem", color: "#6b7280", lineHeight: 1 }}>
                  {i === 0 ? "Plecare" : "Destinație"}
                </span>
              )}
              <span
                style={{
                  padding: "2px 8px",
                  backgroundColor: "#f3f4f6",
                  borderRadius: "12px",
                  fontSize: "0.8rem",
                }}
              >
                {city}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: "8px", display: "flex", gap: "8px", alignItems: "center" }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Status</span>
        <RouteStatusBadge status={route.status} />
      </div>

      {route.submittedBy && (
        <p style={{ margin: "4px 0", fontSize: "0.8rem" }}>
          <strong>Creat de:</strong> {route.submittedBy}
        </p>
      )}
      {route.claimedBy && (
        <p style={{ margin: "4px 0", fontSize: "0.8rem" }}>
          <strong>Gestionat de:</strong> {route.claimedBy}
        </p>
      )}

      {!route.geoJson && (
        <p style={{ color: "#f59e0b", fontSize: "0.8rem", marginTop: "8px" }}>
          ⚠ Coordonatele geografice lipsesc pentru această rută.
        </p>
      )}

      {!readonly && onEdit && (
        <button
          type="button"
          onClick={() => onEdit(route)}
          style={{ marginTop: "12px", fontSize: "0.8rem", padding: "4px 12px", cursor: "pointer" }}
        >
          Editează ruta
        </button>
      )}

      <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid #e5e7eb" }} />

      <h4 style={{ margin: "0 0 8px", fontSize: "0.875rem", fontWeight: 700 }}>Curse programate</h4>

      {!route.schedules || route.schedules.length === 0 ? (
        <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
          Nicio cursă programată pentru această rută.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {route.schedules.map((sch) => (
            <div
              key={sch.id}
              style={{ padding: "12px", backgroundColor: "#f9fafb", borderRadius: "8px", fontSize: "0.8rem" }}
            >
              <p style={{ margin: "0 0 4px", fontWeight: 700 }}>
                {sch.transporter.name}
                <span
                  style={{
                    marginLeft: "6px",
                    fontSize: "0.7rem",
                    padding: "1px 6px",
                    backgroundColor: "#e5e7eb",
                    borderRadius: "8px",
                  }}
                >
                  {sch.transporter.type === "company" ? "firmă" : "individual"}
                </span>
              </p>

              <p style={{ margin: "2px 0" }}>
                <strong>Telefoane:</strong>{" "}
                {sch.transporter.phoneNumbers.map((ph) => (
                  <a key={ph} href={`tel:${ph}`} style={{ marginRight: "6px" }}>
                    {ph}
                  </a>
                ))}
              </p>

              {sch.transporter.transportTypes.length > 0 && (
                <p style={{ margin: "2px 0" }}>
                  <strong>Tipuri:</strong>{" "}
                  {sch.transporter.transportTypes.map((tt) => (
                    <span
                      key={tt.id}
                      style={{
                        marginRight: "4px",
                        padding: "1px 6px",
                        backgroundColor: "#dbeafe",
                        borderRadius: "8px",
                        fontSize: "0.75rem",
                      }}
                    >
                      {tt.label}
                    </span>
                  ))}
                </p>
              )}

              <p style={{ margin: "2px 0" }}>
                <strong>Frecvență:</strong> {FREQUENCY_LABELS[sch.frequency] ?? sch.frequency}
              </p>
              <p style={{ margin: "2px 0" }}>
                <strong>Zile plecare:</strong> {sch.departureDays.map((d) => DAY_LABELS[d] ?? d).join(", ")}
              </p>
              <p style={{ margin: "2px 0" }}>
                <strong>Zile sosire:</strong> {sch.arrivalDays.map((d) => DAY_LABELS[d] ?? d).join(", ")}
              </p>
              {sch.notes && (
                <p style={{ margin: "2px 0" }}>
                  <strong>Note:</strong> {sch.notes}
                </p>
              )}
              <RouteStatusBadge status={sch.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
