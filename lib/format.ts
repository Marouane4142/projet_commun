import type { MetricType, ReadingStatus } from "./types";

export const metricLabels: Record<MetricType, string> = {
  temperature: "Temperature",
  decibel: "Decibels",
  smoke: "Fumee",
  gas: "Gaz",
  people_count: "Personnes",
};

export const statusLabels: Record<ReadingStatus, string> = {
  ok: "OK",
  warning: "Warning",
  alert: "Alerte",
  critical: "Critique",
};

export function formatDateTime(value?: string) {
  if (!value) return "--";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export function formatValue(value?: number, unit = "") {
  if (typeof value !== "number") return "--";
  const rounded = Number.isInteger(value) ? value.toString() : value.toFixed(1);
  return `${rounded}${unit ? ` ${unit}` : ""}`;
}

export function statusClass(status: ReadingStatus) {
  if (status === "critical") return "border-rose-400/50 bg-rose-500/15 text-rose-100";
  if (status === "alert") return "border-orange-400/50 bg-orange-500/15 text-orange-100";
  if (status === "warning") return "border-amber-400/50 bg-amber-500/15 text-amber-100";
  return "border-emerald-400/40 bg-emerald-500/15 text-emerald-100";
}
