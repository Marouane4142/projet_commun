import type { BarZone, MetricType, Sensor, Threshold } from "./types";

export const zones: BarZone[] = [
  {
    id: 1,
    name: "Zone A",
    supporterTeam: "France",
    color: "#2563eb",
    maxCapacity: 80,
  },
  {
    id: 2,
    name: "Zone B",
    supporterTeam: "Bresil",
    color: "#facc15",
    maxCapacity: 80,
  },
];

const definitions: Array<{ type: MetricType; label: string; unit: string }> = [
  { type: "temperature", label: "Temperature", unit: "C" },
  { type: "decibel", label: "Decibels", unit: "dB" },
  { type: "smoke", label: "Fumee", unit: "%" },
  { type: "gas", label: "Gaz", unit: "ppm" },
  { type: "people_count", label: "Personnes", unit: "pers." },
];

export const sensors: Sensor[] = zones.flatMap((zone, zoneIndex) =>
  definitions.map((definition, index) => ({
    id: zoneIndex * definitions.length + index + 1,
    name: `${definition.label} - ${zone.name}`,
    type: definition.type,
    unit: definition.unit,
    zoneId: zone.id,
    isActive: true,
  })),
);

// Seuils prédéfinis, adaptés aux capteurs réels du bar.
export const thresholds: Threshold[] = [
  { id: 1, metricType: "decibel", warningValue: 80, alertValue: 90, criticalValue: 100, unit: "dB" },
  { id: 2, metricType: "people_count", warningValue: 35, alertValue: 43, criticalValue: 50, unit: "pers." },
  { id: 3, metricType: "smoke", warningValue: 10, alertValue: 25, criticalValue: 45, unit: "ppm" },
  { id: 4, metricType: "alcohol", warningValue: 0.3, alertValue: 0.5, criticalValue: 0.8, unit: "g/L" },
  { id: 5, metricType: "temperature", warningValue: 27, alertValue: 29, criticalValue: 32, unit: "°C" },
  { id: 6, metricType: "humidity", warningValue: 65, alertValue: 75, criticalValue: 85, unit: "%" },
];
