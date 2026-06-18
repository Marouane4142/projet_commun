"use client";

import { AlertTriangle, Radio, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { GaugeRing } from "@/components/ui/GaugeRing";
import { SensorCard } from "@/components/RegieClient";
import type { EcosystemSnapshot } from "@/lib/types";

/**
 * Vue temps réel des capteurs du bar (indices, alertes, cartes capteurs).
 * Réutilisée dans la régie et embarquée dans le dashboard d'événement.
 * Se rafraîchit toutes les 2 s et se met en pause quand l'onglet est masqué.
 */
export function EcosystemLive({
  initial,
  title = "Ambiance & sécurité de la salle",
}: {
  initial?: EcosystemSnapshot | null;
  title?: string;
}) {
  const [snapshot, setSnapshot] = useState<EcosystemSnapshot | null>(initial ?? null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/ecosystem", { cache: "no-store" });
      if (res.ok) setSnapshot(await res.json());
    } catch {
      /* on garde la dernière valeur connue */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loop = async () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        await refresh();
      }
      timer.current = setTimeout(loop, 2000);
    };
    timer.current = setTimeout(loop, 2000);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  if (!snapshot) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-400">
        Chargement des capteurs…
      </section>
    );
  }

  const { domains, indices, alerts } = snapshot;

  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <Radio size={18} className="text-emerald-300" /> {title}
        </h2>
        <span className="text-[11px] text-slate-500">Mise à jour toutes les 2 s</span>
      </div>

      {/* Alertes */}
      {alerts.length > 0 && (
        <div className="grid gap-2">
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
        </div>
      )}

      {/* Indices composites */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <p className="mb-4 text-xs text-slate-400">
          Indices de synthèse sur 100, calculés à partir des capteurs
          (0 = faible, 100 = maximal).
        </p>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {indices.map((idx) => (
            <GaugeRing key={idx.key} value={idx.value} label={idx.label} caption={idx.caption} />
          ))}
        </div>
      </div>

      {/* Cartes capteurs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {domains.map((domain) => (
          <SensorCard key={domain.key} domain={domain} />
        ))}
      </div>
    </section>
  );
}
