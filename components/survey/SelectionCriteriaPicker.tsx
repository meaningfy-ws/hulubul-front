"use client";

import type { SelectionCriterion } from "@/lib/survey-schema";

export interface CriterionOption {
  value: SelectionCriterion;
  label: string;
}

export interface SelectionCriteriaPickerProps {
  options: CriterionOption[];
  value: SelectionCriterion[];
  onChange: (next: SelectionCriterion[]) => void;
}

function swap<T>(arr: T[], i: number, j: number): T[] {
  const next = arr.slice();
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}

export function SelectionCriteriaPicker({
  options,
  value,
  onChange,
}: SelectionCriteriaPickerProps) {
  const selected = value;
  const unselected = options.filter((o) => !selected.includes(o.value));

  function add(v: SelectionCriterion) {
    if (selected.includes(v) || selected.length >= 5) return;
    onChange([...selected, v]);
  }

  function remove(v: SelectionCriterion) {
    onChange(selected.filter((x) => x !== v));
  }

  function move(v: SelectionCriterion, direction: "up" | "down") {
    const i = selected.indexOf(v);
    if (i < 0) return;
    const j = direction === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= selected.length) return;
    onChange(swap(selected, i, j));
  }

  return (
    <div className="criteria-picker">
      {selected.length > 0 ? (
        <ol className="criteria-selected" aria-label="criterii ordonate">
          {selected.map((v, i) => {
            const option = options.find((o) => o.value === v);
            if (!option) return null;
            return (
              <li key={v}>
                <span className="criteria-rank">{i + 1}.</span>
                <span className="criteria-label">{option.label}</span>
                <span className="criteria-controls">
                  <button
                    type="button"
                    aria-label={`Mută ${option.label} sus`}
                    disabled={i === 0}
                    onClick={() => move(v, "up")}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Mută ${option.label} jos`}
                    disabled={i === selected.length - 1}
                    onClick={() => move(v, "down")}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    aria-label={`Elimină ${option.label}`}
                    onClick={() => remove(v)}
                  >
                    ✕
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}

      {unselected.length > 0 && selected.length < 5 ? (
        <div className="criteria-unselected">
          {unselected.map((option) => (
            <button
              key={option.value}
              type="button"
              className="criteria-chip"
              onClick={() => add(option.value)}
            >
              + {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
