"use client";

import { Loader2, Trophy, Users2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { FanEvent } from "@/lib/types";

type Prediction = {
  id: number;
  user_id: string;
  event_id: number;
  pseudo: string;
  predicted_home: number;
  predicted_away: number;
};

type Props = {
  authenticated: boolean;
  userId: string | null;
  pseudo: string | null;
};

export function PredictionsClient({ authenticated, userId, pseudo }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [events, setEvents] = useState<FanEvent[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPredictions = useCallback(async () => {
    const { data } = await supabase
      .from("g1a_predictions")
      .select("id, user_id, event_id, pseudo, predicted_home, predicted_away");
    setPredictions((data as Prediction[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/events", { cache: "no-store" });
        const payload = await res.json();
        setEvents((payload.events as FanEvent[]) ?? []);
        await loadPredictions();
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, [loadPredictions]);

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-slate-400">
        <Loader2 className="animate-spin" size={18} /> Chargement des pronostics...
      </p>
    );
  }

  if (events.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/[0.04] p-5 text-slate-400">
        Aucun événement disponible pour le moment. Reviens quand un match est
        programmé dans la régie.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      {!authenticated && (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
          <Link href="/login" className="font-black underline">
            Connecte-toi
          </Link>{" "}
          pour déposer ton pronostic et rejoindre le classement des supporters.
        </div>
      )}

      {events.map((event) => (
        <EventPredictionCard
          key={event.id}
          event={event}
          predictions={predictions.filter((p) => p.event_id === event.id)}
          authenticated={authenticated}
          userId={userId}
          pseudo={pseudo}
          supabase={supabase}
          onSaved={loadPredictions}
        />
      ))}
    </div>
  );
}

function EventPredictionCard({
  event,
  predictions,
  authenticated,
  userId,
  pseudo,
  supabase,
  onSaved,
}: {
  event: FanEvent;
  predictions: Prediction[];
  authenticated: boolean;
  userId: string | null;
  pseudo: string | null;
  supabase: ReturnType<typeof createClient>;
  onSaved: () => Promise<void>;
}) {
  const mine = predictions.find((p) => p.user_id === userId);
  const [home, setHome] = useState(mine ? String(mine.predicted_home) : "");
  const [away, setAway] = useState(mine ? String(mine.predicted_away) : "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setMsg(null);
    const { error } = await supabase.from("g1a_predictions").upsert(
      {
        user_id: userId,
        event_id: event.id,
        pseudo: pseudo ?? "Supporter",
        predicted_home: Math.max(0, Math.min(30, Number(home) || 0)),
        predicted_away: Math.max(0, Math.min(30, Number(away) || 0)),
      },
      { onConflict: "user_id,event_id" },
    );
    setSaving(false);
    if (error) {
      setMsg("Erreur : " + error.message);
      return;
    }
    setMsg("Pronostic enregistre !");
    await onSaved();
  }

  // agregat : vainqueur le plus pronostique
  const winnerVotes = predictions.reduce(
    (acc, p) => {
      if (p.predicted_home > p.predicted_away) acc.home += 1;
      else if (p.predicted_away > p.predicted_home) acc.away += 1;
      else acc.draw += 1;
      return acc;
    },
    { home: 0, away: 0, draw: 0 },
  );

  // Les pronostics ferment 15 min apres le COUP D'ENVOI du match (pas de l'evenement).
  const kickoff = new Date(event.kickoffAt).getTime();
  const closeAt = kickoff + 15 * 60_000;
  const now = Date.now();
  const open =
    Number.isFinite(kickoff) &&
    now < closeAt &&
    event.status !== "finished" &&
    event.status !== "archived";
  const hasResult = event.finalHomeScore != null && event.finalAwayScore != null;
  const statusLabel = !open
    ? event.status === "finished"
      ? "Terminé"
      : "Pronostics fermés"
    : now >= kickoff
      ? "En cours"
      : "À venir";

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-black">
          {event.homeTeam} <span className="text-slate-500">vs</span> {event.awayTeam}
        </h2>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-bold ${
            open
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
              : "border-white/10 bg-black/20 text-slate-400"
          }`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
        {/* Formulaire */}
        {!open ? (
          <div className="grid place-items-center rounded-xl border border-white/10 bg-black/20 p-4 text-center text-sm text-slate-400">
            {hasResult
              ? `Pronostics clos - score final ${event.finalHomeScore}-${event.finalAwayScore}.`
              : "Pronostics fermés - le coup d'envoi est passé."}
          </div>
        ) : authenticated ? (
          <form
            onSubmit={submit}
            className="rounded-xl border border-white/10 bg-black/20 p-4"
          >
            <p className="text-xs font-black uppercase text-emerald-300">
              {mine ? "Modifier mon pronostic" : "Mon pronostic"}
            </p>
            {mine && (
              <p className="text-center text-[11px] text-slate-500">
                Pronostic déjà enregistré
              </p>
            )}
            <div className="mt-3 flex items-center justify-center gap-3">
              <ScoreInput label={event.homeTeam} value={home} onChange={setHome} />
              <span className="text-2xl font-black text-slate-500">-</span>
              <ScoreInput label={event.awayTeam} value={away} onChange={setAway} />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-4 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Trophy size={16} />}
              Valider
            </button>
            {msg && <p className="mt-2 text-center text-xs text-emerald-300">{msg}</p>}
          </form>
        ) : (
          <div className="grid place-items-center rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-slate-400">
            Connexion requise pour pronostiquer.{" "}
          </div>
        )}

        {/* Communaute */}
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="flex items-center gap-2 text-xs font-black uppercase text-slate-400">
            <Users2 size={14} /> {predictions.length} pronostic(s)
          </p>
          {predictions.length > 0 ? (
            <>
              <div className="mt-3 flex gap-2 text-xs">
                <Vote label={event.homeTeam} count={winnerVotes.home} color="#34d399" />
                <Vote label="Nul" count={winnerVotes.draw} color="#94a3b8" />
                <Vote label={event.awayTeam} count={winnerVotes.away} color="#fbbf24" />
              </div>
              {hasResult && (
                <p className="mt-2 text-[11px] text-emerald-300">
                  Score final {event.finalHomeScore}-{event.finalAwayScore} · bons pronostics en vert
                </p>
              )}
              <ul className="mt-3 grid max-h-40 gap-1 overflow-auto text-sm">
                {predictions.slice(0, 12).map((p) => {
                  const correct =
                    hasResult &&
                    p.predicted_home === event.finalHomeScore &&
                    p.predicted_away === event.finalAwayScore;
                  return (
                    <li
                      key={p.id}
                      className={`flex justify-between rounded px-2 py-1 ${
                        correct
                          ? "bg-emerald-500/20 text-emerald-100"
                          : "bg-white/[0.03] text-slate-300"
                      }`}
                    >
                      <span className="truncate">
                        {correct && "✅ "}
                        {p.pseudo}
                      </span>
                      <span className="font-bold">
                        {p.predicted_home} - {p.predicted_away}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              Sois le premier à pronostiquer ce match.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function ScoreInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid justify-items-center gap-1 text-center">
      <span className="max-w-24 truncate text-xs text-slate-400">{label}</span>
      <input
        type="number"
        min={0}
        max={30}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-14 w-16 rounded-lg border border-white/10 bg-black/40 text-center text-2xl font-black outline-none focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-400/30"
      />
    </label>
  );
}

function Vote({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <span
      className="flex-1 rounded-lg border px-2 py-1 text-center font-bold"
      style={{ borderColor: `${color}55`, color }}
    >
      <span className="block max-w-full truncate">{label}</span>
      <span className="text-base">{count}</span>
    </span>
  );
}
