"use client";

import { AlertTriangle, Check, Pencil, ShieldCheck, Users, Wine } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createClient } from "@/utils/supabase/client";
import type { AlcoholPerson, AlcoholReport, ReadingStatus } from "@/lib/types";

type SortMode = "recent" | "level";

const STATUS_COLOR: Record<ReadingStatus, string> = {
  ok: "#34d399",
  warning: "#facc15",
  alert: "#fb923c",
  critical: "#f87171",
};

function fmtLevel(v: number | null): string {
  return v == null ? "--" : v.toFixed(2).replace(".", ",");
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("fr-FR", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  const date = d.toLocaleDateString("fr-FR", { timeZone: "UTC" });
  return `${date} à ${fmtTime(iso)}`;
}

type ProfileOption = { id: string; pseudo: string };

export function AlcoholClient({
  initial,
  gerant = false,
  profiles = [],
}: {
  initial: AlcoholReport;
  gerant?: boolean;
  profiles?: ProfileOption[];
}) {
  const [report, setReport] = useState<AlcoholReport>(initial);
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/alcohol", { cache: "no-store" });
      if (res.ok) setReport(await res.json());
    } catch {
      /* garde la derniere valeur */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loop = async () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        await refresh();
      }
      timer.current = setTimeout(loop, 5000);
    };
    timer.current = setTimeout(loop, 5000);
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [refresh]);

  const { people, dangers, recentAverage, recentCount, totalMeasures, limit } = report;

  const sortedPeople = useMemo(() => {
    const copy = [...people];
    if (sortMode === "recent") {
      copy.sort(
        (a, b) => new Date(b.lastTestAt).getTime() - new Date(a.lastTestAt).getTime(),
      );
    } else {
      copy.sort((a, b) => b.latest - a.latest);
    }
    return copy;
  }, [people, sortMode]);

  async function renamePerson(subjectId: string, alias: string) {
    const supabase = createClient();
    const clean = alias.trim();
    if (!clean) return;
    await supabase
      .from("g1a_subject_aliases")
      .upsert({ subject_id: subjectId, alias: clean }, { onConflict: "subject_id" });
    await refresh();
  }

  async function linkPerson(subjectId: string, userId: string | null) {
    const supabase = createClient();
    if (userId) {
      await supabase
        .from("g1a_subject_links")
        .upsert({ subject_id: subjectId, user_id: userId }, { onConflict: "subject_id" });
    } else {
      await supabase.from("g1a_subject_links").delete().eq("subject_id", subjectId);
    }
    await refresh();
  }

  return (
    <div className="grid gap-6">
      {/* Synthese */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={Wine}
          label="Alcoolémie moyenne (foule, 1h)"
          value={`${fmtLevel(recentAverage)} g/L`}
          sub={`${recentCount} personne(s)`}
          accent={recentAverage != null && recentAverage >= limit ? "#f87171" : "#34d399"}
        />
        <SummaryCard
          icon={Users}
          label="Personnes testées"
          value={`${people.length}`}
          sub={`${totalMeasures} mesures`}
          accent="#38bdf8"
        />
        <SummaryCard
          icon={AlertTriangle}
          label="Au-dessus de la limite"
          value={`${dangers.length}`}
          sub={`limite ${fmtLevel(limit)} g/L`}
          accent={dangers.length > 0 ? "#f87171" : "#34d399"}
        />
        <SummaryCard
          icon={ShieldCheck}
          label="Dans les clous"
          value={`${people.length - dangers.length}`}
          sub="sous la limite"
          accent="#34d399"
        />
      </section>

      {/* Personnes a risque */}
      {dangers.length > 0 && (
        <section className="rounded-2xl border border-rose-400/30 bg-rose-500/[0.06] p-6">
          <h2 className="flex items-center gap-2 text-lg font-black text-rose-100">
            <AlertTriangle size={18} /> Personnes à risque ({dangers.length})
          </h2>
          <p className="mt-1 text-sm text-rose-200/80">
            Au-dessus de {fmtLevel(limit)} g/L - prévoir un retour sécurisé (taxi, accompagnant).
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {dangers.map((p) => (
              <span
                key={p.subjectId}
                className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-1.5 text-sm font-bold text-rose-100"
              >
                {p.name} · {fmtLevel(p.latest)} g/L
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Evolution par personne */}
      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-black">Évolution par personne</h2>
          <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setSortMode("recent")}
              className={`rounded px-3 py-1.5 ${sortMode === "recent" ? "bg-emerald-400 text-slate-950" : "text-slate-300"}`}
            >
              Plus récent
            </button>
            <button
              type="button"
              onClick={() => setSortMode("level")}
              className={`rounded px-3 py-1.5 ${sortMode === "level" ? "bg-emerald-400 text-slate-950" : "text-slate-300"}`}
            >
              Taux
            </button>
          </div>
        </div>
        {people.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.04] p-5 text-slate-400">
            Aucune mesure d&apos;alcoolémie disponible pour le moment.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {sortedPeople.map((p) => (
              <PersonCard
                key={p.subjectId}
                person={p}
                limit={limit}
                gerant={gerant}
                profiles={profiles}
                onRename={renamePerson}
                onLink={linkPerson}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof Wine;
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
        <Icon size={15} style={{ color: accent }} /> {label}
      </div>
      <div className="mt-2 text-3xl font-black" style={{ color: accent }}>
        {value}
      </div>
      <div className="text-xs text-slate-500">{sub}</div>
    </div>
  );
}

function PersonCard({
  person,
  limit,
  gerant,
  onRename,
}: {
  person: AlcoholPerson;
  limit: number;
  gerant: boolean;
  onRename: (subjectId: string, alias: string) => Promise<void>;
}) {
  const color = STATUS_COLOR[person.status];
  const over = person.latest >= limit;
  const data = person.series.map((pt) => ({ time: fmtTime(pt.t), level: pt.level }));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(person.name);

  async function save() {
    await onRename(person.subjectId, draft);
    setEditing(false);
  }

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                autoFocus
                className="min-h-8 w-40 rounded-lg border border-white/10 bg-black/40 px-2 text-sm outline-none focus:border-emerald-400/70"
              />
              <button
                type="button"
                onClick={save}
                aria-label="Enregistrer le nom"
                className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-400 text-slate-950"
              >
                <Check size={15} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="truncate font-black">{person.name}</span>
              {gerant && (
                <button
                  type="button"
                  onClick={() => {
                    setDraft(person.name);
                    setEditing(true);
                  }}
                  aria-label="Renommer"
                  className="text-slate-500 hover:text-emerald-300"
                >
                  <Pencil size={13} />
                </button>
              )}
            </div>
          )}
          <div className="text-[11px] text-slate-500">
            {person.count} test(s)
            {person.deviceId ? ` · carte ${person.deviceId}` : ""}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black" style={{ color }}>
            {fmtLevel(person.latest)} <span className="text-sm text-slate-400">g/L</span>
          </div>
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase ${
              over ? "bg-rose-500/20 text-rose-200" : "bg-emerald-500/20 text-emerald-200"
            }`}
          >
            {over ? "Au-dessus" : "OK"}
          </span>
        </div>
      </div>

      <div className="mt-4 h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 10 }} minTickGap={20} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} domain={[0, "auto"]} />
            <Tooltip
              contentStyle={{
                background: "#0f172a",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "#94a3b8" }}
              formatter={(value) => [`${fmtLevel(Number(value))} g/L`, "Taux"]}
            />
            <ReferenceLine y={limit} stroke="#f87171" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="level"
              stroke={color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap justify-between gap-x-3 text-[11px] text-slate-500">
        <span>Max : {fmtLevel(person.max)} g/L</span>
        <span>Moyenne : {fmtLevel(person.average)} g/L</span>
        <span>Dernier test : {fmtDateTime(person.lastTestAt)}</span>
      </div>
    </article>
  );
}
