"use client";

import {
  AlertTriangle,
  Droplets,
  Leaf,
  Radio,
  ShieldAlert,
  Users,
  Volume2,
  Wind,
  Thermometer,
  Wine,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { GaugeRing } from "@/components/GaugeRing";
import { Sparkline } from "@/components/Sparkline";
import type {
  EcoDomain,
  EcoDomainKey,
  EcosystemSnapshot,
  ReadingStatus,
} from "@/lib/types";

// Capteurs dont l'horodatage est stocke en VRAI UTC (notre son + climat G1E) :
// on les convertit en heure de Paris. Les autres groupes stockent deja l'heure
// locale (etiquetee UTC) -> on les affiche tels quels.
const UTC_TRUE_DOMAINS = new Set<EcoDomainKey>(["sound", "temperature", "humidity"]);

const DOMAIN_ICON: Record<EcoDomainKey, typeof Volume2> = {
  sound: Volume2,
  affluence: Users,
  air: Wind,
  temperature: Thermometer,
  humidity: Droplets,
  alcohol: Wine,
};

const STATUS_COLOR: Record<ReadingStatus, string> = {
  ok: "#34d399",
  warning: "#facc15",
  alert: "#fb923c",
  critical: "#f87171",
};

const STATUS_LABEL: Record<ReadingStatus, string> = {
  ok: "Nominal",
  warning: "Vigilance",
  alert: "Alerte",
  critical: "Critique",
};

function domainColor(domain: EcoDomain): string {
  if (domain.status !== "live") return "#64748b";
  return domain.readingStatus ? STATUS_COLOR[domain.readingStatus] : "#34d399";
}

export function RegieClient({ initial }: { initial: EcosystemSnapshot }) {
  const [snapshot, setSnapshot] = useState<EcosystemSnapshot>(initial);
  const [ecoMode, setEcoMode] = useState(false);
  const [live, setLive] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/ecosystem", { cache: "no-store" });
      if (res.ok) {
        setSnapshot(await res.json());
        setLive(true);
      }
    } catch {
      setLive(false);
    }
  }, []);

  useEffect(() => {
    const interval = ecoMode ? 15000 : 2000;
    let cancelled = false;

    const loop = async () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        await refresh();
      }
      timer.current = setTimeout(loop, interval);
    };

    timer.current = setTimeout(loop, interval);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ecoMode, refresh]);

  const { domains, indices, alerts, occupancy, alcohol } = snapshot;
  const liveCount = domains.filter((d) => d.status === "live").length;

  return (
    <div className="grid gap-6">
      {/* En-tete regie */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black">
            <Radio className="text-emerald-300" /> Régie connectée
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Tout le bar en un coup d&apos;œil : chaque capteur alimente la même
            régie en temps réel.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${
              live
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                : "border-rose-400/30 bg-rose-400/10 text-rose-200"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${live ? "bg-emerald-400 fb-pulse" : "bg-rose-400"}`}
            />
            {live ? "Live" : "Hors-ligne"}
          </span>
          <button
            type="button"
            onClick={() => setEcoMode((v) => !v)}
            aria-pressed={ecoMode}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              ecoMode
                ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
                : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10"
            }`}
            title="Réduit la fréquence de rafraîchissement pour économiser énergie et données"
          >
            <Leaf size={14} />
            Mode éco {ecoMode ? "ON" : "OFF"}
          </button>
        </div>
      </section>

      {/* Capteurs connectes */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-xs font-black uppercase tracking-wide text-slate-400">
          Capteurs connectés du bar
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {domains.map((d) => (
            <span
              key={d.key}
              className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
                d.status === "live"
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                  : "border-white/10 bg-white/[0.03] text-slate-500"
              }`}
            >
              {d.label}
              {d.status !== "live" && " (attente)"}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {liveCount} capteur(s) actif(s) en direct.
        </p>
      </section>

      {/* Alertes securite */}
      {alerts.length > 0 && (
        <section className="grid gap-2" aria-label="Alertes en cours">
          {alerts.map((a) => (
            <div
              key={a.id}
              role="alert"
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                a.severity === "critical"
                  ? "border-rose-400/40 bg-rose-500/10 text-rose-100"
                  : a.severity === "alert"
                    ? "border-orange-400/40 bg-orange-500/10 text-orange-100"
                    : "border-yellow-400/30 bg-yellow-500/10 text-yellow-100"
              }`}
            >
              {a.severity === "critical" ? (
                <ShieldAlert size={18} className="mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              )}
              <div>{a.message}</div>
            </div>
          ))}
        </section>
      )}

      {/* Indices composites */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <h2 className="mb-5 text-sm font-black uppercase tracking-wide text-slate-400">
          Indices composites (calculés en croisant les capteurs)
        </h2>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {indices.map((idx) => (
            <GaugeRing
              key={idx.key}
              value={idx.value}
              label={idx.label}
              caption={idx.caption}
            />
          ))}
        </div>
      </section>

      {/* Occupation */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/15 to-white/[0.02] p-6 lg:col-span-1">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-300">
            <Users size={16} /> Occupation du bar
          </h3>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-4xl font-black">
              {occupancy.current ?? "--"}
            </span>
            <span className="mb-1 text-slate-400">
              / {occupancy.capacity ?? "?"} places
            </span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-blue-400 transition-all"
              style={{ width: `${Math.min((occupancy.ratio ?? 0) * 100, 100)}%` }}
            />
          </div>
          <div className="mt-3 flex justify-between text-xs text-slate-400">
            <span>
              Taux : {occupancy.ratio != null ? Math.round(occupancy.ratio * 100) : "--"}%
            </span>
            <span className="text-slate-500">Affluence en temps réel</span>
          </div>
          {(occupancy.flowIn != null || occupancy.flowOut != null) && (
            <div className="mt-3 flex gap-4 text-xs">
              <span className="text-emerald-300">+{occupancy.flowIn ?? 0} entrées</span>
              <span className="text-rose-300">-{occupancy.flowOut ?? 0} sorties</span>
              <span className="text-slate-500">(tendance récente)</span>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-300">
              <Wine size={16} /> Prévention alcoolémie
            </h3>
            <span className="text-[11px] text-slate-500">Limite légale : 0,5 g/L</span>
          </div>

          {alcohol.subjects > 0 ? (
            <>
              {/* Chiffre actionnable */}
              <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-2">
                <div>
                  <div
                    className="text-4xl font-black"
                    style={{ color: alcohol.overLimit > 0 ? "#f87171" : "#34d399" }}
                  >
                    {alcohol.overLimit}
                    <span className="text-lg text-slate-400"> / {alcohol.subjects}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    personne(s) au-dessus de la limite
                  </div>
                </div>
                <div className="flex gap-5 text-sm">
                  <div>
                    <div className="font-black">{fmtAlcool(alcohol.recentAverage)}</div>
                    <div className="text-[11px] text-slate-500">moyenne foule 1h (g/L)</div>
                  </div>
                  <div>
                    <div className="font-black text-amber-300">{fmtAlcool(alcohol.max)}</div>
                    <div className="text-[11px] text-slate-500">maxi (g/L)</div>
                  </div>
                  <div>
                    <div className="font-black">{alcohol.total}</div>
                    <div className="text-[11px] text-slate-500">mesures</div>
                  </div>
                </div>
              </div>

              {/* Répartition */}
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-emerald-400/20">
                <div
                  className="h-full rounded-full bg-rose-500"
                  style={{ width: `${(alcohol.overLimit / alcohol.subjects) * 100}%` }}
                />
              </div>

              {/* Détail par personne */}
              <ul className="mt-4 grid gap-1 text-sm sm:grid-cols-2">
                {alcohol.perSubject.slice(0, 6).map((s) => {
                  const over = s.level >= alcohol.limit;
                  return (
                    <li
                      key={s.subjectId}
                      className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-1.5"
                    >
                      <span className="truncate text-slate-300">Personne {s.subjectId}</span>
                      <span className="flex items-center gap-2">
                        <span className={`font-black ${over ? "text-rose-300" : "text-emerald-300"}`}>
                          {fmtAlcool(s.level)} g/L
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase ${
                            over ? "bg-rose-500/20 text-rose-200" : "bg-emerald-500/20 text-emerald-200"
                          }`}
                        >
                          {over ? "Au-dessus" : "OK"}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="mt-4 text-xs text-slate-500">
              Aucune mesure d&apos;alcoolémie pour l&apos;instant.
            </p>
          )}
        </div>
      </section>

      {/* Cartes capteurs */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {domains.map((domain) => (
          <SensorCard key={domain.key} domain={domain} />
        ))}
      </section>
    </div>
  );
}

function fmtAlcool(value: number | null): string {
  if (value == null) return "--";
  return value.toFixed(2).replace(".", ",");
}

export function SensorCard({ domain }: { domain: EcoDomain }) {
  const Icon = DOMAIN_ICON[domain.key];
  const color = domainColor(domain);
  const isLive = domain.status === "live";

  return (
    <article className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="grid h-9 w-9 place-items-center rounded-lg"
            style={{ backgroundColor: `${color}22`, color }}
          >
            <Icon size={18} />
          </span>
          <div>
            <div className="text-sm font-black">{domain.label}</div>
            <div className="text-[11px] text-slate-500">{domain.sensor}</div>
          </div>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase"
          style={{ backgroundColor: `${color}22`, color }}
        >
          {isLive
            ? domain.readingStatus
              ? STATUS_LABEL[domain.readingStatus]
              : "Live"
            : "Attente"}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-black" style={{ color: isLive ? color : "#64748b" }}>
            {isLive && domain.value != null ? domain.value : "--"}
          </span>
          <span className="text-sm text-slate-400">{domain.unit}</span>
        </div>
        {isLive && domain.history.length > 1 && (
          <Sparkline points={domain.history.map((p) => p.v)} color={color} />
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500">{domain.note}</p>

      {isLive && domain.measuredAt && (
        <p className="mt-2 text-[11px] text-slate-500">
          Valeur du{" "}
          <span className="font-semibold text-slate-400">
            {fmtMoment(domain.measuredAt, UTC_TRUE_DOMAINS.has(domain.key) ? "Europe/Paris" : "UTC")}
          </span>
        </p>
      )}

      <div className="mt-auto flex items-center justify-between pt-3 text-[11px] text-slate-600">
        <span>{isLive ? "Temps réel" : "En attente de mesure"}</span>
        {isLive && domain.rowCount != null && <span>{domain.rowCount} mesures</span>}
      </div>
    </article>
  );
}

/**
 * Formate une date ISO en "JJ/MM/AAAA à HH:MM:SS".
 *
 * Subtilité de fuseau : notre capteur de son enregistre en VRAI UTC -> on le
 * convertit en heure de Paris pour afficher l'heure réelle. Les autres groupes
 * stockent deja leur heure locale (etiquetee UTC), donc on les affiche en UTC
 * pour ne pas decaler une 2e fois.
 */
function fmtMoment(iso: string | null, timeZone: string = "UTC"): string {
  if (!iso) return "--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  const date = d.toLocaleDateString("fr-FR", { timeZone });
  const time = d.toLocaleTimeString("fr-FR", { timeZone });
  return `${date} à ${time}`;
}
