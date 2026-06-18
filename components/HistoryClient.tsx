"use client";

import { Archive, Flame, Trophy, Users, Volume2, Wine } from "lucide-react";
import { useEffect, useState } from "react";
import type { EventHistoryItem, HistoryRankings } from "@/lib/types";
import { formatDateTime, formatValue } from "@/lib/format";

type HistoryResponse = {
  items: EventHistoryItem[];
  rankings?: HistoryRankings;
  message?: string | null;
};

const EMPTY_RANKINGS: HistoryRankings = {
  loudest: null,
  hottest: null,
  drunkest: null,
  busiest: null,
};

export function HistoryClient() {
  const [items, setItems] = useState<EventHistoryItem[]>([]);
  const [rankings, setRankings] = useState<HistoryRankings>(EMPTY_RANKINGS);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/events/history", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: HistoryResponse) => {
        setItems(payload.items ?? []);
        setRankings(payload.rankings ?? EMPTY_RANKINGS);
        setMessage(payload.message ?? null);
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Historique indisponible.");
      })
      .finally(() => setLoading(false));
  }, []);

  const hasRankings =
    rankings.loudest || rankings.hottest || rankings.drunkest || rankings.busiest;

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/15 via-white/[0.04] to-emerald-500/10 p-6">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-cyan-300">
          <Archive size={14} /> Historique
        </p>
        <h1 className="mt-2 text-3xl font-black text-white">Événements terminés</h1>
        <p className="mt-2 max-w-2xl text-slate-300">
          Score final et niveau sonore moyen de chaque zone de supporters pour les
          soirées clôturées.
        </p>
      </section>

      {hasRankings && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <RankingCard
            icon={Volume2}
            title="Ambiance la plus chaude"
            entry={rankings.loudest}
            unit="dB"
            accent="#38bdf8"
          />
          <RankingCard
            icon={Flame}
            title="Température la plus élevée"
            entry={rankings.hottest}
            unit="°C"
            accent="#fb923c"
          />
          <RankingCard
            icon={Wine}
            title="Alcoolémie la plus haute"
            entry={rankings.drunkest}
            unit="g/L"
            accent="#f87171"
          />
          <RankingCard
            icon={Users}
            title="Record d'affluence"
            entry={rankings.busiest}
            unit="pers."
            accent="#a78bfa"
          />
        </section>
      )}

      {message ? (
        <p className="rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-amber-100">
          {message}
        </p>
      ) : null}

      {loading ? (
        <p className="rounded-xl border border-cyan-400/30 bg-cyan-500/15 p-4 text-cyan-100">
          Chargement de l&apos;historique…
        </p>
      ) : null}

      <section className="grid gap-4">
        {items.map((item) => (
          <HistoryCard key={item.event.id} item={item} />
        ))}
      </section>

      {!loading && items.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.04] p-5 text-slate-400">
          Aucun événement terminé pour le moment. Termine une session depuis le
          tableau de bord pour la retrouver ici.
        </p>
      ) : null}
    </div>
  );
}

function HistoryCard({ item }: { item: EventHistoryItem }) {
  const zoneAdb = item.event.stats.zoneASound;
  const zoneBdb = item.event.stats.zoneBSound;
  const louder =
    zoneAdb != null && zoneBdb != null
      ? zoneAdb === zoneBdb
        ? "tie"
        : zoneAdb > zoneBdb
          ? "A"
          : "B"
      : null;

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white">{item.event.name}</h2>
          <p className="mt-1 text-sm text-slate-400">
            {item.event.competition} · terminé le{" "}
            {formatDateTime(item.event.finishedAt ?? item.event.updatedAt)}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-5 py-3 text-center">
          <div className="flex items-center justify-center gap-2 text-emerald-200">
            <Trophy size={16} />
            <span className="text-[11px] font-black uppercase">Score final</span>
          </div>
          <strong className="mt-1 block text-3xl font-black text-white">
            {formatScore(item.score.home)} - {formatScore(item.score.away)}
          </strong>
          <p className="mt-1 text-[11px] text-emerald-100/75">
            {item.event.homeTeam} vs {item.event.awayTeam}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <ZoneSound
          label={item.event.zoneA.label}
          team={item.event.zoneA.team}
          db={zoneAdb}
          unit="dB"
          winner={louder === "A"}
        />
        <ZoneSound
          label={item.event.zoneB.label}
          team={item.event.zoneB.team}
          db={zoneBdb}
          unit="dB"
          winner={louder === "B"}
        />
      </div>

      {/* Moyennes capturées sur la durée de la soirée */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStat label="Son moyen" value={item.event.stats.avgSound} unit="dB" />
        <MiniStat label="Température moy." value={item.event.stats.avgTemperature} unit="°C" />
        <MiniStat label="Alcoolémie moy." value={item.event.stats.avgAlcohol} unit="g/L" />
        <MiniStat label="Pic d'affluence" value={item.event.stats.peakAffluence} unit="pers." />
      </div>
    </article>
  );
}

function MiniStat({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null;
  unit: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-2.5 text-center">
      <div className="text-base font-black text-white">
        {value != null ? `${value} ${unit}` : "--"}
      </div>
      <div className="text-[10px] uppercase text-slate-500">{label}</div>
    </div>
  );
}

function RankingCard({
  icon: Icon,
  title,
  entry,
  unit,
  accent,
}: {
  icon: typeof Trophy;
  title: string;
  entry: HistoryRankings["loudest"];
  unit: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
        <Icon size={14} style={{ color: accent }} /> {title}
      </div>
      {entry ? (
        <>
          <div className="mt-2 truncate text-lg font-black text-white">{entry.name}</div>
          <div className="text-sm font-black" style={{ color: accent }}>
            {entry.value} {unit}
          </div>
        </>
      ) : (
        <div className="mt-2 text-sm text-slate-500">--</div>
      )}
    </div>
  );
}

function ZoneSound({
  label,
  team,
  db,
  unit,
  winner,
}: {
  label: string;
  team: string;
  db: number | null;
  unit: string;
  winner: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        winner
          ? "border-emerald-400/40 bg-emerald-400/[0.08]"
          : "border-white/10 bg-black/20"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase text-slate-400">{label}</p>
        {winner && (
          <span className="rounded bg-emerald-400/20 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-200">
            Zone la plus chaude
          </span>
        )}
      </div>
      <h3 className="mt-1 text-xl font-black text-white">{team}</h3>
      <div className="mt-3 flex items-center gap-2 text-slate-300">
        <Volume2 size={16} className="text-cyan-300" />
        <span className="text-2xl font-black text-white">
          {formatValue(db ?? undefined, unit)}
        </span>
        <span className="text-xs text-slate-500">en moyenne</span>
      </div>
    </div>
  );
}

function formatScore(score: number | null) {
  return typeof score === "number" ? score : "--";
}
