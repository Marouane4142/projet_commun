import { anonSensorClient } from "./sensorClients";
import { computeEventStats } from "./eventStats";
import type { FanEvent, FanEventStatus, MatchOption } from "./types";

const tableName = "g1a_events";

type SupabaseEventRow = {
  id: number;
  name: string;
  match_id: string;
  competition: string | null;
  home_team: string;
  away_team: string;
  kickoff_at: string | null;
  zone_a_team: string;
  zone_b_team: string;
  zone_a_card: string;
  zone_b_card: string;
  status: FanEventStatus;
  final_home_score: number | null;
  final_away_score: number | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
  stat_avg_sound: number | null;
  stat_zone_a_sound: number | null;
  stat_zone_b_sound: number | null;
  stat_avg_temperature: number | null;
  stat_avg_alcohol: number | null;
  stat_peak_affluence: number | null;
};

export type CreateEventInput = {
  name: string;
  match: MatchOption;
  zoneATeam: string;
  zoneBTeam: string;
  zoneACard: string;
  zoneBCard: string;
  status?: FanEventStatus;
};

export async function listEvents(input?: { status?: FanEventStatus | null }) {
  const supabase = anonSensorClient();
  let query = supabase
    .from(tableName)
    .select(eventSelect)
    .order("created_at", { ascending: false });

  if (input?.status) {
    query = query.eq("status", input.status);
  }

  const { data, error } = await query;

  if (error) {
    return {
      events: [] as FanEvent[],
      message: error.message,
    };
  }

  return {
    events: ((data ?? []) as unknown as SupabaseEventRow[]).map(mapEvent),
    message: null,
  };
}

export async function getEventById(id?: string | null) {
  const numericId = Number(id);

  if (!Number.isFinite(numericId) || numericId <= 0) {
    return null;
  }

  const supabase = anonSensorClient();
  const { data, error } = await supabase
    .from(tableName)
    .select(eventSelect)
    .eq("id", numericId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapEvent(data as unknown as SupabaseEventRow);
}

export async function createEvent(input: CreateEventInput) {
  const supabase = anonSensorClient();

  // Anti-doublon : un match déjà utilisé (événement en cours ou terminé dans
  // l'historique) ne peut pas être reprogrammé.
  const { data: existing } = await supabase
    .from(tableName)
    .select("id, status")
    .eq("match_id", input.match.id)
    .in("status", ["planned", "active", "finished"])
    .limit(1);

  if (existing && existing.length > 0) {
    const status = (existing[0] as { status: string }).status;
    throw new Error(
      status === "finished"
        ? "Ce match figure déjà dans l'historique : impossible de le reprogrammer."
        : "Un événement existe déjà pour ce match.",
    );
  }

  const { data, error } = await supabase
    .from(tableName)
    .insert({
      name: input.name.trim(),
      match_id: input.match.id,
      competition: input.match.competition,
      home_team: input.match.homeTeam,
      away_team: input.match.awayTeam,
      kickoff_at: input.match.kickoffAt,
      zone_a_team: input.zoneATeam.trim(),
      zone_b_team: input.zoneBTeam.trim(),
      zone_a_card: input.zoneACard.trim(),
      zone_b_card: input.zoneBCard.trim(),
      status: input.status ?? "planned",
    })
    .select(eventSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapEvent(data as unknown as SupabaseEventRow);
}

export async function updateEventStatus(input: {
  id: string;
  status: FanEventStatus;
  finalHomeScore?: number | null;
  finalAwayScore?: number | null;
}) {
  const numericId = Number(input.id);

  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error("Event id is invalid.");
  }

  const payload: Record<string, string | number | null> = {
    status: input.status,
  };

  if (input.status === "finished") {
    const finishedAt = new Date().toISOString();
    payload.finished_at = finishedAt;
    payload.final_home_score = input.finalHomeScore ?? null;
    payload.final_away_score = input.finalAwayScore ?? null;

    // Capture des statistiques sur toute la durée de l'événement (classements).
    const existing = await getEventById(input.id);
    if (existing) {
      const cardA = parseCardId(existing.zoneA.card) ?? null;
      const cardB = parseCardId(existing.zoneB.card) ?? null;
      const stats = await computeEventStats(existing.createdAt, finishedAt, cardA, cardB);
      payload.stat_avg_sound = stats.avgSound;
      payload.stat_zone_a_sound = stats.zoneASound;
      payload.stat_zone_b_sound = stats.zoneBSound;
      payload.stat_avg_temperature = stats.avgTemperature;
      payload.stat_avg_alcohol = stats.avgAlcohol;
      payload.stat_peak_affluence = stats.peakAffluence;
    }
  }

  const supabase = anonSensorClient();
  const { data, error } = await supabase
    .from(tableName)
    .update(payload)
    .eq("id", numericId)
    .select(eventSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapEvent(data as unknown as SupabaseEventRow);
}

export function eventToZones(event: FanEvent | null) {
  return [
    {
      id: 1,
      name: event?.zoneA.label ?? "Zone A",
      supporterTeam: event?.zoneA.team ?? "Équipe A",
      color: event?.zoneA.color ?? "#2563eb",
      maxCapacity: 80,
      card: event?.zoneA.card,
      cardId: parseCardId(event?.zoneA.card),
    },
    {
      id: 2,
      name: event?.zoneB.label ?? "Zone B",
      supporterTeam: event?.zoneB.team ?? "Équipe B",
      color: event?.zoneB.color ?? "#facc15",
      maxCapacity: 80,
      card: event?.zoneB.card,
      cardId: parseCardId(event?.zoneB.card),
    },
  ];
}

const eventSelect = [
  "id",
  "name",
  "match_id",
  "competition",
  "home_team",
  "away_team",
  "kickoff_at",
  "zone_a_team",
  "zone_b_team",
  "zone_a_card",
  "zone_b_card",
  "status",
  "final_home_score",
  "final_away_score",
  "finished_at",
  "created_at",
  "updated_at",
  "stat_avg_sound",
  "stat_zone_a_sound",
  "stat_zone_b_sound",
  "stat_avg_temperature",
  "stat_avg_alcohol",
  "stat_peak_affluence",
].join(", ");

function mapEvent(row: SupabaseEventRow): FanEvent {
  const kickoffAt = row.kickoff_at ?? new Date().toISOString();

  return {
    id: row.id,
    name: row.name,
    matchId: row.match_id,
    competition: normalizeCompetition(row.competition),
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    kickoffAt,
    zoneA: {
      zoneId: 1,
      label: "Zone A",
      team: row.zone_a_team,
      card: row.zone_a_card,
      color: "#2563eb",
    },
    zoneB: {
      zoneId: 2,
      label: "Zone B",
      team: row.zone_b_team,
      card: row.zone_b_card,
      color: "#facc15",
    },
    status: row.status,
    finalHomeScore: row.final_home_score,
    finalAwayScore: row.final_away_score,
    finishedAt: row.finished_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    stats: {
      avgSound: row.stat_avg_sound,
      zoneASound: row.stat_zone_a_sound,
      zoneBSound: row.stat_zone_b_sound,
      avgTemperature: row.stat_avg_temperature,
      avgAlcohol: row.stat_avg_alcohol,
      peakAffluence: row.stat_peak_affluence,
    },
  };
}

function normalizeCompetition(competition: string | null): string {
  if (!competition) return "Compétition";
  if (/world cup/i.test(competition)) return "Coupe du Monde";
  return competition;
}

function parseCardId(card?: string) {
  if (!card) return undefined;
  const match = card.match(/(\d+)\D*$/);
  if (!match) return undefined;

  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}
