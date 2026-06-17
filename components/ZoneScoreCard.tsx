import { MetricCard } from "./MetricCard";
import type { ZoneScore } from "@/lib/types";

const metricOrder = ["decibel", "temperature", "smoke", "gas", "people_count"] as const;

export function ZoneScoreCard({ score }: { score: ZoneScore }) {
  return (
    <article className="rounded-lg border border-white/10 bg-slate-950/55 p-5 shadow-2xl shadow-black/20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-slate-400">{score.zone.supporterTeam}</p>
          <h2 className="mt-1 text-2xl font-black text-white">{score.zone.name}</h2>
          {score.zone.card ? (
            <p className="mt-2 text-sm font-bold text-cyan-200">{score.zone.card}</p>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-3 text-right">
          <div>
            <span className="text-xs font-bold uppercase text-slate-500">Ambiance</span>
            <strong className="block text-3xl font-black text-emerald-300">
              {score.ambianceScore ?? "--"}
            </strong>
          </div>
          <div>
            <span className="text-xs font-bold uppercase text-slate-500">Confort</span>
            <strong className="block text-3xl font-black text-cyan-300">
              {score.comfortScore ?? "--"}
            </strong>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-black uppercase">
        {score.liveMetrics.length > 0 ? (
          score.liveMetrics.map((metric) => (
            <span key={metric} className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-emerald-100">
              {metric} live
            </span>
          ))
        ) : (
          <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1 text-amber-100">
            En attente capteurs
          </span>
        )}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {metricOrder.map((type) => (
          <MetricCard key={type} type={type} reading={score.latest[type]} />
        ))}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-black uppercase text-slate-400">Recommandations</p>
          <ul className="mt-3 grid gap-2 text-sm text-slate-200">
            {score.recommendations.map((recommendation) => (
              <li key={recommendation}>{recommendation}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-black uppercase text-slate-400">Alertes actives</p>
          <ul className="mt-3 grid gap-2 text-sm text-slate-200">
            {score.alerts.length > 0 ? (
              score.alerts.map((alert) => <li key={alert.id}>{alert.message}</li>)
            ) : (
              <li>Aucune alerte active.</li>
            )}
          </ul>
        </div>
      </div>
    </article>
  );
}
