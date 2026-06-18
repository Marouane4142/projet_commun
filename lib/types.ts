export type MetricType =
  | "temperature"
  | "decibel"
  | "smoke"
  | "gas"
  | "people_count"
  | "alcohol"
  | "humidity";

export type ReadingStatus = "ok" | "warning" | "alert" | "critical";
export type MatchStatus = "scheduled" | "live" | "halftime" | "finished";
export type MatchEventType =
  | "goal"
  | "yellow_card"
  | "red_card"
  | "halftime"
  | "fulltime"
  | "other";

export type AlertSeverity = "info" | "warning" | "alert" | "critical";

export type BarZone = {
  id: number;
  name: string;
  supporterTeam: string;
  color: string;
  maxCapacity: number;
  card?: string;
  cardId?: number;
};

export type Sensor = {
  id: number;
  name: string;
  type: MetricType;
  unit: string;
  zoneId: number;
  isActive: boolean;
  latestReading?: SensorReading;
};

export type SensorReading = {
  id: number;
  sensorId: number;
  zoneId: number;
  electronicCard?: number | null;
  type: MetricType;
  value: number;
  unit: string;
  status: ReadingStatus;
  measuredAt: string;
  createdAt: string;
  source?: "supabase" | "mock" | "manual";
};

export type Threshold = {
  id: number;
  metricType: MetricType;
  warningValue: number;
  alertValue: number;
  criticalValue: number;
  unit: string;
};

export type MatchEvent = {
  id: number;
  matchId: number;
  minute: number;
  type: MatchEventType;
  team?: string;
  player?: string;
  description: string;
  createdAt: string;
};

export type MatchSnapshot = {
  id: number;
  externalId?: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: MatchStatus;
  minute: number;
  kickoffAt: string;
  lastSyncedAt: string;
  events: MatchEvent[];
  source: "api" | "mock";
};

export type MatchOption = {
  id: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: MatchStatus;
  minute: number;
  kickoffAt: string;
  label: string;
};

export type TeamOption = {
  id: string;
  name: string;
  type?: string;
  logo?: string;
};

export type FanEventStatus = "planned" | "active" | "finished" | "archived";

export type ElectronicCard = {
  id: number;
  label: string;
  port: string;
  connected: boolean;
  healthy: boolean;
  available: boolean;
  active: boolean;
  mode: "active" | "sleep" | string;
  lastSeen: string | null;
  lastSeenAgeMs: number | null;
  lastDb: number | null;
  lastAverage: number | null;
  lastPostAt: string | null;
  lastError: string | null;
};

export type EventZoneAssignment = {
  zoneId: number;
  label: "Zone A" | "Zone B";
  team: string;
  card: string;
  color: string;
};

export type EventStats = {
  avgSound: number | null; // dB moyen sur la durée de l'événement (toutes zones)
  zoneASound: number | null; // dB moyen zone A
  zoneBSound: number | null; // dB moyen zone B
  avgTemperature: number | null; // C moyen
  avgAlcohol: number | null; // g/L moyen
  peakAffluence: number | null; // pic de frequentation (pas une moyenne)
};

export type FanEvent = {
  id: number;
  name: string;
  matchId: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  zoneA: EventZoneAssignment;
  zoneB: EventZoneAssignment;
  status: FanEventStatus;
  finalHomeScore: number | null;
  finalAwayScore: number | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  stats: EventStats;
};

export type EventHistoryItem = {
  event: FanEvent;
  score: {
    home: number | null;
    away: number | null;
  };
};

export type HistoryRankingEntry = {
  eventId: number;
  name: string;
  value: number;
};

export type HistoryRankings = {
  loudest: HistoryRankingEntry | null;
  hottest: HistoryRankingEntry | null;
  drunkest: HistoryRankingEntry | null;
  busiest: HistoryRankingEntry | null;
};

export type Alert = {
  id: number;
  zoneId: number;
  type: MetricType;
  severity: AlertSeverity;
  message: string;
  isResolved: boolean;
  triggeredAt: string;
  resolvedAt?: string;
};

export type LatestMetrics = Partial<Record<MetricType, SensorReading>>;

// ---------------------------------------------------------------------------
// Écosystème multi-groupes : données agrégées depuis les tables de TOUS les
// groupes de la salle (BDD Supabase partagee). Lecture seule cross-groupes.
// ---------------------------------------------------------------------------
export type EcoSourceStatus = "live" | "waiting" | "error";

export type EcoDomainKey =
  | "sound"
  | "affluence"
  | "air"
  | "temperature"
  | "humidity"
  | "alcohol";

export type EcoPoint = { t: string; v: number };

export type EcoDomain = {
  key: EcoDomainKey;
  label: string;
  sensor: string; // libelle du capteur physique
  status: EcoSourceStatus;
  value: number | null;
  unit: string;
  measuredAt: string | null;
  readingStatus: ReadingStatus | null;
  rowCount: number | null;
  history: EcoPoint[];
  note: string;
};

export type AlcoholSubject = {
  subjectId: string;
  level: number;
  deviceId: string | null;
  measuredAt: string;
};

export type AlcoholInsights = {
  total: number;
  subjects: number;
  latest: number | null;
  max: number | null;
  average: number | null;
  // Moyenne des derniers tests par personne dans l'heure precedant le dernier
  // test global : reflète l'alcoolémie de la foule présente en ce moment.
  recentAverage: number | null;
  recentCount: number;
  overLimit: number; // sujets au-dessus de la limite legale
  limit: number;
  perSubject: AlcoholSubject[];
};

export type AlcoholPoint = { t: string; level: number };

export type AlcoholPerson = {
  subjectId: string;
  name: string; // alias defini par un gerant, sinon "Personne X"
  userId: string | null; // compte associe par un gerant (pour voir ses propres stats)
  deviceId: string | null;
  latest: number;
  max: number;
  average: number;
  count: number;
  lastTestAt: string;
  status: ReadingStatus;
  series: AlcoholPoint[];
};

export type AlcoholReport = {
  limit: number;
  totalMeasures: number;
  people: AlcoholPerson[];
  dangers: AlcoholPerson[];
  recentAverage: number | null;
  recentCount: number;
  generatedAt: string;
};

export type EcoAlert = {
  id: string;
  domain: EcoDomainKey | "occupancy";
  severity: AlertSeverity;
  message: string;
};

export type EcoIndex = {
  key: "ambiance" | "securite" | "confort" | "fete";
  label: string;
  value: number | null;
  caption: string;
};

export type EcosystemSnapshot = {
  domains: EcoDomain[];
  occupancy: {
    current: number | null;
    capacity: number | null;
    ratio: number | null;
    flowIn: number | null;
    flowOut: number | null;
  };
  alcohol: AlcoholInsights;
  indices: EcoIndex[];
  alerts: EcoAlert[];
  generatedAt: string;
};

export type Broadcast = {
  id: number;
  title: string;
  youtubeId: string;
  matchLabel: string | null;
  kind: "resume" | "live" | "best";
  publishedAt: string | null;
};

export type ZoneScore = {
  zone: BarZone;
  latest: LatestMetrics;
  history: SensorReading[];
  ambianceScore: number | null;
  comfortScore: number | null;
  soundPeak: number | null;
  liveMetrics: MetricType[];
  missingMetrics: MetricType[];
  recommendations: string[];
  alerts: Alert[];
};

export type DashboardData = {
  event: FanEvent | null;
  match: MatchSnapshot;
  zones: ZoneScore[];
  winner: ZoneScore | null;
  globalSummary: string;
  sources: {
    matchLive: boolean;
    soundLive: boolean;
    refreshMs: number;
    externalMatchRefreshMs: number;
    missingSensorTables: MetricType[];
  };
  generatedAt: string;
};
