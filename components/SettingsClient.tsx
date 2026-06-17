"use client";

import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { metricLabels } from "@/lib/format";
import type { Threshold } from "@/lib/types";

export function SettingsClient() {
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { thresholds: Threshold[] }) => setThresholds(payload.thresholds))
      .catch(() => setThresholds([]));
  }, []);

  function updateThreshold(id: number, key: keyof Pick<Threshold, "warningValue" | "alertValue" | "criticalValue">, value: string) {
    setThresholds((items) =>
      items.map((threshold) =>
        threshold.id === id ? { ...threshold, [key]: Number(value) } : threshold,
      ),
    );
  }

  async function save() {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thresholds }),
    });
    setMessage("Seuils sauvegardes en mode mock.");
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-white/10 bg-white/[0.05] p-6">
        <p className="text-xs font-black uppercase text-amber-300">Parametres</p>
        <h1 className="mt-2 text-4xl font-black text-white">Seuils capteurs</h1>
        <p className="mt-3 text-slate-400">
          Les seuils pilotent les statuts, les alertes et les recommandations
          affiches dans toute l&apos;application.
        </p>
      </section>

      <section className="rounded-lg border border-white/10 bg-slate-950/55 p-5">
        <div className="grid gap-3">
          {thresholds.map((threshold) => (
            <div
              key={threshold.id}
              className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-4 lg:grid-cols-[1fr_repeat(3,160px)]"
            >
              <div>
                <span className="text-xs font-black uppercase text-slate-500">Metrique</span>
                <strong className="mt-1 block text-lg text-white">{metricLabels[threshold.metricType]}</strong>
              </div>
              <ThresholdInput label="Warning" value={threshold.warningValue} unit={threshold.unit} onChange={(value) => updateThreshold(threshold.id, "warningValue", value)} />
              <ThresholdInput label="Alerte" value={threshold.alertValue} unit={threshold.unit} onChange={(value) => updateThreshold(threshold.id, "alertValue", value)} />
              <ThresholdInput label="Critique" value={threshold.criticalValue} unit={threshold.unit} onChange={(value) => updateThreshold(threshold.id, "criticalValue", value)} />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void save()}
          className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-lg bg-emerald-400 px-5 font-black text-slate-950"
        >
          <Save size={17} />
          Sauvegarder
        </button>
        {message ? <p className="mt-4 text-sm text-emerald-200">{message}</p> : null}
      </section>
    </div>
  );
}

function ThresholdInput({
  label,
  value,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm font-bold text-slate-300">
      {label}
      <div className="mt-2 flex overflow-hidden rounded-lg border border-white/10 bg-slate-900">
        <input
          type="number"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent px-3 py-3 text-white outline-none"
        />
        <span className="grid place-items-center border-l border-white/10 px-3 text-xs text-slate-400">
          {unit}
        </span>
      </div>
    </label>
  );
}
