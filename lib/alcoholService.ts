import { anonSensorClient } from "./sensorClients";
import { getReadingStatus } from "./scores";
import type { AlcoholPerson, AlcoholReport, AlcoholPoint } from "./types";

const ALCOHOL_LIMIT = 0.5; // limite legale indicative (g/L)
const MAX_ROWS = 2000;

type Row = {
  measured_at: string;
  alcohol_level: number;
  subject_id: number | string | null;
  device_id: number | string | null;
};

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Rapport complet d'alcoolemie (capteur G1D) : serie temporelle par personne,
 * statistiques, et liste des personnes au-dessus de la limite legale.
 */
export async function getAlcoholReport(): Promise<AlcoholReport> {
  const generatedAt = new Date().toISOString();
  try {
    const supabase = anonSensorClient();
    const { data, error } = await supabase
      .from("g1d_mq3_measurements")
      .select("measured_at, alcohol_level, subject_id, device_id")
      .order("measured_at", { ascending: false })
      .limit(MAX_ROWS);

    if (error || !data) {
      return emptyReport(generatedAt);
    }

    const rows = data as Row[];

    // Alias eventuels (renommage par un gerant) : subject_id -> nom affiche.
    const aliases = new Map<string, string>();
    try {
      const { data: aliasRows } = await supabase
        .from("g1a_subject_aliases")
        .select("subject_id, alias");
      for (const a of (aliasRows ?? []) as { subject_id: string; alias: string }[]) {
        aliases.set(String(a.subject_id), a.alias);
      }
    } catch {
      /* table absente : on garde les noms par defaut */
    }

    // Liaisons compte <-> sujet (associees par un gerant).
    const links = new Map<string, string>();
    try {
      const { data: linkRows } = await supabase
        .from("g1a_subject_links")
        .select("subject_id, user_id");
      for (const l of (linkRows ?? []) as { subject_id: string; user_id: string }[]) {
        links.set(String(l.subject_id), l.user_id);
      }
    } catch {
      /* table absente : aucune liaison */
    }

    // Regroupement par personne (serie triee par temps croissant).
    const bySubject = new Map<string, Row[]>();
    for (const r of rows) {
      const key = String(r.subject_id ?? "anonyme");
      const list = bySubject.get(key);
      if (list) list.push(r);
      else bySubject.set(key, [r]);
    }

    const people: AlcoholPerson[] = [];
    for (const [subjectId, list] of bySubject) {
      const sorted = [...list].sort(
        (a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime(),
      );
      const series: AlcoholPoint[] = sorted.map((r) => ({
        t: r.measured_at,
        level: r.alcohol_level,
      }));
      const levels = sorted.map((r) => r.alcohol_level);
      const latestRow = sorted[sorted.length - 1];
      const latest = latestRow.alcohol_level;
      const max = Math.max(...levels);
      const average = round2(levels.reduce((s, v) => s + v, 0) / levels.length);

      people.push({
        subjectId,
        name: aliases.get(subjectId) ?? `Personne ${subjectId}`,
        userId: links.get(subjectId) ?? null,
        deviceId: latestRow.device_id != null ? String(latestRow.device_id) : null,
        latest,
        max,
        average,
        count: sorted.length,
        lastTestAt: latestRow.measured_at,
        status: getReadingStatus("alcohol", latest),
        series,
      });
    }

    people.sort((a, b) => b.latest - a.latest);
    const dangers = people.filter((p) => p.latest >= ALCOHOL_LIMIT);

    // Moyenne foule : dernier test par personne dans l'heure precedant le
    // dernier test global.
    const latestGlobal = rows[0] ? new Date(rows[0].measured_at).getTime() : 0;
    const windowStart = latestGlobal - 3_600_000;
    const inWindow = people.filter(
      (p) => new Date(p.lastTestAt).getTime() >= windowStart,
    );
    const recentCount = inWindow.length;
    const recentAverage = recentCount
      ? round2(inWindow.reduce((s, p) => s + p.latest, 0) / recentCount)
      : null;

    return {
      limit: ALCOHOL_LIMIT,
      totalMeasures: rows.length,
      people,
      dangers,
      recentAverage,
      recentCount,
      generatedAt,
    };
  } catch {
    return emptyReport(generatedAt);
  }
}

function emptyReport(generatedAt: string): AlcoholReport {
  return {
    limit: ALCOHOL_LIMIT,
    totalMeasures: 0,
    people: [],
    dangers: [],
    recentAverage: null,
    recentCount: 0,
    generatedAt,
  };
}
