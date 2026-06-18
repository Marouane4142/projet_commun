"use client";

import { CalendarClock, CheckCircle2, Search, Users } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { MatchOption, TeamOption } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

type TeamListResponse = {
  configured: boolean;
  provider: string;
  search: string;
  teams: TeamOption[];
  message?: string | null;
};

type MatchListResponse = {
  configured: boolean;
  provider: string;
  teamId?: string | null;
  teamName?: string | null;
  matches: MatchOption[];
  message?: string | null;
};

const matchStorageKey = "fanbar:selected-match-id";
const teamStorageKey = "fanbar:selected-team";

export function getStoredMatchId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(matchStorageKey);
}

function getStoredTeam() {
  if (typeof window === "undefined") return null;

  try {
    const value = window.localStorage.getItem(teamStorageKey);
    return value ? (JSON.parse(value) as TeamOption) : null;
  } catch {
    return null;
  }
}

export function MatchSelector({
  selectedMatchId,
  onSelect,
  onMatchSelect,
  persistSelection = true,
}: {
  selectedMatchId: string | null;
  onSelect: (matchId: string | null) => void;
  onMatchSelect?: (match: MatchOption | null) => void;
  persistSelection?: boolean;
}) {
  const [teamSearch, setTeamSearch] = useState("France");
  const [selectedTeam, setSelectedTeam] = useState<TeamOption | null>(null);
  const [teamsPayload, setTeamsPayload] = useState<TeamListResponse | null>(null);
  const [matchesPayload, setMatchesPayload] = useState<MatchListResponse | null>(null);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [matchesLoading, setMatchesLoading] = useState(false);

  async function loadTeams(nextSearch = teamSearch) {
    const search = nextSearch.trim() || "France";
    setTeamsLoading(true);

    try {
      const response = await fetch(
        `/api/teams?search=${encodeURIComponent(search)}&limit=24`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as TeamListResponse;
      setTeamsPayload(data);
    } finally {
      setTeamsLoading(false);
    }
  }

  async function loadMatches(team: TeamOption) {
    setMatchesLoading(true);

    try {
      const params = new URLSearchParams({
        teamName: team.name,
        limit: "20",
      });

      if (team.id) params.set("teamId", team.id);

      const response = await fetch(`/api/matches?${params.toString()}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as MatchListResponse;
      setMatchesPayload(data);
    } finally {
      setMatchesLoading(false);
    }
  }

  useEffect(() => {
    const storedMatchId = getStoredMatchId();
    const storedTeam = getStoredTeam();

    if (persistSelection && storedMatchId) onSelect(storedMatchId);

    if (persistSelection && storedTeam) {
      setSelectedTeam(storedTeam);
      setTeamSearch(storedTeam.name);
      void loadTeams(storedTeam.name);
      void loadMatches(storedTeam);
    } else {
      void loadTeams("France");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedLabel = useMemo(() => {
    const match = matchesPayload?.matches.find((item) => item.id === selectedMatchId);
    if (!match) return selectedMatchId ? "Match sélectionné" : "Aucun match sélectionné";
    return `${match.label} - ${formatDateTime(match.kickoffAt)}`;
  }, [matchesPayload?.matches, selectedMatchId]);

  function submitTeamSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadTeams();
  }

  function selectTeam(team: TeamOption) {
    setSelectedTeam(team);
    setMatchesPayload(null);
    if (persistSelection) {
      window.localStorage.setItem(teamStorageKey, JSON.stringify(team));
    }
    selectMatch(null);
    void loadMatches(team);
  }

  function selectMatch(matchId: string | null, match: MatchOption | null = null) {
    if (matchId && persistSelection) {
      window.localStorage.setItem(matchStorageKey, matchId);
    } else if (persistSelection) {
      window.localStorage.removeItem(matchStorageKey);
    }
    onMatchSelect?.(match);
    onSelect(matchId);
  }

  return (
    <article className="rounded-lg border border-white/10 bg-slate-950/55 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-cyan-300">Sélection du match réel</p>
          <h2 className="mt-1 text-2xl font-black text-white">{selectedLabel}</h2>
          <p className="mt-2 text-sm text-slate-400">
            Choisis une équipe, puis un futur match à venir.
          </p>
        </div>
        <button
          type="button"
          onClick={() => selectedTeam ? void loadMatches(selectedTeam) : void loadTeams()}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 bg-white/8 px-4 font-black text-white transition hover:border-cyan-300/45 hover:bg-cyan-300/10"
        >
          <CalendarClock size={17} />
          Actualiser
        </button>
      </div>

      <form onSubmit={submitTeamSearch} className="mt-5 flex items-end gap-3">
        <label className="min-w-0 flex-1 text-sm font-bold text-slate-300">
          Équipe
          <span className="mt-2 flex min-h-12 items-center gap-2 rounded-lg border border-white/10 bg-slate-900 px-3 focus-within:border-cyan-300/50">
            <Search size={17} className="shrink-0 text-slate-500" />
            <input
              value={teamSearch}
              onChange={(event) => setTeamSearch(event.target.value)}
              className="min-w-0 flex-1 bg-transparent py-3 text-white outline-none"
              placeholder="France, Sénégal, Irak..."
            />
          </span>
        </label>
        <button
          type="submit"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-5 font-black text-slate-950"
        >
          <Users size={17} />
          Trouver
        </button>
      </form>

      {teamsPayload?.message ? (
        <p className="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/10 p-3 text-sm text-amber-100">
          {teamsPayload.message}
        </p>
      ) : null}

      {matchesPayload?.message ? (
        <p className="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/10 p-3 text-sm text-amber-100">
          {matchesPayload.message}
        </p>
      ) : null}

      {!teamsPayload?.configured ? (
        <p className="mt-4 rounded-lg border border-cyan-300/25 bg-cyan-300/10 p-3 text-sm text-cyan-100">
          La source des matchs en direct n&apos;est pas encore configurée.
        </p>
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <section>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase text-slate-500">Équipes trouvées</p>
            {teamsLoading ? <span className="text-xs font-bold text-cyan-200">Chargement...</span> : null}
          </div>

          <div className="mt-3 grid max-h-72 gap-2 overflow-y-auto pr-1">
            {teamsPayload?.teams.map((team) => (
              <button
                type="button"
                key={`${team.id}-${team.name}`}
                onClick={() => selectTeam(team)}
                className={`flex min-h-14 items-center gap-3 rounded-lg border px-3 text-left transition ${
                  selectedTeam?.id === team.id
                    ? "border-cyan-300/50 bg-cyan-300/12"
                    : "border-white/10 bg-white/[0.04] hover:border-white/25"
                }`}
              >
                <TeamAvatar team={team} />
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-white">{team.name}</strong>
                  <span className="text-xs uppercase text-slate-500">{team.type ?? "football"}</span>
                </span>
                {selectedTeam?.id === team.id ? <CheckCircle2 size={18} className="text-cyan-200" /> : null}
              </button>
            ))}

            {!teamsLoading && teamsPayload?.teams.length === 0 ? (
              <p className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
                Aucune équipe pour cette recherche.
              </p>
            ) : null}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase text-slate-500">
              Futurs matchs {selectedTeam ? `- ${selectedTeam.name}` : ""}
            </p>
            {matchesLoading ? <span className="text-xs font-bold text-cyan-200">Chargement...</span> : null}
          </div>

          <div className="mt-3 grid gap-2">
            {!selectedTeam ? (
              <p className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
                Choisis une équipe pour afficher ses prochains matchs.
              </p>
            ) : null}

            {matchesPayload?.matches.map((match) => (
              <button
                type="button"
                key={match.id}
                onClick={() => selectMatch(match.id, match)}
                className={`flex min-h-16 items-center justify-between gap-4 rounded-lg border px-4 text-left transition ${
                  selectedMatchId === match.id
                    ? "border-emerald-300/45 bg-emerald-400/12"
                    : "border-white/10 bg-white/[0.04] hover:border-white/25"
                }`}
              >
                <span className="min-w-0">
                  <strong className="block text-white">{match.label}</strong>
                  <span className="text-sm text-slate-400">
                    {match.competition} - {formatDateTime(match.kickoffAt)}
                  </span>
                </span>
                <span className="shrink-0 rounded-md border border-white/10 bg-slate-900 px-2.5 py-1 text-xs font-black uppercase text-slate-300">
                  {match.status}
                </span>
              </button>
            ))}

            {!matchesLoading && selectedTeam && matchesPayload?.matches.length === 0 ? (
              <p className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
                Aucun futur match disponible pour cette équipe.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </article>
  );
}

function TeamAvatar({ team }: { team: TeamOption }) {
  if (team.logo) {
    return (
      <img
        src={team.logo}
        alt=""
        className="size-9 shrink-0 rounded-lg border border-white/10 bg-white object-contain p-1"
      />
    );
  }

  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-slate-900 text-sm font-black text-cyan-200">
      {team.name.slice(0, 2).toUpperCase()}
    </span>
  );
}
