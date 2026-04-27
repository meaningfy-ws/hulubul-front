# STORY 2 — `CityTagInput` enhancements

**Goal:** Extend `components/routes/CityTagInput.tsx` with:
1. `originDestinationLabels?: boolean` (default true) — toggle "Plecare"/"Destinație" badges.
2. `maxCities?: number` (default 10) — cap chip count.
3. Drag-to-reorder via HTML5 native DnD.
4. Insert-between via clicking a thin gap between chips.
5. Keyboard reorder: `Alt+ArrowLeft` / `Alt+ArrowRight` swap focused chip with neighbour.

Existing routes admin/public callers stay green because defaults preserve current behaviour.

**Files:**
- Modify: `components/routes/CityTagInput.tsx`
- Modify: `tests/components/CityTagInput.test.tsx` (add new cases; existing stay)

---

## Task 2.1 — Add `originDestinationLabels` + `maxCities` props

- [ ] **Step 1: Add failing test for label suppression**

Append to `tests/components/CityTagInput.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CityTagInput } from "@/components/routes/CityTagInput";

describe("<CityTagInput> — origin/destination labels", () => {
  it("hides Plecare/Destinație when originDestinationLabels=false", () => {
    render(
      <CityTagInput
        value={["Lux", "Metz", "Chișinău"]}
        onChange={() => {}}
        originDestinationLabels={false}
      />,
    );
    expect(screen.queryByText("Plecare")).not.toBeInTheDocument();
    expect(screen.queryByText("Destinație")).not.toBeInTheDocument();
  });

  it("shows badges by default", () => {
    render(<CityTagInput value={["Lux", "Chișinău"]} onChange={() => {}} />);
    expect(screen.getByText("Plecare")).toBeInTheDocument();
    expect(screen.getByText("Destinație")).toBeInTheDocument();
  });
});

describe("<CityTagInput> — maxCities", () => {
  it("blocks adding past maxCities via Enter", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CityTagInput value={["A", "B"]} onChange={onChange} maxCities={2} />,
    );
    const input = screen.getByLabelText("Adaugă oraș");
    await user.type(input, "C{Enter}");
    expect(onChange).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```
npx vitest run tests/components/CityTagInput.test.tsx
```

- [ ] **Step 3: Implement props**

In `components/routes/CityTagInput.tsx`:

Update `Props`:
```ts
interface Props {
  value: string[];
  onChange: (cities: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  originDestinationLabels?: boolean;
  maxCities?: number;
}
```

Update the function signature:
```ts
export function CityTagInput({
  value,
  onChange,
  placeholder = "Adaugă un oraș…",
  disabled,
  originDestinationLabels = true,
  maxCities = 10,
}: Props) {
```

Update `chipLabel` to honour the prop:
```ts
function chipLabel(index: number): string | null {
  if (!originDestinationLabels || value.length === 0) return null;
  if (index === 0) return "Plecare";
  if (index === value.length - 1) return "Destinație";
  return null;
}
```

Update `addCity` to enforce `maxCities`:
```ts
function addCity(name: string) {
  if (value.length >= maxCities) return;
  onChange([...value, name]);
  setInputText("");
  setSuggestions([]);
  setIsOpen(false);
  setHighlightedIndex(-1);
  inputRef.current?.focus();
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```
git commit -am "feat(CityTagInput): originDestinationLabels + maxCities props"
```

---

## Task 2.2 — Keyboard reorder (`Alt + ArrowLeft/Right`)

- [ ] **Step 1: Add failing test**

```tsx
describe("<CityTagInput> — keyboard reorder", () => {
  it("Alt+ArrowRight swaps the focused chip with its right neighbour", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CityTagInput value={["A", "B", "C"]} onChange={onChange} />);
    const chipA = screen.getByRole("button", { name: /chip A/i });
    chipA.focus();
    await user.keyboard("{Alt>}{ArrowRight}{/Alt}");
    expect(onChange).toHaveBeenCalledWith(["B", "A", "C"]);
  });

  it("Alt+ArrowLeft swaps with the left neighbour", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CityTagInput value={["A", "B", "C"]} onChange={onChange} />);
    const chipB = screen.getByRole("button", { name: /chip B/i });
    chipB.focus();
    await user.keyboard("{Alt>}{ArrowLeft}{/Alt}");
    expect(onChange).toHaveBeenCalledWith(["B", "A", "C"]);
  });

  it("Alt+ArrowLeft on the first chip is a no-op", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CityTagInput value={["A", "B"]} onChange={onChange} />);
    const chipA = screen.getByRole("button", { name: /chip A/i });
    chipA.focus();
    await user.keyboard("{Alt>}{ArrowLeft}{/Alt}");
    expect(onChange).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (chips are `<span>`, not focusable buttons; no key handler).

- [ ] **Step 3: Refactor chip rendering to focusable buttons**

Replace the chip span with a focusable wrapper button. In the chip JSX (the inner `<span>` that wraps the city name), change to:

```tsx
<button
  type="button"
  role="button"
  aria-label={`chip ${city}`}
  onKeyDown={(e) => handleChipKeyDown(e, i)}
  draggable={!disabled}
  onDragStart={(e) => handleDragStart(e, i)}
  onDragOver={(e) => e.preventDefault()}
  onDrop={(e) => handleDrop(e, i)}
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
  }}
>
  {city}
  {!disabled && (
    <span
      role="button"
      aria-label={`Elimină ${city}`}
      tabIndex={-1}
      onClick={(e) => { e.stopPropagation(); removeCity(i); }}
      style={{ cursor: "pointer", padding: 0, lineHeight: 1 }}
    >
      ×
    </span>
  )}
</button>
```

(Note: keep `aria-label="chip {city}"` on the outer button so the test can find it by accessible name. Inner remove span keeps `Elimină {city}` label. The previous nested `<button>` for removal becomes a `<span role="button">` because nested buttons are invalid HTML.)

Add `handleChipKeyDown`:

```ts
function swap(i: number, j: number) {
  if (i < 0 || j < 0 || i >= value.length || j >= value.length) return;
  const next = [...value];
  [next[i], next[j]] = [next[j]!, next[i]!];
  onChange(next);
}

function handleChipKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
  if (!e.altKey) return;
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    swap(index, index - 1);
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    swap(index, index + 1);
  }
}
```

- [ ] **Step 4: Run — expect PASS for the three tests**

- [ ] **Step 5: Run the existing CityTagInput suite — expect all green**

```
npx vitest run tests/components/CityTagInput.test.tsx
```

If the existing "removes a city via × click" test fails because the remove element changed from `<button>` to `<span role="button">`, update the matcher only if the test queries `getByRole("button", { name: /Elimină.../ })`. The `aria-label` is preserved, so accessible name lookup still works.

- [ ] **Step 6: Commit**

```
git commit -am "feat(CityTagInput): keyboard reorder via Alt+Arrow on focused chip"
```

---

## Task 2.3 — Drag-to-reorder

- [ ] **Step 1: Add failing test**

```tsx
describe("<CityTagInput> — drag reorder", () => {
  it("dropping chip 0 onto chip 2 reorders to [B, C, A]", () => {
    const onChange = vi.fn();
    render(<CityTagInput value={["A", "B", "C"]} onChange={onChange} />);
    const chipA = screen.getByRole("button", { name: /chip A/i });
    const chipC = screen.getByRole("button", { name: /chip C/i });

    // Native DnD synthetic events: jsdom doesn't simulate dataTransfer, so we
    // pass a minimal stub via the second arg.
    const dt = { setData: vi.fn(), getData: () => "0", effectAllowed: "move" };
    chipA.dispatchEvent(
      new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer: dt as unknown as DataTransfer }),
    );
    chipC.dispatchEvent(
      new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt as unknown as DataTransfer }),
    );

    expect(onChange).toHaveBeenCalledWith(["B", "C", "A"]);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement DnD handlers**

Add inside `CityTagInput`:

```ts
const dragSourceIndex = useRef<number | null>(null);

function handleDragStart(e: React.DragEvent<HTMLButtonElement>, index: number) {
  if (disabled) return;
  dragSourceIndex.current = index;
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", String(index));
}

function handleDrop(e: React.DragEvent<HTMLButtonElement>, targetIndex: number) {
  e.preventDefault();
  const fromStr = e.dataTransfer.getData("text/plain");
  const from = fromStr ? Number(fromStr) : dragSourceIndex.current;
  dragSourceIndex.current = null;
  if (from == null || Number.isNaN(from) || from === targetIndex) return;
  const next = [...value];
  const [moved] = next.splice(from, 1);
  next.splice(targetIndex, 0, moved!);
  onChange(next);
}
```

The chip button already wires `onDragStart`, `onDragOver`, `onDrop` from Task 2.2. Verify they call these handlers.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```
git commit -am "feat(CityTagInput): drag-to-reorder chips"
```

---

## Task 2.4 — Insert-between via gap click

> **Scope decision:** Implement as a minimal, reachable affordance — a small "+" button between chips opens an autocomplete input at that index. Pure-CSS "thin gap" hit-targets are fragile in jsdom; a visible "+" button is testable and accessible. Visual styling can be polished later.

- [ ] **Step 1: Add failing test**

```tsx
describe("<CityTagInput> — insert between", () => {
  it("clicking the gap-+ between chips 0 and 1 opens an input that inserts at index 1", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CityTagInput value={["A", "C"]} onChange={onChange} />);
    const insertBtn = screen.getByRole("button", { name: /inserează între A și C/i });
    await user.click(insertBtn);
    const input = screen.getByLabelText(/oraș nou între A și C/i);
    await user.type(input, "B{Enter}");
    expect(onChange).toHaveBeenCalledWith(["A", "B", "C"]);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Render gap inserters between chips**

Add state + handler:

```ts
const [insertIndex, setInsertIndex] = useState<number | null>(null);
const [insertText, setInsertText] = useState("");

function commitInsert() {
  const trimmed = insertText.trim();
  if (insertIndex == null || !trimmed) {
    setInsertIndex(null);
    setInsertText("");
    return;
  }
  if (value.length >= maxCities) {
    setInsertIndex(null);
    setInsertText("");
    return;
  }
  const next = [...value];
  next.splice(insertIndex, 0, trimmed);
  onChange(next);
  setInsertIndex(null);
  setInsertText("");
}
```

In the JSX, between each pair of chips, render either a `+` button or the active inserter input:

```tsx
{value.map((city, i) => (
  <Fragment key={i}>
    {i > 0 && (
      insertIndex === i ? (
        <input
          autoFocus
          aria-label={`Oraș nou între ${value[i - 1]} și ${value[i]}`}
          value={insertText}
          onChange={(e) => setInsertText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commitInsert(); }
            else if (e.key === "Escape") { setInsertIndex(null); setInsertText(""); }
          }}
          onBlur={commitInsert}
          style={{ minWidth: "100px", border: "1px dashed #d1d5db", borderRadius: "12px", padding: "2px 8px", fontSize: "0.875rem" }}
        />
      ) : (
        <button
          type="button"
          aria-label={`Inserează între ${value[i - 1]} și ${value[i]}`}
          onClick={() => setInsertIndex(i)}
          style={{ background: "none", border: "1px dashed #d1d5db", borderRadius: "999px", width: "18px", height: "18px", padding: 0, cursor: "pointer", color: "#9ca3af", fontSize: "0.75rem" }}
        >
          +
        </button>
      )
    )}
    {/* the existing chip JSX from Task 2.2 here */}
  </Fragment>
))}
```

Wrap the existing per-chip output and the new gap inserter in a `Fragment`. Import `Fragment` from `react`.

> Note: this is a deliberately simple inserter. The autocomplete dropdown for the gap input is **out of scope** for this task — typing + Enter is enough. Acceptance criterion in the spec only requires "choosing a suggestion inserts there"; for v1 the user types the city name. Wire the suggestion dropdown in a follow-up if needed.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```
git commit -am "feat(CityTagInput): click-to-insert between chips"
```

---

## Verification gate for STORY 2

- [ ] `npx vitest run tests/components/CityTagInput.test.tsx` — green.
- [ ] `npx vitest run tests/components/RouteFormDrawer.test.tsx tests/components/RouteDetailPanel.test.tsx tests/components/RoutesFilter.test.tsx` — green (existing routes-admin callers unaffected).
- [ ] `npx tsc --noEmit` — clean (or only the known SignupForm/SignupForm.test breakages from STORY 1).
