import { anonSensorClient } from "./sensorClients";
import { clamp, getReadingStatus } from "./scores";
import type {
  AlcoholInsights,
  AlcoholSubject,
  EcoAlert,
  EcoDomain,
  EcoIndex,
  EcoPoint,
  EcosystemSnapshot,
  ReadingStatus,
} from "./types";

// ===========================================================================
// Service ecosysteme : agrege la BDD Supabase PARTAGEE entre les groupes de la
// salle G1. Chaque groupe a cable UN capteur et publie ses mesures dans sa
// propre table. Ce service lit en LECTURE SEULE le capteur de chaque groupe.
//
//   G1A (nous) -> g1a_sound               : niveau sonore (dB) par carte
//   G1B        -> g1b_compteur_personnes  : affluence (ultrason entree/sortie)
//   G1C        -> g1c_smoke               : fumee / qualite air (ppm, derniere valeur)
//   G1D        -> g1d_mq3_measurements    : alcoolemie par sujet (MQ-3)
//   G1E        -> g1e_measurements         : temperature + humidite (type/value)
// ===========================================================================

const HISTORY = 40;
const VENUE_CAPACITY = 50; // capacite de notre FanBar
const ALCOHOL_LIMIT = 0.5; // limite legale indicative (g/L)

/* eslint-disable @typescript-eslint/no-explicit-any */
async function safeSelect<T>(
  client: any,
  table: string,
  columns: string,
  modify?: (q: any) => any,
): Promise<{ rows: T[]; count: number | null; ok: boolean }> {
  try {
    const base = client.from(table).select(columns, { count: "exact" });
    const query = modify ? modify(base) : base;
    const { data, count, error } = await query;
    if (error) return { rows: [], count: null, ok: false };
    return { rows: (data ?? []) as T[], count: count ?? null, ok: true };
  } catch {
    return { rows: [], count: null, ok: false };
  }
}

function toPoints(rows: { t: string | null; v: number | null }[]): EcoPoint[] {
  return rows
    .filter((r) => r.t && typeof r.v === "number")
    .map((r) => ({ t: r.t as string, v: r.v as number }))
    .reverse();
}

function statusFromValue(value: number | null, type: "decibel" | "smoke" | "temperature") {
  return value != null ? getReadingStatus(type, value) : null;
}

// --------------------------------------------------------------------------
// G1A - son
// --------------------------------------------------------------------------
async function buildSoundDomain(client: any): Promise<EcoDomain> {
  const { rows, count, ok } = await safeSelect<{ measured_at: string; db_value: number }>(
    client,
    "g1a_sound",
    "measured_at, db_value",
    (q) => q.order("measured_at", { ascending: false }).limit(HISTORY),
  );
  const latest = rows[0]?.db_value ?? null;
  return {
    key: "sound",
    label: "Ambiance sonore",
    sensor: "Micro MAX4466",
    status: ok && rows.length > 0 ? "live" : ok ? "waiting" : "error",
    value: latest,
    unit: "dB",
    measuredAt: rows[0]?.measured_at ?? null,
    readingStatus: statusFromValue(latest, "decibel"),
    rowCount: count,
    history: toPoints(rows.map((r) => ({ t: r.measured_at, v: r.db_value }))),
    note: "Notre capteur : intensite sonore des supporters.",
  };
}

// --------------------------------------------------------------------------
// G1B - affluence
// --------------------------------------------------------------------------
type AffluenceRow = {
  created_at: string;
  nb_personnes: number | null;
  dist_entree_cm: number | null;
  dist_sortie_cm: number | null;
};

async function fetchAffluence(client: any) {
  return safeSelect<AffluenceRow>(
    client,
    "g1b_compteur_personnes",
    "created_at, nb_personnes, dist_entree_cm, dist_sortie_cm",
    (q) => q.order("created_at", { ascending: false }).limit(HISTORY),
  );
}

function buildAffluenceDomain(
  data: Awaited<ReturnType<typeof fetchAffluence>>,
): EcoDomain {
  const { rows, count, ok } = data;
  const latest = rows[0]?.nb_personnes ?? null;
  let readingStatus: ReadingStatus | null = null;
  if (latest != null) {
    const ratio = latest / VENUE_CAPACITY;
    readingStatus =
      ratio >= 1 ? "critical" : ratio >= 0.85 ? "alert" : ratio >= 0.7 ? "warning" : "ok";
  }
  return {
    key: "affluence",
    label: "Affluence",
    sensor: "Compteur ultrason (entree / sortie)",
    status: ok && rows.length > 0 ? "live" : ok ? "waiting" : "error",
    value: latest,
    unit: "pers.",
    measuredAt: rows[0]?.created_at ?? null,
    readingStatus,
    rowCount: count,
    history: toPoints(rows.map((r) => ({ t: r.created_at, v: r.nb_personnes ?? 0 }))),
    note: "Entrees et sorties comptees en temps reel.",
  };
}

// --------------------------------------------------------------------------
// G1C - qualite de l'air / fumee (derniere valeur)
// --------------------------------------------------------------------------
async function buildAirDomain(client: any): Promise<EcoDomain> {
  const { rows, count, ok } = await safeSelect<{ measured_at: string; ppm: number }>(
    client,
    "g1c_smoke",
    "measured_at, ppm",
    (q) => q.order("measured_at", { ascending: false }).limit(HISTORY),
  );
  const latest = rows[0]?.ppm ?? null;
  return {
    key: "air",
    label: "Qualite de l'air",
    sensor: "Capteur de fumee (ppm)",
    status: ok && rows.length > 0 ? "live" : ok ? "waiting" : "error",
    value: latest,
    unit: "ppm",
    measuredAt: rows[0]?.measured_at ?? null,
    readingStatus: statusFromValue(latest, "smoke"),
    rowCount: count,
    history: toPoints(rows.map((r) => ({ t: r.measured_at, v: r.ppm }))),
    note: "Detection de fumee, mesure temps reel.",
  };
}

// --------------------------------------------------------------------------
// G1D - alcoolemie (riche : par sujet)
// --------------------------------------------------------------------------
type AlcoholRow = {
  measured_at: string;
  alcohol_level: number;
  subject_id: string | null;
  device_id: string | null;
};

async function fetchAlcohol(client: any) {
  return safeSelect<AlcoholRow>(
    client,
    "g1d_mq3_measurements",
    "measured_at, alcohol_level, subject_id, device_id",
    (q) => q.order("measured_at", { ascending: false }).limit(500),
  );
}

function buildAlcohol(data: Awaited<ReturnType<typeof fetchAlcohol>>): {
  domain: EcoDomain;
  insights: AlcoholInsights;
} {
  const { rows, count, ok } = data;
  const latest = rows[0]?.alcohol_level ?? null;

  // dernier releve par sujet
  const perSubjectMap = new Map<string, AlcoholSubject>();
  for (const r of rows) {
    const key = r.subject_id ?? "anonyme";
    if (!perSubjectMap.has(key)) {
      perSubjectMap.set(key, {
        subjectId: key,
        level: r.alcohol_level,
        deviceId: r.device_id,
        measuredAt: r.measured_at,
      });
    }
  }
  const perSubject = Array.from(perSubjectMap.values()).sort((a, b) => b.level - a.level);
  const levels = rows.map((r) => r.alcohol_level).filter((v): v is number => typeof v === "number");
  const max = levels.length ? Math.max(...levels) : null;
  const average = levels.length
    ? Math.round((levels.reduce((s, v) => s + v, 0) / levels.length) * 100) / 100
    : null;
  const overLimit = perSubject.filter((s) => s.level >= ALCOHOL_LIMIT).length;

  let readingStatus: ReadingStatus | null = null;
  if (latest != null) {
    readingStatus =
      latest >= ALCOHOL_LIMIT * 1.6 ? "critical" : latest >= ALCOHOL_LIMIT ? "alert" : latest >= ALCOHOL_LIMIT * 0.5 ? "warning" : "ok";
  }

  const domain: EcoDomain = {
    key: "alcohol",
    label: "Alcoolemie",
    sensor: "Ethylotest MQ-3 (par sujet)",
    status: ok && rows.length > 0 ? "live" : ok ? "waiting" : "error",
    value: latest,
    unit: "g/L",
    measuredAt: rows[0]?.measured_at ?? null,
    readingStatus,
    rowCount: count,
    history: toPoints(rows.slice(0, HISTORY).map((r) => ({ t: r.measured_at, v: r.alcohol_level }))),
    note: "Prevention : mesure par personne avant le depart.",
  };

  const insights: AlcoholInsights = {
    total: count ?? rows.length,
    subjects: perSubject.length,
    latest,
    max,
    average,
    overLimit,
    limit: ALCOHOL_LIMIT,
    perSubject: perSubject.slice(0, 10),
  };

  return { domain, insights };
}

// --------------------------------------------------------------------------
// G1E - temperature + humidite (table type/value)
// --------------------------------------------------------------------------
type EnvRow = { created_at: string; value: number; type: string; unit: string | null };

// Attention : la table G1E utilise un identifiant en MAJUSCULES (sensible a la
// casse cote PostgREST), d'ou "G1E_measurements" et non "g1e_measurements".
const G1E_TABLE = "G1E_measurements";

async function fetchEnv(client: any) {
  return safeSelect<EnvRow>(
    client,
    G1E_TABLE,
    "created_at, value, type, unit",
    (q) => q.order("created_at", { ascending: false }).limit(120),
  );
}

function buildEnvDomains(data: Awaited<ReturnType<typeof fetchEnv>>): {
  temperature: EcoDomain;
  humidity: EcoDomain;
} {
  const { rows, ok } = data;
  const round1 = (v: number | null | undefined) =>
    typeof v === "number" ? Math.round(v * 10) / 10 : null;
  const tempRows = rows.filter((r) => (r.type ?? "").toLowerCase().includes("temp"));
  const humRows = rows.filter((r) => (r.type ?? "").toLowerCase().includes("humid"));

  const tempLatest = round1(tempRows[0]?.value);
  const humLatest = round1(humRows[0]?.value);

  let humStatus: ReadingStatus | null = null;
  if (humLatest != null) {
    humStatus =
      humLatest >= 75 || humLatest <= 25 ? "alert" : humLatest >= 65 || humLatest <= 35 ? "warning" : "ok";
  }

  const temperature: EcoDomain = {
    key: "temperature",
    label: "Temperature",
    sensor: "Capteur temperature",
    status: ok && tempRows.length > 0 ? "live" : ok ? "waiting" : "error",
    value: tempLatest,
    unit: "°C",
    measuredAt: tempRows[0]?.created_at ?? null,
    readingStatus: statusFromValue(tempLatest, "temperature"),
    rowCount: tempRows.length || null,
    history: toPoints(tempRows.map((r) => ({ t: r.created_at, v: r.value }))),
    note: "Temperature de la salle, en continu.",
  };

  const humidity: EcoDomain = {
    key: "humidity",
    label: "Humidite",
    sensor: "Capteur humidite",
    status: ok && humRows.length > 0 ? "live" : ok ? "waiting" : "error",
    value: humLatest,
    unit: "%",
    measuredAt: humRows[0]?.created_at ?? null,
    readingStatus: humStatus,
    rowCount: humRows.length || null,
    history: toPoints(humRows.map((r) => ({ t: r.created_at, v: r.value }))),
    note: "Taux d'humidite de la salle, en continu.",
  };

  return { temperature, humidity };
}

// --------------------------------------------------------------------------
// Indices composites + alertes cross-groupes
// --------------------------------------------------------------------------
function soundToScore(db: number | null): number | null {
  if (db == null) return null;
  return Math.round(clamp(((db - 40) / 60) * 100));
}

function buildIndices(
  sound: EcoDomain,
  air: EcoDomain,
  temperature: EcoDomain,
  occupancyRatio: number | null,
): EcoIndex[] {
  const ambiance = soundToScore(sound.value);

  let confort: number | null = null;
  if (occupancyRatio != null || air.value != null || temperature.value != null) {
    confort = 100;
    if (occupancyRatio != null && occupancyRatio > 0.7) confort -= (occupancyRatio - 0.7) * 120;
    if (air.value != null) confort -= Math.min(air.value * 1.6, 45);
    if (temperature.value != null && temperature.value > 24)
      confort -= (temperature.value - 24) * 5;
    if (temperature.value != null && temperature.value < 18)
      confort -= (18 - temperature.value) * 4;
    confort = Math.round(clamp(confort));
  }

  let securite: number | null = null;
  if (air.value != null || occupancyRatio != null) {
    securite = 100;
    if (air.value != null) securite -= Math.min(air.value * 2.0, 60);
    if (occupancyRatio != null && occupancyRatio > 0.85) securite -= (occupancyRatio - 0.85) * 180;
    securite = Math.round(clamp(securite));
  }

  let fete: number | null = null;
  const occScore = occupancyRatio != null ? clamp(occupancyRatio * 100) : null;
  if (ambiance != null || occScore != null) {
    fete = Math.round(clamp((ambiance ?? 0) * 0.6 + (occScore ?? 0) * 0.4));
  }

  return [
    { key: "ambiance", label: "Indice d'ambiance", value: ambiance, caption: "Niveau sonore" },
    { key: "fete", label: "Indice de fete", value: fete, caption: "Son et affluence" },
    { key: "confort", label: "Indice de confort", value: confort, caption: "Affluence, air, temperature" },
    { key: "securite", label: "Indice de securite", value: securite, caption: "Air et affluence" },
  ];
}

function buildAlerts(
  sound: EcoDomain,
  air: EcoDomain,
  temperature: EcoDomain,
  alcohol: AlcoholInsights,
  occupancy: { current: number | null; capacity: number | null; ratio: number | null },
): EcoAlert[] {
  const alerts: EcoAlert[] = [];

  if (air.value != null && air.value >= 25) {
    alerts.push({
      id: "air-high",
      domain: "air",
      severity: air.value >= 45 ? "critical" : "alert",
      message:
        air.value >= 45
          ? `Fumee critique (${air.value} ppm) : evacuer et aerer.`
          : `Fumee elevee (${air.value} ppm) : aerer la salle.`,
    });
  }

  if (occupancy.ratio != null && occupancy.ratio >= 0.85) {
    alerts.push({
      id: "occupancy-high",
      domain: "occupancy",
      severity: occupancy.ratio >= 1 ? "critical" : "alert",
      message:
        occupancy.ratio >= 1
          ? `Capacite depassee (${occupancy.current}/${occupancy.capacity}) : stopper les entrees.`
          : `Affluence forte (${occupancy.current}/${occupancy.capacity}) : surveiller les entrees.`,
    });
  }

  if (sound.value != null && sound.value >= 90) {
    alerts.push({
      id: "sound-high",
      domain: "sound",
      severity: sound.value >= 100 ? "critical" : "warning",
      message: `Niveau sonore eleve (${sound.value} dB) : risque auditif prolonge.`,
    });
  }

  if (alcohol.overLimit > 0) {
    alerts.push({
      id: "alcohol-over",
      domain: "alcohol",
      severity: "alert",
      message: `${alcohol.overLimit} supporter(s) au-dessus de ${alcohol.limit} g/L : prevoir un retour securise.`,
    });
  }

  if (temperature.value != null && temperature.value >= 29) {
    alerts.push({
      id: "temp-high",
      domain: "temperature",
      severity: temperature.value >= 32 ? "alert" : "warning",
      message: `Chaleur elevee (${temperature.value} C) : renforcer la ventilation.`,
    });
  }

  return alerts;
}

// --------------------------------------------------------------------------
// Snapshot complet
// --------------------------------------------------------------------------
export async function getEcosystemSnapshot(): Promise<EcosystemSnapshot> {
  // Toutes les tables capteurs sont desormais exposees en lecture au role anon
  // (g1a_sound, g1b, g1c, et g1d/g1e via supabase-crossgroup-read.sql), donc on
  // lit tout avec un client anon stable, independant de la session du visiteur.
  const anon = anonSensorClient();
  const [sound, affluenceRaw, air, alcoholRaw, envRaw] = await Promise.all([
    buildSoundDomain(anon),
    fetchAffluence(anon),
    buildAirDomain(anon),
    fetchAlcohol(anon),
    fetchEnv(anon),
  ]);

  const affluence = buildAffluenceDomain(affluenceRaw);
  const { domain: alcoholDomain, insights: alcohol } = buildAlcohol(alcoholRaw);
  const { temperature, humidity } = buildEnvDomains(envRaw);

  const current = affluence.value;
  const ratio = current != null ? current / VENUE_CAPACITY : null;

  const counts = affluenceRaw.rows
    .map((r) => r.nb_personnes)
    .filter((v): v is number => typeof v === "number");
  let flowIn: number | null = null;
  let flowOut: number | null = null;
  if (counts.length >= 2) {
    const recent = counts.slice(0, Math.min(10, counts.length));
    let up = 0;
    let down = 0;
    for (let i = 0; i < recent.length - 1; i += 1) {
      const delta = recent[i] - recent[i + 1];
      if (delta > 0) up += delta;
      else if (delta < 0) down += -delta;
    }
    flowIn = up;
    flowOut = down;
  }

  const occupancy = { current, capacity: VENUE_CAPACITY, ratio, flowIn, flowOut };
  const indices = buildIndices(sound, air, temperature, ratio);
  const alerts = buildAlerts(sound, air, temperature, alcohol, occupancy);

  const domains = [sound, affluence, air, temperature, humidity, alcoholDomain];

  return {
    domains,
    occupancy,
    alcohol,
    indices,
    alerts,
    generatedAt: new Date().toISOString(),
  };
}
