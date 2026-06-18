import type { MatchEvent, MatchOption, MatchSnapshot, TeamOption } from "./types";

const defaultHighlightlyBaseUrl = "https://soccer.highlightly.net";
const rapidApiHost = "football-highlights-api.p.rapidapi.com";
const liveRefreshMs = 120_000;
const teamsCacheMs = 86_400_000;
const matchesCacheMs = 1_800_000;

type HighlightlyTeam = {
  id?: number;
  logo?: string;
  name?: string;
  type?: string;
};

type HighlightlyMatch = {
  id?: number;
  round?: string;
  date?: string;
  country?: {
    code?: string;
    name?: string;
  };
  awayTeam?: HighlightlyTeam;
  homeTeam?: HighlightlyTeam;
  league?: {
    id?: number;
    season?: number;
    name?: string;
  };
  state?: {
    description?: string;
    clock?: number;
    score?: {
      current?: string;
      penalties?: string;
    };
  };
  events?: Array<{
    team?: HighlightlyTeam;
    time?: string;
    type?: string;
    player?: string;
    assist?: string;
  }>;
};

type HighlightlyListResponse<T> = {
  data?: T[];
  pagination?: {
    totalCount?: number;
    offset?: number;
    limit?: number;
  };
  plan?: {
    tier?: string;
    message?: string;
  };
  message?: string;
};

type CachedMatch = {
  match: MatchSnapshot;
  fetchedAt: number;
};

type CachedList<T> = {
  data: T;
  fetchedAt: number;
};

const matchCache = new Map<string, CachedMatch>();
const teamsCache = new Map<string, CachedList<TeamOption[]>>();
const teamMatchesCache = new Map<string, CachedList<MatchOption[]>>();

function getFootballConfig() {
  const baseUrl = process.env.FOOTBALL_API_BASE_URL || defaultHighlightlyBaseUrl;
  const apiKey = process.env.FOOTBALL_API_KEY;
  const season = process.env.FOOTBALL_SEASON || String(new Date().getFullYear());

  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    apiKey,
    season,
    configured: Boolean(apiKey),
  };
}

function getAuthHeaders(apiKey: string) {
  return {
    "x-rapidapi-key": apiKey,
    "x-rapidapi-host": rapidApiHost,
  };
}

async function highlightlyFetch<T>(path: string, params: Record<string, string | number | undefined> = {}) {
  const config = getFootballConfig();

  if (!config.configured) {
    throw new Error("FOOTBALL_API_KEY is missing.");
  }

  const url = new URL(`${config.baseUrl}${path}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    headers: getAuthHeaders(config.apiKey!),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Highlightly returned ${response.status}: ${body}`);
  }

  return (await response.json()) as T;
}

export function isMatchInProgress(status: MatchSnapshot["status"]) {
  return status === "live" || status === "halftime";
}

export async function searchTeams(input?: {
  search?: string | null;
  limit?: number;
}) {
  const config = getFootballConfig();
  const search = input?.search?.trim() || "France";
  const limit = Math.min(Math.max(input?.limit ?? 24, 1), 50);
  const cacheKey = `${search}:${limit}`;
  const cached = teamsCache.get(cacheKey);

  if (cached && Date.now() - cached.fetchedAt < teamsCacheMs) {
    return buildTeamsResponse(config.configured, cached.data, search, null);
  }

  if (!config.configured) {
    return buildTeamsResponse(false, [], search, "FOOTBALL_API_KEY is missing.");
  }

  try {
    const payload = await highlightlyFetch<HighlightlyListResponse<HighlightlyTeam>>("/teams", {
      name: search,
      limit,
      offset: 0,
    });
    const teams = (payload.data ?? []).map(normalizeTeam).filter((team) => team.id);
    teamsCache.set(cacheKey, { data: teams, fetchedAt: Date.now() });

    return buildTeamsResponse(
      true,
      teams,
      search,
      payload.plan?.message ?? (teams.length > 0 ? null : "Aucune équipe trouvée."),
    );
  } catch (error) {
    return buildTeamsResponse(
      true,
      [],
      search,
      error instanceof Error ? error.message : "Highlightly teams request failed.",
    );
  }
}

export async function listTeamMatches(input?: {
  teamId?: string | null;
  teamName?: string | null;
  limit?: number;
}) {
  const config = getFootballConfig();
  const teamId = input?.teamId?.trim();
  const teamName = input?.teamName?.trim();
  const limit = Math.min(Math.max(input?.limit ?? 20, 1), 50);

  if (!teamId && !teamName) {
    return {
      configured: config.configured,
      provider: "highlightly.net",
      matches: [] as MatchOption[],
      message: "Sélectionne une équipe pour charger ses matchs.",
    };
  }

  const cacheKey = `${teamId ?? teamName}:${limit}:${config.season}`;
  const cached = teamMatchesCache.get(cacheKey);

  if (cached && Date.now() - cached.fetchedAt < matchesCacheMs) {
    return {
      configured: config.configured,
      provider: "highlightly.net",
      matches: cached.data,
      message: null,
    };
  }

  if (!config.configured) {
    return {
      configured: false,
      provider: "highlightly.net",
      matches: [] as MatchOption[],
      message: "FOOTBALL_API_KEY is missing.",
    };
  }

  try {
    const [homeMatches, awayMatches] = await Promise.all([
      fetchMatchesForTeamSide({ teamId, teamName, side: "home", season: config.season, limit }),
      fetchMatchesForTeamSide({ teamId, teamName, side: "away", season: config.season, limit }),
    ]);
    const byId = new Map<string, MatchOption>();

    for (const match of [...homeMatches, ...awayMatches]) {
      if (match.id) byId.set(match.id, match);
    }

    const matches = Array.from(byId.values())
      .filter((match) => match.status !== "finished" && new Date(match.kickoffAt) >= startOfToday())
      .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime())
      .slice(0, limit);
    const fetchedAt = Date.now();

    for (const match of matches) {
      seedMatchCacheFromOption(match, fetchedAt);
    }

    teamMatchesCache.set(cacheKey, { data: matches, fetchedAt });

    return {
      configured: true,
      provider: "highlightly.net",
      teamId,
      teamName,
      matches,
      message: matches.length > 0 ? null : "Aucun futur match trouvé pour cette équipe.",
    };
  } catch (error) {
    return {
      configured: true,
      provider: "highlightly.net",
      matches: [] as MatchOption[],
      message: error instanceof Error ? error.message : "Highlightly matches request failed.",
    };
  }
}

export async function getCurrentMatch(matchId?: string | null): Promise<MatchSnapshot> {
  const config = getFootballConfig();
  const selectedMatchId = matchId?.trim();

  if (!selectedMatchId) {
    return getNoSelectedMatch();
  }

  const cached = matchCache.get(selectedMatchId);

  if (cached && !shouldRefreshMatch(cached)) {
    return cached.match;
  }

  if (!config.configured) {
    return cached?.match ?? getNoSelectedMatch("Clé Highlightly manquante.");
  }

  try {
    const payload = await highlightlyFetch<
      HighlightlyMatch[] | HighlightlyMatch | { data?: HighlightlyMatch[] | HighlightlyMatch }
    >(
      `/matches/${selectedMatchId}`,
    );
    const matchData = unwrapMatchPayload(payload);

    if (!matchData) {
      return cached?.match ?? getNoSelectedMatch("Match introuvable dans Highlightly.");
    }

    const match = normalizeMatch(matchData);
    matchCache.set(selectedMatchId, { match, fetchedAt: Date.now() });

    return match;
  } catch (error) {
    return (
      cached?.match ??
      getNoSelectedMatch(error instanceof Error ? error.message : "Erreur Highlightly.")
    );
  }
}

export async function syncMatch(matchId?: string | null): Promise<MatchSnapshot> {
  const selectedMatchId = matchId?.trim();

  if (selectedMatchId) {
    matchCache.delete(selectedMatchId);
  }

  return getCurrentMatch(selectedMatchId);
}

async function fetchMatchesForTeamSide(input: {
  teamId?: string;
  teamName?: string;
  side: "home" | "away";
  season: string;
  limit: number;
}) {
  const idKey = input.side === "home" ? "homeTeamId" : "awayTeamId";
  const nameKey = input.side === "home" ? "homeTeamName" : "awayTeamName";
  const payload = await highlightlyFetch<HighlightlyListResponse<HighlightlyMatch>>("/matches", {
    [input.teamId ? idKey : nameKey]: input.teamId ?? input.teamName,
    season: input.season,
    limit: input.limit,
    offset: 0,
  });

  return (payload.data ?? []).map(normalizeMatchOption);
}

function shouldRefreshMatch(cached: CachedMatch) {
  if (!isMatchInProgress(cached.match.status)) {
    return (
      cached.match.status === "scheduled" &&
      isKickoffWindow(cached.match.kickoffAt) &&
      Date.now() - cached.fetchedAt >= liveRefreshMs
    );
  }

  return Date.now() - cached.fetchedAt >= liveRefreshMs;
}

function seedMatchCacheFromOption(match: MatchOption, fetchedAt: number) {
  if (!match.id || matchCache.has(match.id)) return;

  matchCache.set(match.id, {
    match: {
      id: Number(match.id),
      externalId: match.id,
      competition: match.competition,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      status: match.status,
      minute: match.minute,
      kickoffAt: match.kickoffAt,
      lastSyncedAt: new Date(fetchedAt).toISOString(),
      events: [],
      source: "api",
    },
    fetchedAt,
  });
}

function unwrapMatchPayload(
  payload: HighlightlyMatch[] | HighlightlyMatch | { data?: HighlightlyMatch[] | HighlightlyMatch },
): HighlightlyMatch | undefined {
  if (Array.isArray(payload)) return payload[0];
  if ("data" in payload) {
    return Array.isArray(payload.data) ? payload.data[0] : payload.data;
  }
  return isHighlightlyMatch(payload) ? payload : undefined;
}

function isHighlightlyMatch(payload: unknown): payload is HighlightlyMatch {
  if (!payload || typeof payload !== "object") return false;
  return "id" in payload || "homeTeam" in payload || "awayTeam" in payload || "state" in payload;
}

function normalizeTeam(team: HighlightlyTeam): TeamOption {
  return {
    id: String(team.id ?? ""),
    name: team.name ?? "Équipe inconnue",
    type: team.type,
    logo: team.logo,
  };
}

function normalizeMatch(match: HighlightlyMatch): MatchSnapshot {
  const option = normalizeMatchOption(match);

  return {
    id: Number(option.id),
    externalId: option.id,
    competition: option.competition,
    homeTeam: option.homeTeam,
    awayTeam: option.awayTeam,
    homeScore: option.homeScore,
    awayScore: option.awayScore,
    status: option.status,
    minute: option.minute,
    kickoffAt: option.kickoffAt,
    lastSyncedAt: new Date().toISOString(),
    events: normalizeEvents(match),
    source: "api",
  };
}

function normalizeMatchOption(match: HighlightlyMatch): MatchOption {
  const score = parseScore(match.state?.score?.current);
  const status = normalizeStatus(match.state?.description);
  const homeTeam = match.homeTeam?.name ?? "Home";
  const awayTeam = match.awayTeam?.name ?? "Away";

  return {
    id: String(match.id ?? ""),
    competition: match.league?.name ?? match.round ?? "Competition",
    homeTeam,
    awayTeam,
    homeScore: score.home,
    awayScore: score.away,
    status,
    minute: match.state?.clock ?? (status === "finished" ? 90 : 0),
    kickoffAt: match.date ?? new Date().toISOString(),
    label: `${homeTeam} vs ${awayTeam}`,
  };
}

function normalizeEvents(match: HighlightlyMatch): MatchEvent[] {
  return (match.events ?? []).map((event, index) => ({
    id: Number(`${match.id ?? 0}${index}`),
    matchId: Number(match.id ?? 0),
    minute: parseEventMinute(event.time),
    type: normalizeEventType(event.type),
    team: event.team?.name,
    player: event.player,
    description: [event.type, event.player, event.assist ? `assist: ${event.assist}` : null]
      .filter(Boolean)
      .join(" - "),
    createdAt: new Date().toISOString(),
  }));
}

function normalizeStatus(description?: string): MatchSnapshot["status"] {
  const state = description?.toLowerCase() ?? "";
  if (state.includes("not started") || state.includes("announced")) return "scheduled";
  if (state.includes("half time")) return "halftime";
  if (state.includes("finished")) return "finished";
  if (
    state.includes("first half") ||
    state.includes("second half") ||
    state.includes("extra time") ||
    state.includes("penalties") ||
    state.includes("progress") ||
    state.includes("break time")
  ) {
    return "live";
  }

  return "scheduled";
}

function normalizeEventType(type?: string): MatchEvent["type"] {
  const value = type?.toLowerCase() ?? "";
  if (value.includes("goal")) return "goal";
  if (value.includes("yellow")) return "yellow_card";
  if (value.includes("red")) return "red_card";
  if (value.includes("half")) return "halftime";
  if (value.includes("full")) return "fulltime";
  return "other";
}

function parseScore(score?: string) {
  const [home, away] = (score ?? "0 - 0").split("-").map((value) => Number(value.trim()));

  return {
    home: Number.isFinite(home) ? home : 0,
    away: Number.isFinite(away) ? away : 0,
  };
}

function parseEventMinute(value?: string) {
  if (!value) return 0;
  const [base, extra] = value.split("+").map((part) => Number(part.replace(/\D/g, "")));
  return (Number.isFinite(base) ? base : 0) + (Number.isFinite(extra) ? extra : 0);
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function isKickoffWindow(kickoffAt: string) {
  const kickoff = new Date(kickoffAt).getTime();
  if (!Number.isFinite(kickoff)) return false;

  const now = Date.now();
  return now >= kickoff - 5 * 60_000 && now <= kickoff + 3 * 60 * 60_000;
}

function buildTeamsResponse(
  configured: boolean,
  teams: TeamOption[],
  search: string,
  message: string | null,
) {
  return {
    configured,
    provider: "highlightly.net",
    search,
    teams,
    message,
  };
}

function getNoSelectedMatch(message = "Aucun match sélectionné.") {
  const now = new Date().toISOString();

  return {
    id: 0,
    competition: message,
    homeTeam: "Match",
    awayTeam: "non sélectionné",
    homeScore: 0,
    awayScore: 0,
    status: "scheduled",
    minute: 0,
    kickoffAt: now,
    lastSyncedAt: now,
    events: [],
    source: "mock",
  } satisfies MatchSnapshot;
}
