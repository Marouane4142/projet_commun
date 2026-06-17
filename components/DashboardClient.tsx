"use client";

import {
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  RefreshCw,
  Users,
  Wind,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DashboardData, DashboardVenue, FanEvent, ZoneScore } from "@/lib/types";
import { formatDateTime, formatValue, metricLabels } from "@/lib/format";
import { stopLocalBridgeEvent } from "@/lib/localBridgeClient";

const refreshDelay = 2_000;
const eventStorageKey = "fanbar:selected-event-id";

type EventsResponse = {
  events: FanEvent[];
  message?: string | null;
};

export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [events, setEvents] = useState<FanEvent[]>([]);
  const [eventsMessage, setEventsMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  const selectableEvents = useMemo(
    () => events.filter((event) => event.status !== "finished" && event.status !== "archived"),
    [events],
  );

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const response = await fetch("/api/events", { cache: "no-store" });
      const payload = (await response.json()) as EventsResponse;
      setEvents(payload.events ?? []);
      setEventsMessage(payload.message ?? null);
    } catch (requestError) {
      setEventsMessage(
        requestError instanceof Error ? requestError.message : "Chargement des evenements impossible.",
      );
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedEventId) params.set("eventId", selectedEventId);
      const query = params.toString();
      const response = await fetch(`/api/dashboard${query ? `?${query}` : ""}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as DashboardData & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Chargement impossible.");
      setData(payload);
      setError(selectedEventId && !payload.event ? "Evenement introuvable." : null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlEventId = params.get("eventId");
    const storedEventId = window.localStorage.getItem(eventStorageKey);
    const initialEventId = urlEventId ?? storedEventId;

    if (initialEventId) {
      setSelectedEventId(initialEventId);
    }

    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), refreshDelay);
    return () => window.clearInterval(interval);
  }, [load]);

  const selectedEvent =
    data?.event ?? selectableEvents.find((event) => String(event.id) === selectedEventId) ?? null;
  const zoneA = data?.zones.find((zone) => zone.zone.id === 1) ?? null;
  const zoneB = data?.zones.find((zone) => zone.zone.id === 2) ?? null;

  function selectEvent(eventId: number) {
    const nextEventId = String(eventId);
    window.localStorage.setItem(eventStorageKey, nextEventId);
    window.history.replaceState(null, "", `/dashboard?eventId=${nextEventId}`);
    setSelectedEventId(nextEventId);
    setLoading(true);
  }

  function changeEvent() {
    window.localStorage.removeItem(eventStorageKey);
    window.history.replaceState(null, "", "/dashboard");
    setSelectedEventId(null);
    setData(null);
    setLoading(false);
  }

  async function finishEvent() {
    if (!selectedEvent || !data?.match) return;

    setFinishing(true);
    setError(null);

    try {
      await stopLocalBridgeEvent(selectedEvent.id);

      const response = await fetch(`/api/events/${selectedEvent.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "finished",
          finalHomeScore: data.match.homeScore,
          finalAwayScore: data.match.awayScore,
          skipBridgeStop: true,
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Impossible de terminer l'evenement.");
      }

      window.localStorage.removeItem(eventStorageKey);
      window.location.href = "/history";
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Erreur inconnue.");
    } finally {
      setFinishing(false);
    }
  }

  if (!selectedEvent) {
    return (
      <div className="space-y-5">
        <section className="rounded-lg border border-white/10 bg-white/[0.05] p-5">
          <p className="text-xs font-black uppercase text-emerald-300">Dashboard live</p>
          <h1 className="mt-2 text-4xl font-black text-white">Choisir un evenement</h1>
          <p className="mt-3 text-slate-400">
            Selectionne une session existante pour ouvrir le score et les deux zones live.
          </p>
        </section>

        <EventSelector
          events={selectableEvents}
          loading={eventsLoading}
          message={eventsMessage}
          onRefresh={loadEvents}
          onSelect={selectEvent}
        />

        {loading ? (
          <p className="rounded-lg border border-cyan-400/30 bg-cyan-500/15 p-4 text-cyan-100">
            Chargement...
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="relative rounded-lg border border-white/10 bg-slate-950/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={changeEvent}
            className="min-h-10 rounded-lg border border-white/15 bg-white/8 px-4 text-sm font-black text-white"
          >
            Changer
          </button>
          <button
            type="button"
            onClick={() => void finishEvent()}
            disabled={finishing}
            className="min-h-10 rounded-lg bg-emerald-400 px-4 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {finishing ? "Finalisation..." : "Terminer"}
          </button>
        </div>

        <div className="mx-auto mt-5 grid max-w-4xl justify-items-center text-center">
          <p className="text-xs font-black uppercase text-cyan-300">{selectedEvent.name}</p>
          <div className="mt-4 grid w-full items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
            <TeamScoreLabel team={data?.match.homeTeam ?? selectedEvent.homeTeam} align="right" />
            <strong className="text-6xl font-black text-white sm:text-7xl">
              {data?.match ? `${data.match.homeScore} - ${data.match.awayScore}` : "--"}
            </strong>
            <TeamScoreLabel team={data?.match.awayTeam ?? selectedEvent.awayTeam} align="left" />
          </div>
          <p className="mt-4 text-sm text-slate-400">
            {data?.match.competition ?? selectedEvent.competition} - {data?.match.status ?? selectedEvent.status}
            {" "} - minute {data?.match.minute ?? "--"} - score actualise max toutes les 2 min
          </p>
        </div>
      </section>

      {error ? (
        <p className="rounded-lg border border-rose-400/30 bg-rose-500/15 p-4 text-rose-100">{error}</p>
      ) : null}

      {data?.venue ? <VenuePanel venue={data.venue} /> : null}

      {zoneB && zoneA ? <MetricsComparison left={zoneB} right={zoneA} /> : null}

      <p className="text-xs text-slate-500">
        Metrics actualisees toutes les 2s. Derniere generation : {formatDateTime(data?.generatedAt)}
      </p>
    </div>
  );
}

function VenuePanel({ venue }: { venue: DashboardVenue }) {
  const indexColor = (value: number | null) => {
    if (value == null) return "#64748b";
    if (value >= 70) return "#34d399";
    if (value >= 45) return "#facc15";
    return "#f87171";
  };

  return (
    <section className="rounded-lg border border-white/10 bg-slate-950/55 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-black uppercase text-emerald-300">
          Ambiance de la salle
        </p>
        <p className="text-[11px] text-slate-500">
          Son, affluence et qualite de l&apos;air en temps reel
        </p>
      </div>

      {venue.alerts.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {venue.alerts.map((alert) => (
            <div
              key={alert.id}
              role="alert"
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                alert.severity === "critical"
                  ? "border-rose-400/40 bg-rose-500/10 text-rose-100"
                  : alert.severity === "alert"
                    ? "border-orange-400/40 bg-orange-500/10 text-orange-100"
                    : "border-yellow-400/30 bg-yellow-500/10 text-yellow-100"
              }`}
            >
              <AlertTriangle size={15} className="shrink-0" />
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
            <Users size={14} /> Affluence
          </div>
          <div className="mt-2 text-3xl font-black text-white">
            {venue.affluence.live && venue.affluence.value != null
              ? venue.affluence.value
              : "--"}
            <span className="ml-1 text-sm text-slate-400">{venue.affluence.unit}</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {venue.occupancy.capacity
              ? `${venue.occupancy.current ?? "--"} / ${venue.occupancy.capacity} places`
              : "Capacite inconnue"}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
            <Wind size={14} /> Qualite de l&apos;air
          </div>
          <div className="mt-2 text-3xl font-black text-white">
            {venue.air.live && venue.air.value != null ? venue.air.value : "--"}
            <span className="ml-1 text-sm text-slate-400">{venue.air.unit}</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {venue.air.status ? `Etat : ${venue.air.status}` : "En attente"}
          </div>
        </div>

        {venue.indices
          .filter((i) => i.key === "fete" || i.key === "securite")
          .map((index) => (
            <div
              key={index.key}
              className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
            >
              <div className="text-xs font-bold uppercase text-slate-400">
                {index.label}
              </div>
              <div
                className="mt-2 text-3xl font-black"
                style={{ color: indexColor(index.value) }}
              >
                {index.value ?? "--"}
                <span className="ml-1 text-sm text-slate-500">/100</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">{index.caption}</div>
            </div>
          ))}
      </div>
    </section>
  );
}

function EventSelector({
  events,
  loading,
  message,
  onRefresh,
  onSelect,
}: {
  events: FanEvent[];
  loading: boolean;
  message: string | null;
  onRefresh: () => void;
  onSelect: (eventId: number) => void;
}) {
  return (
    <article className="rounded-lg border border-white/10 bg-slate-950/55 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-cyan-300">Evenements en cours</p>
          <h2 className="mt-1 text-2xl font-black text-white">Selectionner une session</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 bg-white/8 px-4 font-black text-white"
          >
            <RefreshCw size={17} />
            Recharger
          </button>
          <Link
            href="/events/new"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-400 px-4 font-black text-slate-950"
          >
            <CalendarPlus size={17} />
            Nouvel evenement
          </Link>
        </div>
      </div>

      {message ? (
        <p className="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/10 p-3 text-sm text-amber-100">
          {message}
        </p>
      ) : null}

      {loading ? <p className="mt-4 text-sm text-slate-400">Chargement des evenements...</p> : null}

      <div className="mt-4 grid gap-2 lg:grid-cols-2">
        {events.map((event) => (
          <button
            type="button"
            key={event.id}
            onClick={() => onSelect(event.id)}
            className="min-h-24 rounded-lg border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-emerald-300/35 hover:bg-emerald-400/10"
          >
            <span className="flex items-start justify-between gap-4">
              <span>
                <strong className="block text-lg font-black text-white">{event.name}</strong>
                <span className="mt-1 block text-sm text-slate-400">
                  {event.competition} - {formatDateTime(event.kickoffAt)}
                </span>
              </span>
              <CheckCircle2 size={18} className="text-emerald-300" />
            </span>
            <span className="mt-3 grid gap-1 text-sm text-slate-300">
              <span>{event.zoneA.team} / {event.zoneA.card}</span>
              <span>{event.zoneB.team} / {event.zoneB.card}</span>
            </span>
          </button>
        ))}
      </div>

      {!loading && events.length === 0 ? (
        <p className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
          Aucun evenement actif. Cree un evenement pour ouvrir le dashboard.
        </p>
      ) : null}
    </article>
  );
}

function TeamScoreLabel({ team, align }: { team: string; align: "left" | "right" }) {
  return (
    <span className={`text-3xl font-black text-white sm:text-4xl ${align === "right" ? "sm:text-right" : "sm:text-left"}`}>
      {team}
    </span>
  );
}

function MetricsComparison({ left, right }: { left: ZoneScore; right: ZoneScore }) {
  const rows = buildComparisonRows(left, right);

  return (
    <section className="rounded-lg border border-white/10 bg-slate-950/55 p-5">
      <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
        <div>
          <p className="text-xs font-black uppercase text-slate-500">{left.zone.name}</p>
          <h2 className="mt-1 text-3xl font-black text-white">{left.zone.supporterTeam}</h2>
          <p className="mt-1 text-sm font-bold text-cyan-200">{left.zone.card ?? "Carte inconnue"}</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-black uppercase text-cyan-300">Statistiques des zones</p>
          <p className="mt-1 text-sm text-slate-400">Metrics live par carte electronique</p>
        </div>
        <div className="md:text-right">
          <p className="text-xs font-black uppercase text-slate-500">{right.zone.name}</p>
          <h2 className="mt-1 text-3xl font-black text-white">{right.zone.supporterTeam}</h2>
          <p className="mt-1 text-sm font-bold text-cyan-200">{right.zone.card ?? "Carte inconnue"}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        {rows.map((row) => (
          <ComparisonRow
            key={row.label}
            row={row}
            leftColor={left.zone.color}
            rightColor={right.zone.color}
          />
        ))}
      </div>
    </section>
  );
}

type ComparisonRowData = {
  label: string;
  leftValue: number | null;
  rightValue: number | null;
  leftDisplay: string;
  rightDisplay: string;
};

function ComparisonRow({
  row,
  leftColor,
  rightColor,
}: {
  row: ComparisonRowData;
  leftColor: string;
  rightColor: string;
}) {
  const { leftShare, rightShare } = getShares(row.leftValue, row.rightValue);

  return (
    <div className="grid gap-2 md:grid-cols-[110px_1fr_110px] md:items-center">
      <strong className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-center text-lg font-black text-white md:text-left">
        {row.leftDisplay}
      </strong>
      <div>
        <div className="mb-2 text-center text-sm font-black uppercase text-slate-300">{row.label}</div>
        <div className="flex h-4 overflow-hidden rounded-full bg-white/10">
          <div
            className="transition-all"
            style={{
              width: `${leftShare}%`,
              background: leftShare > rightShare ? leftColor : `${leftColor}99`,
            }}
          />
          <div
            className="transition-all"
            style={{
              width: `${rightShare}%`,
              background: rightShare > leftShare ? rightColor : `${rightColor}99`,
            }}
          />
        </div>
      </div>
      <strong className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-center text-lg font-black text-white md:text-right">
        {row.rightDisplay}
      </strong>
    </div>
  );
}

function buildComparisonRows(left: ZoneScore, right: ZoneScore): ComparisonRowData[] {
  return [
    makeRow("Ambiance", left.ambianceScore, right.ambianceScore, ""),
    makeRow(metricLabels.decibel, left.latest.decibel?.value ?? null, right.latest.decibel?.value ?? null, "dB"),
    makeRow("Pic sonore", left.soundPeak, right.soundPeak, "dB"),
    makeRow("Confort", left.comfortScore, right.comfortScore, ""),
    makeRow(metricLabels.people_count, left.latest.people_count?.value ?? null, right.latest.people_count?.value ?? null, "pers."),
    makeRow(metricLabels.temperature, left.latest.temperature?.value ?? null, right.latest.temperature?.value ?? null, "C"),
    makeRow(metricLabels.smoke, left.latest.smoke?.value ?? null, right.latest.smoke?.value ?? null, "%"),
    makeRow(metricLabels.gas, left.latest.gas?.value ?? null, right.latest.gas?.value ?? null, "ppm"),
  ];
}

function makeRow(label: string, leftValue: number | null, rightValue: number | null, unit: string) {
  return {
    label,
    leftValue,
    rightValue,
    leftDisplay: formatValue(leftValue ?? undefined, unit),
    rightDisplay: formatValue(rightValue ?? undefined, unit),
  };
}

function getShares(leftValue: number | null, rightValue: number | null) {
  const left = typeof leftValue === "number" ? Math.max(leftValue, 0) : 0;
  const right = typeof rightValue === "number" ? Math.max(rightValue, 0) : 0;
  const total = left + right;

  if (total <= 0) {
    return {
      leftShare: 50,
      rightShare: 50,
    };
  }

  const leftShare = Math.max(8, Math.round((left / total) * 100));
  const rightShare = Math.max(8, 100 - leftShare);

  if (leftShare + rightShare > 100) {
    return leftShare > rightShare
      ? { leftShare: 100 - rightShare, rightShare }
      : { leftShare, rightShare: 100 - leftShare };
  }

  return { leftShare, rightShare };
}
