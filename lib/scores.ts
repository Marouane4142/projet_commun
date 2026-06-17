import type {
  Alert,
  AlertSeverity,
  BarZone,
  LatestMetrics,
  MetricType,
  ReadingStatus,
  SensorReading,
} from "./types";

export function clamp(value: number, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

export function getReadingStatus(type: MetricType, value: number): ReadingStatus {
  if (type === "decibel") {
    if (value >= 100) return "critical";
    if (value >= 90) return "alert";
    if (value >= 75) return "warning";
    return "ok";
  }

  if (type === "temperature") {
    if (value >= 32) return "critical";
    if (value >= 29) return "alert";
    if (value >= 26) return "warning";
    return "ok";
  }

  if (type === "smoke") {
    if (value >= 45) return "critical";
    if (value >= 25) return "alert";
    if (value >= 10) return "warning";
    return "ok";
  }

  if (type === "gas") {
    if (value >= 900) return "critical";
    if (value >= 650) return "alert";
    if (value >= 350) return "warning";
    return "ok";
  }

  if (value >= 90) return "critical";
  if (value >= 80) return "alert";
  if (value >= 65) return "warning";
  return "ok";
}

export function calculateAmbianceScore(input: {
  decibels?: number;
  peopleCount?: number;
  maxCapacity: number;
  recentSoundPeak?: number;
}) {
  if (typeof input.decibels !== "number") {
    return null;
  }

  const db = input.decibels ?? 0;
  const dbScore = clamp(((db - 40) / 60) * 100);
  const crowdScore = clamp(((input.peopleCount ?? 0) / input.maxCapacity) * 100);
  const peakBonus = input.recentSoundPeak && input.recentSoundPeak - db > 8 ? 6 : 0;

  return Math.round(clamp(dbScore * 0.7 + crowdScore * 0.3 + peakBonus));
}

export function calculateComfortScore(input: {
  temperature?: number;
  peopleCount?: number;
  maxCapacity: number;
  smoke?: number;
  gas?: number;
}) {
  const hasComfortSignal =
    typeof input.temperature === "number" ||
    typeof input.peopleCount === "number" ||
    typeof input.smoke === "number" ||
    typeof input.gas === "number";

  if (!hasComfortSignal) {
    return null;
  }

  let score = 100;
  const temperature = input.temperature ?? 22;
  const occupancy = ((input.peopleCount ?? 0) / input.maxCapacity) * 100;

  if (temperature > 24) score -= (temperature - 24) * 5;
  if (temperature < 20) score -= (20 - temperature) * 3;
  if (occupancy > 75) score -= (occupancy - 75) * 0.8;
  if ((input.smoke ?? 0) > 0) score -= Math.min((input.smoke ?? 0) * 2.2, 45);
  if ((input.gas ?? 0) > 350) score -= Math.min(((input.gas ?? 0) - 350) / 12, 35);

  return Math.round(clamp(score));
}

export function generateRecommendations(zone: BarZone, latest: LatestMetrics) {
  const recommendations: string[] = [];
  const hasAnyMetric = Object.values(latest).some(Boolean);
  const temp = latest.temperature?.value ?? 0;
  const people = latest.people_count?.value ?? 0;
  const db = latest.decibel?.value ?? 0;
  const smoke = latest.smoke?.value ?? 0;
  const gas = latest.gas?.value ?? 0;

  if (temp > 26 && people > zone.maxCapacity * 0.7) {
    recommendations.push(`Augmenter la climatisation en ${zone.name}.`);
  }

  if (db > 90) {
    recommendations.push(`Ambiance tres forte en ${zone.name}.`);
  }

  if (smoke > 0) {
    recommendations.push(`Aerer ${zone.name}.`);
  }

  if (gas > 350) {
    recommendations.push(`Surveiller la qualite de l'air en ${zone.name}.`);
  }

  if (people > zone.maxCapacity) {
    recommendations.push(`Limiter les nouvelles entrees en ${zone.name}.`);
  }

  if (!hasAnyMetric) {
    recommendations.push(`En attente de donnees capteurs reelles pour ${zone.name}.`);
  } else if (recommendations.length === 0) {
    recommendations.push(`${zone.name} reste confortable pour le moment.`);
  }

  return recommendations;
}

function severityFromStatus(status: ReadingStatus): AlertSeverity {
  if (status === "critical") return "critical";
  if (status === "alert") return "alert";
  if (status === "warning") return "warning";
  return "info";
}

export function generateAlerts(zone: BarZone, latest: LatestMetrics): Alert[] {
  const now = new Date().toISOString();
  const alertTypes: MetricType[] = ["decibel", "temperature", "smoke", "gas", "people_count"];

  return alertTypes
    .map((type, index) => {
      const reading = latest[type];

      if (!reading || reading.status === "ok") {
        return null;
      }

      return {
        id: zone.id * 100 + index,
        zoneId: zone.id,
        type,
        severity: severityFromStatus(reading.status),
        message: buildAlertMessage(zone.name, reading),
        isResolved: false,
        triggeredAt: now,
      };
    })
    .filter((alert): alert is Alert => Boolean(alert));
}

function buildAlertMessage(zoneName: string, reading: SensorReading) {
  if (reading.type === "decibel") return `Niveau sonore eleve en ${zoneName}.`;
  if (reading.type === "temperature") return `Temperature elevee en ${zoneName}.`;
  if (reading.type === "smoke") return `Fumee detectee en ${zoneName}.`;
  if (reading.type === "gas") return `Gaz eleve en ${zoneName}.`;
  return `Affluence elevee en ${zoneName}.`;
}
