import { anonSensorClient } from "./sensorClients";
import type { EventStats } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Décalage (ms) entre l'heure de Paris et UTC à une date donnée (gère l'heure d'été). */
function parisOffsetMs(date: Date): number {
  const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const paris = new Date(date.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  return paris.getTime() - utc.getTime();
}

function average(values: number[], decimals: number): number | null {
  if (values.length === 0) return null;
  const factor = 10 ** decimals;
  return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * factor) / factor;
}

const EMPTY: EventStats = {
  avgSound: null,
  zoneASound: null,
  zoneBSound: null,
  avgTemperature: null,
  avgAlcohol: null,
  peakAffluence: null,
};

/**
 * Statistiques d'un événement sur toute sa durée (classements de l'historique).
 *
 * Fuseaux horaires : g1a_sound et g1e_measurements sont en VRAI UTC (même base
 * que les dates d'événement) -> fenêtre UTC. g1b et g1d stockent l'heure locale
 * étiquetée UTC -> on décale leur fenêtre de l'offset de Paris.
 *
 * Affluence : c'est une occupation courante (toujours "dernière valeur connue").
 * Le pic = max entre l'occupation au coup d'envoi et toutes les valeurs pendant
 * l'événement (donc même un pic atteint juste avant le début est pris en compte).
 */
export async function computeEventStats(
  startIso: string,
  endIso: string,
  cardA?: number | null,
  cardB?: number | null,
): Promise<EventStats> {
  try {
    const supabase = anonSensorClient();
    const start = new Date(startIso);
    const end = new Date(endIso);
    const offset = parisOffsetMs(end);
    const startLocal = new Date(start.getTime() + offset).toISOString();
    const endLocal = new Date(end.getTime() + offset).toISOString();

    const [sound, env, alcohol, affluence] = await Promise.all([
      // son : vrai UTC
      supabase
        .from("g1a_sound")
        .select("db_value, electronic_card")
        .gte("measured_at", startIso)
        .lte("measured_at", endIso)
        .limit(5000),
      // climat : vrai UTC
      supabase
        .from("G1E_measurements")
        .select("value, type")
        .gte("created_at", startIso)
        .lte("created_at", endIso)
        .limit(5000),
      // alcoolemie : heure locale
      supabase
        .from("g1d_mq3_measurements")
        .select("alcohol_level")
        .gte("measured_at", startLocal)
        .lte("measured_at", endLocal)
        .limit(5000),
      // affluence : heure locale, on remonte avant le debut pour l'occupation initiale
      supabase
        .from("g1b_compteur_personnes")
        .select("nb_personnes, created_at")
        .lte("created_at", endLocal)
        .order("created_at", { ascending: false })
        .limit(5000),
    ]);

    const soundRows = (sound.data ?? []) as { db_value: number; electronic_card: number | null }[];
    const avgSound = average(soundRows.map((r) => r.db_value), 0);
    const zoneASound =
      cardA != null
        ? average(soundRows.filter((r) => r.electronic_card === cardA).map((r) => r.db_value), 0)
        : null;
    const zoneBSound =
      cardB != null
        ? average(soundRows.filter((r) => r.electronic_card === cardB).map((r) => r.db_value), 0)
        : null;

    const tempVals = (env.data ?? [])
      .filter((r: any) => String(r.type).toLowerCase().includes("temp"))
      .map((r: any) => r.value as number);

    const alcoholVals = (alcohol.data ?? []).map((r: any) => r.alcohol_level as number);

    // Pic d'affluence : valeurs pendant l'evenement + occupation au coup d'envoi.
    const affRows = (affluence.data ?? []) as { nb_personnes: number; created_at: string }[];
    const during = affRows.filter((r) => r.created_at >= startLocal && r.created_at <= endLocal);
    const beforeStart = affRows.find((r) => r.created_at < startLocal); // le plus recent avant
    const affPool = [...during.map((r) => r.nb_personnes)];
    if (beforeStart) affPool.push(beforeStart.nb_personnes);
    const peakAffluence = affPool.length ? Math.max(...affPool) : null;

    return {
      avgSound,
      zoneASound,
      zoneBSound,
      avgTemperature: average(tempVals, 1),
      avgAlcohol: average(alcoholVals, 2),
      peakAffluence,
    };
  } catch {
    return EMPTY;
  }
}
