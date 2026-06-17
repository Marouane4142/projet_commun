import {
  calculateAmbianceScore,
  calculateComfortScore,
  generateAlerts,
  generateRecommendations,
} from "./scores";
import { getCurrentMatch, isMatchInProgress } from "./footballApiService";
import { eventToZones, getEventById } from "./eventService";
import { getEcosystemSnapshot } from "./ecosystemService";
import { sensors } from "./mockData";
import { createSupabaseSoundReading, getSupabaseSoundReadings } from "./soundService";
import type {
  Alert,
  BarZone,
  DashboardData,
  DashboardVenue,
  LatestMetrics,
  MetricType,
  Sensor,
  SensorReading,
  ZoneScore,
} from "./types";

type VenueContext = { people: number | null; smoke: number | null };

export async function getAllReadings(limit = 100, eventZones?: BarZone[]) {
  const supabaseSound = await getSupabaseSoundReadings(limit);
  const readings = eventZones
    ? mapReadingsToEventZones(supabaseSound, eventZones)
    : supabaseSound;

  return readings
    .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())
    .slice(0, limit);
}

export function mapReadingsToEventZones(readings: SensorReading[], eventZones: BarZone[]) {
  const zoneByCard = new Map<number, number>();

  for (const zone of eventZones) {
    if (typeof zone.cardId === "number") {
      zoneByCard.set(zone.cardId, zone.id);
    }
  }

  return readings.map((reading) => {
    if (typeof reading.electronicCard !== "number") {
      return reading;
    }

    return {
      ...reading,
      zoneId: zoneByCard.get(reading.electronicCard) ?? 0,
    };
  });
}

export async function getSensorsWithLatest(): Promise<Sensor[]> {
  const readings = await getAllReadings(200);

  return sensors.map((sensor) => ({
    ...sensor,
    latestReading: readings.find(
      (reading) => reading.sensorId === sensor.id || (sensor.id === 2 && reading.source === "supabase"),
    ),
  }));
}

export async function getDashboardData(input?: {
  eventId?: string | null;
  matchId?: string | null;
}): Promise<DashboardData> {
  const event = input?.eventId ? await getEventById(input.eventId) : null;
  const matchId = event?.matchId ?? input?.matchId;
  const eventZones = eventToZones(event);
  const [match, allReadings, eco] = await Promise.all([
    getCurrentMatch(matchId),
    getAllReadings(240, eventZones),
    getEcosystemSnapshot(),
  ]);
  const readings = event ? keepReadingsAfter(allReadings, event.createdAt) : allReadings;

  const affluenceDomain = eco.domains.find((d) => d.key === "affluence");
  const airDomain = eco.domains.find((d) => d.key === "air");
  const venueContext: VenueContext = {
    people: eco.occupancy.current,
    smoke: airDomain?.value ?? null,
  };
  const venue: DashboardVenue = {
    occupancy: {
      current: eco.occupancy.current,
      capacity: eco.occupancy.capacity,
      ratio: eco.occupancy.ratio,
    },
    affluence: {
      value: affluenceDomain?.value ?? null,
      unit: affluenceDomain?.unit ?? "pers.",
      status: affluenceDomain?.readingStatus ?? null,
      live: affluenceDomain?.status === "live",
    },
    air: {
      value: airDomain?.value ?? null,
      unit: airDomain?.unit ?? "ppm",
      status: airDomain?.readingStatus ?? null,
      live: airDomain?.status === "live",
    },
    indices: eco.indices,
    alerts: eco.alerts,
  };

  const zoneScores = eventZones.map((zone) => buildZoneScore(zone, readings, venueContext));
  const winner = zoneScores.reduce<ZoneScore | null>((current, zone) => {
    if (zone.ambianceScore === null) return current;
    if (!current || current.ambianceScore === null || zone.ambianceScore > current.ambianceScore) {
      return zone;
    }
    return current;
  }, null);
  const missingSensorTables = getMissingMetrics(readings);

  return {
    event,
    match,
    zones: zoneScores,
    winner,
    venue,
    globalSummary: buildGlobalSummary(zoneScores),
    sources: {
      matchLive: match.source === "api" && isMatchInProgress(match.status),
      soundLive: readings.some((reading) => reading.type === "decibel" && reading.source === "supabase"),
      refreshMs: 2_000,
      externalMatchRefreshMs: 120_000,
      missingSensorTables,
    },
    generatedAt: new Date().toISOString(),
  };
}

function keepReadingsAfter(readings: SensorReading[], startValue: string) {
  const start = new Date(startValue).getTime();

  if (!Number.isFinite(start)) {
    return readings;
  }

  return readings.filter((reading) => {
    const measuredAt = new Date(reading.measuredAt).getTime();
    return Number.isFinite(measuredAt) && measuredAt >= start;
  });
}

export async function getActiveAlerts(): Promise<Alert[]> {
  const dashboard = await getDashboardData();
  return dashboard.zones.flatMap((zone) => zone.alerts).filter((alert) => !alert.isResolved);
}

export async function createReading(input: {
  sensorId: number;
  zoneId: number;
  type: MetricType;
  value: number;
  unit?: string;
  measuredAt?: string;
  electronicCard?: number;
}) {
  const measuredAt = input.measuredAt ?? new Date().toISOString();

  if (input.type === "decibel") {
    return createSupabaseSoundReading({
      value: input.value,
      measuredAt,
      electronicCard: input.electronicCard ?? input.zoneId,
    });
  }

  throw new Error(
    `La source reelle ${input.type} pour la zone ${input.zoneId} n'est pas encore connectee.`,
  );
}

function buildZoneScore(
  zone: BarZone,
  readings: SensorReading[],
  venue?: VenueContext,
): ZoneScore {
  const zoneReadings = readings.filter((reading) => reading.zoneId === zone.id);
  const latest = buildLatestMetrics(zoneReadings);
  const liveMetrics = getLiveMetrics(latest);
  const missingMetrics = allMetricTypes.filter((type) => !liveMetrics.includes(type));
  const soundValues = zoneReadings
    .filter((reading) => reading.type === "decibel")
    .map((reading) => reading.value);
  const soundPeak = soundValues.length > 0 ? Math.max(...soundValues) : null;
  // Affluence (G1B) et fumee (G1C) sont des mesures niveau salle : on les
  // partage entre les deux zones pour enrichir les scores quand la zone n'a
  // pas sa propre valeur.
  const peopleCount = latest.people_count?.value ?? venue?.people ?? undefined;
  const smokeValue = latest.smoke?.value ?? venue?.smoke ?? undefined;
  const ambianceScore = calculateAmbianceScore({
    decibels: latest.decibel?.value,
    peopleCount,
    maxCapacity: zone.maxCapacity,
    recentSoundPeak: soundPeak ?? undefined,
  });
  const comfortScore = calculateComfortScore({
    temperature: latest.temperature?.value,
    peopleCount,
    smoke: smokeValue,
    gas: latest.gas?.value,
    maxCapacity: zone.maxCapacity,
  });

  return {
    zone,
    latest,
    history: zoneReadings,
    ambianceScore,
    comfortScore,
    soundPeak,
    liveMetrics,
    missingMetrics,
    recommendations: generateRecommendations(zone, latest),
    alerts: generateAlerts(zone, latest),
  };
}

function buildLatestMetrics(readings: SensorReading[]) {
  return readings.reduce<LatestMetrics>((latest, reading) => {
    const previous = latest[reading.type];

    if (!previous || new Date(reading.measuredAt) > new Date(previous.measuredAt)) {
      latest[reading.type] = reading;
    }

    return latest;
  }, {});
}

function buildGlobalSummary(zonesData: ZoneScore[]) {
  if (zonesData.length < 2) return "Ambiance en cours de mesure.";

  const [zoneA, zoneB] = zonesData;
  if (zoneA.ambianceScore === null && zoneB.ambianceScore === null) {
    return "En attente de donnees sonores reelles.";
  }

  if (zoneA.ambianceScore === null) return `${zoneB.zone.name} est la seule zone avec donnees live.`;
  if (zoneB.ambianceScore === null) return `${zoneA.zone.name} est la seule zone avec donnees live.`;

  const diff = Math.abs(zoneA.ambianceScore - zoneB.ambianceScore);

  if (diff < 8) return "Ambiance equilibree entre les deux camps.";

  const winner = zoneA.ambianceScore > zoneB.ambianceScore ? zoneA : zoneB;
  return `${winner.zone.name} domine l'ambiance pour le moment.`;
}

const allMetricTypes: MetricType[] = ["temperature", "decibel", "smoke", "gas", "people_count"];

function getLiveMetrics(latest: LatestMetrics) {
  return allMetricTypes.filter((type) => Boolean(latest[type]));
}

function getMissingMetrics(readings: SensorReading[]) {
  const present = new Set(readings.map((reading) => reading.type));
  return allMetricTypes.filter((type) => !present.has(type));
}
