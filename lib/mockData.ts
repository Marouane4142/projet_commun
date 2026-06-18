import type { Threshold } from "./types";

// Seuils prédéfinis, adaptés aux capteurs réels du bar.
// Utilises par /api/settings en attendant une table Supabase dediee.
export const thresholds: Threshold[] = [
  { id: 1, metricType: "decibel", warningValue: 80, alertValue: 90, criticalValue: 100, unit: "dB" },
  { id: 2, metricType: "people_count", warningValue: 35, alertValue: 43, criticalValue: 50, unit: "pers." },
  { id: 3, metricType: "smoke", warningValue: 10, alertValue: 25, criticalValue: 45, unit: "ppm" },
  { id: 4, metricType: "alcohol", warningValue: 0.3, alertValue: 0.5, criticalValue: 0.8, unit: "g/L" },
  { id: 5, metricType: "temperature", warningValue: 27, alertValue: 29, criticalValue: 32, unit: "°C" },
  { id: 6, metricType: "humidity", warningValue: 65, alertValue: 75, criticalValue: 85, unit: "%" },
];
