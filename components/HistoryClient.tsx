"use client";

import { Archive, Gauge, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import type { EventHistoryItem } from "@/lib/types";
import { formatDateTime, formatValue, metricLabels } from "@/lib/format";

type HistoryResponse = {
  items: EventHistoryItem[];
  message?: string | null;
};

export function HistoryClient() {
  const [items, setItems] = useState<EventHistoryItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/events/history", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: HistoryResponse) => {
        setItems(payload.items ?? []);
        setMessage(payload.message ?? null);
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Historique indisponible.");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-white/10 bg-white/[0.05] p-6">
        <p className="text-xs font-black uppercase text-cyan-300">Historique</p>
        <h1 className="mt-2 text-4xl font-black text-white">Evenements termines</h1>
        <p className="mt-3 text-slate-400">
          Score final et moyennes des metriques par zone pour les sessions cloturees.
        </p>
      </section>

      {message ? (
        <p className="rounded-lg border border-amber-300/25 bg-amber-300/10 p-4 text-amber-100">
          {message}
        </p>
      ) : null}

      {loading ? (
        <p className="rounded-lg border border-cyan-400/30 bg-cyan-500/15 p-4 text-cyan-100">
          Chargement de l'historique...
        </p>
      ) : null}

      <section className="grid gap-5">
        {items.map((item) => (
          <article key={item.event.id} className="rounded-lg border border-white/10 bg-slate-950/55 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-cyan-200">
                  <Archive size={18} />
                  <p className="text-xs font-black uppercase">Evenement termine</p>
                </div>
                <h2 className="mt-2 text-2xl font-black text-white">{item.event.name}</h2>
                <p className="mt-2 text-sm text-slate-400">
                  {item.event.competition} - fini le {formatDateTime(item.event.finishedAt ?? item.event.updatedAt)}
                </p>
              </div>

              <div className="rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-5 py-4 text-center">
                <div className="flex items-center justify-center gap-2 text-emerald-200">
                  <Trophy size={18} />
                  <span className="text-xs font-black uppercase">Score final</span>
                </div>
                <strong className="mt-2 block text-4xl font-black text-white">
                  {formatScore(item.score.home)} - {formatScore(item.score.away)}
                </strong>
                <p className="mt-1 text-xs text-emerald-100/75">
                  {item.event.homeTeam} vs {item.event.awayTeam}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <ZoneAverageBlock
                label={item.event.zoneB.label}
                team={item.event.zoneB.team}
                card={item.event.zoneB.card}
                zone="zoneB"
                item={item}
              />
              <ZoneAverageBlock
                label={item.event.zoneA.label}
                team={item.event.zoneA.team}
                card={item.event.zoneA.card}
                zone="zoneA"
                item={item}
              />
            </div>
          </article>
        ))}
      </section>

      {!loading && items.length === 0 ? (
        <p className="rounded-lg border border-white/10 bg-white/[0.04] p-5 text-slate-400">
          Aucun evenement termine pour le moment. Termine une session depuis le dashboard pour la voir ici.
        </p>
      ) : null}
    </div>
  );
}

function ZoneAverageBlock({
  label,
  team,
  card,
  zone,
  item,
}: {
  label: string;
  team: string;
  card: string;
  zone: "zoneA" | "zoneB";
  item: EventHistoryItem;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-slate-300">
        <Gauge size={18} />
        <p className="text-xs font-black uppercase">{label}</p>
      </div>
      <h3 className="mt-2 text-2xl font-black text-white">{team}</h3>
      <p className="mt-1 text-sm font-bold text-cyan-200">{card}</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {item.averages.map((average) => (
          <div key={`${zone}-${average.type}`} className="rounded-lg border border-white/10 bg-slate-950/55 p-3">
            <span className="text-xs font-black uppercase text-slate-500">
              {metricLabels[average.type]}
            </span>
            <strong className="mt-2 block text-xl font-black text-white">
              {formatValue(average[zone] ?? undefined, average.unit)}
            </strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatScore(score: number | null) {
  return typeof score === "number" ? score : "--";
}
