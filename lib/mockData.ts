import { getReadingStatus } from "./scores";
import type {
  Alert,
  BarZone,
  MatchEvent,
  MatchSnapshot,
  MetricType,
  Sensor,
  SensorReading,
  Threshold,
} from "./types";

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

export const thresholds: Threshold[] = [
  { id: 1, metricType: "decibel", warningValue: 75, alertValue: 90, criticalValue: 100, unit: "dB" },
  { id: 2, metricType: "temperature", warningValue: 26, alertValue: 29, criticalValue: 32, unit: "C" },
  { id: 3, metricType: "smoke", warningValue: 10, alertValue: 25, criticalValue: 45, unit: "%" },
  { id: 4, metricType: "gas", warningValue: 350, alertValue: 650, criticalValue: 900, unit: "ppm" },
  { id: 5, metricType: "people_count", warningValue: 65, alertValue: 80, criticalValue: 90, unit: "pers." },
];

export function getMockMatch(): MatchSnapshot {
  const elapsed = Math.floor((Date.now() / 1000 / 60) % 92);
  const minute = Math.max(1, elapsed);
  const homeScore = minute > 18 ? 1 : 0;
  const awayScore = minute > 42 ? 1 : 0;
  const finalHomeScore = minute > 64 ? 2 : homeScore;

  return {
    id: 1,
    externalId: "mock-france-brazil",
    competition: "Coupe du Monde",
    homeTeam: "France",
    awayTeam: "Bresil",
    homeScore: finalHomeScore,
    awayScore,
    status: minute >= 90 ? "finished" : minute === 45 ? "halftime" : "live",
    minute,
    kickoffAt: new Date(Date.now() - minute * 60 * 1000).toISOString(),
    lastSyncedAt: new Date().toISOString(),
    events: getMockMatchEvents(minute),
    source: "mock",
  };
}

export function getMockMatchEvents(minute = 90): MatchEvent[] {
  const events: MatchEvent[] = [
    {
      id: 1,
      matchId: 1,
      minute: 18,
      type: "goal",
      team: "France",
      player: "Mbappe",
      description: "But de la France, grosse reaction Zone A.",
      createdAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    },
    {
      id: 2,
      matchId: 1,
      minute: 42,
      type: "goal",
      team: "Bresil",
      player: "Vinicius Jr",
      description: "Egalisation du Bresil, la Zone B se reveille.",
      createdAt: new Date(Date.now() - 26 * 60 * 1000).toISOString(),
    },
    {
      id: 3,
      matchId: 1,
      minute: 64,
      type: "goal",
      team: "France",
      player: "Griezmann",
      description: "La France reprend l'avantage.",
      createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    },
  ];

  return events.filter((event) => event.minute <= minute);
}

export function getMockReadings(pointsPerSensor = 12): SensorReading[] {
  const now = Date.now();
  const readings: SensorReading[] = [];

  for (const sensor of sensors) {
    for (let index = pointsPerSensor - 1; index >= 0; index -= 1) {
      const value = getMockValue(sensor, index);
      const measuredAt = new Date(now - index * 5 * 60 * 1000).toISOString();

      readings.push({
        id: sensor.id * 1000 + index,
        sensorId: sensor.id,
        zoneId: sensor.zoneId,
        type: sensor.type,
        value,
        unit: sensor.unit,
        status: getReadingStatus(sensor.type, value),
        measuredAt,
        createdAt: measuredAt,
        source: "mock",
      });
    }
  }

  return readings.sort(
    (a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime(),
  );
}

function getMockValue(sensor: Sensor, index: number) {
  const wave = Math.sin((Date.now() / 60000 + index) / 2) * 4;
  const zoneBoost = sensor.zoneId === 1 ? 1 : -1;

  if (sensor.type === "decibel") return Math.round(74 + wave + zoneBoost * 5 + (index % 3));
  if (sensor.type === "temperature") return Number((24 + wave / 4 + zoneBoost * 0.6).toFixed(1));
  if (sensor.type === "smoke") return Math.max(0, Math.round(3 + zoneBoost + (index % 5 === 0 ? 7 : 0)));
  if (sensor.type === "gas") return Math.round(240 + wave * 14 + zoneBoost * 20);
  return Math.round(52 + wave * 2 + zoneBoost * 8 + (index % 4));
}

export function getMockAlerts(): Alert[] {
  return [
    {
      id: 1,
      zoneId: 1,
      type: "decibel",
      severity: "warning",
      message: "Ambiance tres forte en Zone A.",
      isResolved: false,
      triggeredAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    },
    {
      id: 2,
      zoneId: 2,
      type: "temperature",
      severity: "warning",
      message: "Temperature en hausse en Zone B.",
      isResolved: false,
      triggeredAt: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
    },
  ];
}
