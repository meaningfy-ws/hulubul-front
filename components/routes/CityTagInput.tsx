"use client";

import { Fragment, useState, useRef, useEffect, useCallback } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { GeocodeSuggestion } from "@/lib/routes-types";

interface Props {
  value: string[];
  onChange: (cities: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  originDestinationLabels?: boolean;
  maxCities?: number;
}

export function CityTagInput({
  value,
  onChange,
  placeholder = "Adaugă un oraș…",
  disabled,
  originDestinationLabels = true,
  maxCities = 10,
}: Props) {
  const [inputText, setInputText] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const gapInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/geocode-suggest?q=${encodeURIComponent(query)}&limit=5`,
      );
      if (res.ok) {
        const data = (await res.json()) as GeocodeSuggestion[];
        setSuggestions(data);
        setIsOpen(data.length > 0);
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    } catch {
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchSuggestions(inputText.trim());
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputText, fetchSuggestions]);

  function addCity(name: string) {
    if (value.length >= maxCities) return;
    const next = [...value];
    if (insertIndex != null) {
      next.splice(insertIndex, 0, name);
    } else {
      next.push(name);
    }
    onChange(next);
    setInputText("");
    setSuggestions([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
    setInsertIndex(null);
    inputRef.current?.focus();
  }

  function removeCity(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function swap(i: number, j: number) {
    if (i < 0 || j < 0 || i >= value.length || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = Number(active.id);
    const to = Number(over.id);
    if (Number.isNaN(from) || Number.isNaN(to)) return;
    onChange(arrayMove(value, from, to));
  }

  function handleChipKeyDown(
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (!e.altKey) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      swap(index, index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      swap(index, index + 1);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (
      e.key === "Backspace" &&
      inputText === "" &&
      insertIndex == null &&
      value.length > 0
    ) {
      removeCity(value.length - 1);
      return;
    }
    if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
      if (insertIndex != null) {
        setInsertIndex(null);
        setInputText("");
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, suggestions.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, -1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        addCity(suggestions[highlightedIndex].name);
      } else if (inputText.trim()) {
        addCity(inputText.trim());
      }
    }
  }

  function chipLabel(index: number): string | null {
    if (!originDestinationLabels || value.length === 0) return null;
    if (index === 0) return "Plecare";
    if (index === value.length - 1) return "Destinație";
    return null;
  }

  const sortableIds = value.map((_, i) => String(i));

  return (
    <div style={{ position: "relative" }}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "4px",
              alignItems: "center",
              padding: "6px 8px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              minHeight: "40px",
              cursor: "text",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) inputRef.current?.focus();
            }}
          >
            {value.map((city, i) => (
              <Fragment key={i}>
                {i > 0 &&
                  (insertIndex === i ? (
                    <input
                      ref={gapInputRef}
                      autoFocus
                      aria-label={`Oraș nou între ${value[i - 1]} și ${value[i]}`}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={() => {
                        // Cancel the gap if the user clicks away without picking.
                        setTimeout(() => {
                          setInsertIndex(null);
                          setInputText("");
                          setIsOpen(false);
                        }, 200);
                      }}
                      placeholder="Tastează un oraș…"
                      style={{
                        minWidth: "120px",
                        border: "1px dashed #6b7280",
                        outline: "none",
                        borderRadius: "12px",
                        padding: "2px 8px",
                        fontSize: "0.875rem",
                      }}
                      role="combobox"
                      aria-autocomplete="list"
                      aria-expanded={isOpen}
                    />
                  ) : (
                    <button
                      type="button"
                      aria-label={`Inserează între ${value[i - 1]} și ${value[i]}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setInsertIndex(i);
                        setInputText("");
                      }}
                      style={{
                        background: "none",
                        border: "1px dashed #d1d5db",
                        borderRadius: "999px",
                        width: "18px",
                        height: "18px",
                        padding: 0,
                        cursor: "pointer",
                        color: "#9ca3af",
                        fontSize: "0.75rem",
                        lineHeight: 1,
                      }}
                    >
                      +
                    </button>
                  ))}
                <SortableChip
                  id={String(i)}
                  index={i}
                  city={city}
                  badge={chipLabel(i)}
                  disabled={disabled}
                  onRemove={() => removeCity(i)}
                  onChipKeyDown={(e) => handleChipKeyDown(e, i)}
                />
              </Fragment>
            ))}
            {insertIndex == null && (
              <input
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (suggestions.length > 0) setIsOpen(true);
                }}
                onBlur={() => setTimeout(() => setIsOpen(false), 150)}
                placeholder={value.length === 0 ? placeholder : ""}
                disabled={disabled}
                style={{
                  border: "none",
                  outline: "none",
                  flex: 1,
                  minWidth: "120px",
                  fontSize: "0.875rem",
                  background: "transparent",
                }}
                aria-label="Adaugă oraș"
                aria-autocomplete="list"
                aria-expanded={isOpen}
                role="combobox"
              />
            )}
          </div>
        </SortableContext>
      </DndContext>

      {isOpen && (
        <ul
          role="listbox"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 100,
            margin: 0,
            padding: "4px 0",
            listStyle: "none",
            backgroundColor: "#fff",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            maxHeight: "200px",
            overflowY: "auto",
          }}
        >
          {suggestions.length === 0 && !loading && (
            <li style={{ padding: "8px 12px", color: "#6b7280", fontSize: "0.875rem" }}>
              Nu s-au găsit sugestii
            </li>
          )}
          {suggestions.map((s, i) => (
            <li
              key={i}
              role="option"
              aria-selected={i === highlightedIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                addCity(s.name);
              }}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: "0.875rem",
                backgroundColor: i === highlightedIndex ? "#f3f4f6" : "transparent",
              }}
            >
              {s.name}
              {s.country && (
                <span style={{ marginLeft: "6px", color: "#9ca3af", fontSize: "0.75rem" }}>
                  {s.country}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SortableChip({
  id,
  index: _index,
  city,
  badge,
  disabled,
  onRemove,
  onChipKeyDown,
}: {
  id: string;
  index: number;
  city: string;
  badge: string | null;
  disabled?: boolean;
  onRemove: () => void;
  onChipKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "flex-start",
  };

  return (
    <span ref={setNodeRef} style={style}>
      {badge && (
        <span style={{ fontSize: "0.6rem", color: "#6b7280", lineHeight: 1 }}>
          {badge}
        </span>
      )}
      <button
        type="button"
        aria-label={`chip ${city}`}
        {...attributes}
        {...listeners}
        onKeyDown={(e) => {
          // Alt+Arrow keyboard reorder takes priority over dnd-kit's Space/Enter.
          if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
            e.stopPropagation();
            onChipKeyDown(e);
            return;
          }
          // Forward the rest to dnd-kit's keyboard sensor.
          listeners?.onKeyDown?.(e);
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "2px 8px",
          backgroundColor: "#e5e7eb",
          borderRadius: "12px",
          fontSize: "0.875rem",
          border: "none",
          cursor: disabled ? "default" : "grab",
          touchAction: "none",
        }}
      >
        {city}
        {!disabled && (
          <span
            role="button"
            aria-label={`Elimină ${city}`}
            tabIndex={-1}
            onPointerDown={(e) => {
              // Prevent dnd-kit from claiming this gesture as a drag.
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            style={{ cursor: "pointer", padding: 0, lineHeight: 1 }}
          >
            ×
          </span>
        )}
      </button>
    </span>
  );
}
