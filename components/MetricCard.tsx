import { formatValue, metricLabels } from "@/lib/format";
import type { MetricType, SensorReading } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

export function MetricCard({
  type,
  reading,
}: {
  type: MetricType;
  reading?: SensorReading;
}) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.05] p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-black uppercase text-slate-400">{metricLabels[type]}</span>
        {reading ? <StatusBadge status={reading.status} /> : null}
      </div>
      <strong className="mt-5 block text-3xl font-black text-white">
        {formatValue(reading?.value, reading?.unit)}
      </strong>
      <span className="mt-2 block text-xs text-slate-500">
        {getSourceLabel(reading?.source)}
      </span>
    </article>
  );
}

function getSourceLabel(source?: string) {
  if (source === "supabase") return "Mesure en direct";
  if (source === "manual") return "Capteur";
  if (source === "mock") return "Demo";
  return "En attente de mesure";
}
