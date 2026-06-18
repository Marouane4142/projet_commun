import {
  calculateAmbianceScore,
  calculateComfortScore,
  generateAlerts,
  generateRecommendations,
} from "./scores";
import { getCurrentMatch, isMatchInProgress } from "./footballApiService";
import { eventToZones, getEventById } from "./eventService";
import { getSupabaseSoundReadings } from "./soundService";
import type {
  Alert,
  BarZone,
  DashboardData,
  LatestMetrics,
  MetricType,
  SensorReading,
  ZoneScore,
} from "./types";

export async function getAllReadings(limit = 100, eventZones?: BarZone[]) {
  const supabaseSound = await getSupabaseSoundReadings(limit);
  const readings = eventZones
    ? mapReadingsToEventZones(supabaseSound, eventZones)
    : supabaseSound;

  return readings
    .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())
    .slice(0, limit);
}

function mapReadingsToEventZones(readings: SensorReading[], eventZones: BarZone[]) {
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

export async function getDashboardData(input?: {
  eventId?: string | null;
  matchId?: string | null;
}): Promise<DashboardData> {
  const event = input?.eventId ? await getEventById(input.eventId) : null;
  const matchId = event?.matchId ?? input?.matchId;
  const eventZones = eventToZones(event);
  const [match, allReadings] = await Promise.all([
    getCurrentMatch(matchId),
    getAllReadings(240, eventZones),
  ]);
  const readings = event ? keepReadingsAfter(allReadings, event.createdAt) : allReadings;

  // Le duel des zones se joue uniquement sur le son. Le reste de l'écosystème
  // (affluence, air, alcool, climat) est affiché par <EcosystemLive/>, qui
  // interroge /api/ecosystem directement : pas besoin de le recalculer ici.
  const zoneScores = eventZones.map((zone) => buildZoneScore(zone, readings));
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

function buildZoneScore(zone: BarZone, readings: SensorReading[]): ZoneScore {
  const zoneReadings = readings.filter((reading) => reading.zoneId === zone.id);
  const latest = buildLatestMetrics(zoneReadings);
  const liveMetrics = getLiveMetrics(latest);
  const missingMetrics = allMetricTypes.filter((type) => !liveMetrics.includes(type));
  const soundValues = zoneReadings
    .filter((reading) => reading.type === "decibel")
    .map((reading) => reading.value);
  const soundPeak = soundValues.length > 0 ? Math.max(...soundValues) : null;
  const ambianceScore = calculateAmbianceScore({
    decibels: latest.decibel?.value,
    peopleCount: latest.people_count?.value,
    maxCapacity: zone.maxCapacity,
    recentSoundPeak: soundPeak ?? undefined,
  });
  const comfortScore = calculateComfortScore({
    temperature: latest.temperature?.value,
    peopleCount: latest.people_count?.value,
    smoke: latest.smoke?.value,
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
    return "En attente de données sonores réelles.";
  }

  if (zoneA.ambianceScore === null) return `${zoneB.zone.name} est la seule zone avec données live.`;
  if (zoneB.ambianceScore === null) return `${zoneA.zone.name} est la seule zone avec données live.`;

  const diff = Math.abs(zoneA.ambianceScore - zoneB.ambianceScore);

  if (diff < 8) return "Ambiance équilibrée entre les deux camps.";

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
