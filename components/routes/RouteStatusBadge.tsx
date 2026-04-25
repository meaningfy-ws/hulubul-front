import type { RouteStatus } from "@/lib/routes-types";

const LABELS: Record<RouteStatus, string> = {
  approved: "Aprobat",
  draft: "Ciornă",
  suspended: "Suspendat",
};

const COLORS: Record<RouteStatus, string> = {
  approved: "#22c55e",
  draft: "#f59e0b",
  suspended: "#ef4444",
};

interface Props {
  status: RouteStatus;
}

export function RouteStatusBadge({ status }: Props) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "12px",
        fontSize: "0.75rem",
        fontWeight: 600,
        color: "#fff",
        backgroundColor: COLORS[status],
      }}
    >
      {LABELS[status]}
    </span>
  );
}
