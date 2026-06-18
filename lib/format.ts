import type { MetricType } from "./types";

export const metricLabels: Record<MetricType, string> = {
  temperature: "Température",
  decibel: "Niveau sonore",
  smoke: "Qualité de l'air",
  gas: "Gaz",
  people_count: "Affluence",
  alcohol: "Alcoolémie (éthylotest)",
  humidity: "Humidité",
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
