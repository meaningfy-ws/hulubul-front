"use client";

import { CityTagInput } from "@/components/routes/CityTagInput";
import type { Role } from "@/lib/waitlist-schema";

interface Copy {
  label: string;
  hint: string;
}

const COPY: Record<Role, Copy> = {
  expeditor: {
    label: "De unde trimiți și unde trebuie să ajungă pachetul?",
    hint: "Primul oraș = de unde pleacă pachetul. Ultimul = unde trebuie să ajungă. Adaugă escale dacă vrei.",
  },
  destinatar: {
    label: "De unde pleacă pachetul tău și unde trebuie să ajungă?",
    hint: "Primul oraș = de unde pleacă pachetul. Ultimul = unde îl primești.",
  },
  transportator: {
    label: "De unde pleci și prin ce orașe livrezi pachete?",
    hint: "Primul oraș = de unde pleci. Ordinea contează — adaugă orașele în ordinea aproximativă a rutei tale.",
  },
};

interface Props {
  role: Role;
  value: string[];
  onChange: (cities: string[]) => void;
}

export function CitiesQuestion({ role, value, onChange }: Props) {
  // Defensive fallback: if a stale CMS role value (e.g. legacy "ambele")
  // ever reaches this component, render the sender copy instead of crashing.
  const copy = COPY[role] ?? COPY.expeditor;
  return (
    <div className="form-group">
      <label htmlFor="waitlist-cities">
        {copy.label}
        <span className="hint">{copy.hint}</span>
      </label>
      <div id="waitlist-cities">
        <CityTagInput value={value} onChange={onChange} originDestinationLabels={true} />
      </div>
    </div>
  );
}
