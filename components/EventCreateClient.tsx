"use client";

import {
  AlertTriangle,
  ArrowLeftRight,
  CalendarPlus,
  CheckCircle2,
  CircuitBoard,
  RefreshCw,
  Trophy,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ElectronicCard, FanEvent, MatchOption } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { getLocalBridgeStatus, startLocalBridgeEvent } from "@/lib/localBridgeClient";
import { MatchSelector } from "./MatchSelector";

const cardRefreshDelay = 2_000;
const OFFLINE_HIDE_DELAY_MS = 30_000;

type CardTrackerEntry = { everConnected: boolean; offlineSince: number | null };

type CardsResponse = {
  ok: boolean;
  activeEventId: number | null;
  cards: ElectronicCard[];
  message?: string | null;
};

export function EventCreateClient() {
  const router = useRouter();
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<MatchOption | null>(null);
  const [zoneATeam, setZoneATeam] = useState("");
  const [zoneBTeam, setZoneBTeam] = useState("");
  const [zoneACard, setZoneACard] = useState("");
  const [zoneBCard, setZoneBCard] = useState("");
  const [cards, setCards] = useState<ElectronicCard[]>([]);
  const [displayableCards, setDisplayableCards] = useState<ElectronicCard[]>([]);
  const cardTracker = useRef<Map<number, CardTrackerEntry>>(new Map());
  const [cardsLoading, setCardsLoading] = useState(true);
  const [cardsMessage, setCardsMessage] = useState<string | null>(null);
  const [eventName, setEventName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const teams = useMemo(() => {
    if (!selectedMatch) return [];
    return [selectedMatch.homeTeam, selectedMatch.awayTeam];
  }, [selectedMatch]);

  const selectableCards = useMemo(
    () => cards.filter((card) => card.healthy && card.available),
    [cards],
  );
  const zoneACardId = getCardId(zoneACard);
  const zoneBCardId = getCardId(zoneBCard);
  const cardSelectionError = useMemo(() => {
    if (cardsLoading) return "Chargement des cartes...";
    if (cardsMessage) return cardsMessage;
    if (selectableCards.length < 2) return "Deux cartes healthy et libres sont requises.";
    if (!zoneACard || !zoneBCard) return "Selectionne une carte pour chaque equipe.";
    if (!zoneACardId || !zoneBCardId) return "Carte invalide.";
    if (zoneACardId === zoneBCardId) return "Chaque equipe doit avoir une carte differente.";

    const selectedIds = new Set(selectableCards.map((card) => card.id));
    if (!selectedIds.has(zoneACardId) || !selectedIds.has(zoneBCardId)) {
      return "Une carte selectionnee n'est plus disponible.";
    }

    return null;
  }, [
    cardsLoading,
    cardsMessage,
    selectableCards,
    zoneACard,
    zoneBCard,
    zoneACardId,
    zoneBCardId,
  ]);

  const loadCards = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setCardsLoading(true);
    }

    try {
      const payload = (await getLocalBridgeStatus()) as CardsResponse;

      const freshCards: ElectronicCard[] = payload.cards ?? [];
      const now = Date.now();
      const tracker = cardTracker.current;
      const freshIds = new Set(freshCards.map((c) => c.id));

      for (const id of tracker.keys()) {
        if (!freshIds.has(id)) tracker.delete(id);
      }

      for (const card of freshCards) {
        const entry = tracker.get(card.id);
        if (!entry) {
          tracker.set(card.id, { everConnected: card.connected, offlineSince: null });
        } else if (card.connected) {
          tracker.set(card.id, { everConnected: true, offlineSince: null });
        } else if (entry.everConnected) {
          tracker.set(card.id, { everConnected: true, offlineSince: entry.offlineSince ?? now });
        }
      }

      const visible = freshCards.filter((card) => {
        const entry = tracker.get(card.id);
        if (!entry?.everConnected) return false;
        if (entry.offlineSince !== null && now - entry.offlineSince > OFFLINE_HIDE_DELAY_MS) return false;
        return true;
      });

      setCards(freshCards);
      setDisplayableCards(visible);
      setCardsMessage(payload.ok ? null : payload.message ?? "Passerelle locale indisponible.");
    } catch (requestError) {
      setCards([]);
      setDisplayableCards([]);
      setCardsMessage(
        requestError instanceof Error ? requestError.message : "Cartes indisponibles.",
      );
    } finally {
      setCardsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCards(true);
    const interval = window.setInterval(() => void loadCards(false), cardRefreshDelay);
    return () => window.clearInterval(interval);
  }, [loadCards]);

  function handleMatchSelect(match: MatchOption | null) {
    setSelectedMatch(match);

    if (!match) {
      setZoneATeam("");
      setZoneBTeam("");
      setEventName("");
      return;
    }

    setZoneATeam(match.homeTeam);
    setZoneBTeam(match.awayTeam);
    setEventName(`${match.homeTeam} vs ${match.awayTeam}`);
  }

  function swapZones() {
    setZoneATeam(zoneBTeam);
    setZoneBTeam(zoneATeam);
  }

  function swapCards() {
    setZoneACard(zoneBCard);
    setZoneBCard(zoneACard);
  }

  async function createEvent() {
    if (!selectedMatch) {
      setError("Selectionne d'abord un match.");
      return;
    }

    if (cardSelectionError) {
      setError(cardSelectionError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: eventName,
          match: selectedMatch,
          zoneATeam,
          zoneBTeam,
          zoneACard,
          zoneBCard,
          skipBridgeStart: true,
        }),
      });
      const payload = (await response.json()) as { event?: FanEvent; error?: string };

      if (!response.ok || !payload.event) {
        throw new Error(payload.error ?? "Creation impossible.");
      }

      if (!zoneACardId || !zoneBCardId) {
        throw new Error("Carte invalide.");
      }

      try {
        await startLocalBridgeEvent(payload.event.id, [zoneACardId, zoneBCardId]);
      } catch (bridgeError) {
        await archiveEvent(payload.event.id);
        throw bridgeError;
      }

      window.localStorage.setItem("fanbar:selected-event-id", String(payload.event.id));
      router.push(`/dashboard?eventId=${payload.event.id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Erreur inconnue.");
    } finally {
      setSaving(false);
    }
  }

  const canCreate = Boolean(selectedMatch) && !saving && !cardSelectionError;
  const displayedError = error ?? (cardsMessage ? null : (selectedMatch ? cardSelectionError : null));

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-white/10 bg-white/[0.05] p-5">
        <p className="text-xs font-black uppercase text-emerald-300">Creation d'evenement</p>
        <h1 className="mt-2 text-4xl font-black text-white">Configurer un match live</h1>
        <p className="mt-3 max-w-3xl text-slate-400">
          Choisis un vrai match, attribue chaque equipe a une zone, puis relie les
          cartes electroniques aux zones de supporters.
        </p>
      </section>

      <MatchSelector
        selectedMatchId={selectedMatchId}
        onSelect={setSelectedMatchId}
        onMatchSelect={handleMatchSelect}
        persistSelection={false}
      />

      <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <article className="rounded-lg border border-white/10 bg-slate-950/55 p-5">
          <div className="flex items-center gap-3 text-cyan-200">
            <Trophy size={20} />
            <p className="text-xs font-black uppercase">Zones supporters</p>
          </div>

          <label className="mt-5 block text-sm font-bold text-slate-300">
            Nom de l'evenement
            <input
              value={eventName}
              onChange={(event) => setEventName(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none focus:border-cyan-300/50"
              placeholder="France vs Senegal - Soiree FanBar"
            />
          </label>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_1fr]">
            <TeamSelect
              label="Zone A"
              value={zoneATeam}
              teams={teams}
              onChange={setZoneATeam}
            />
            <button
              type="button"
              onClick={swapZones}
              disabled={!selectedMatch}
              className="mt-7 grid min-h-12 place-items-center rounded-lg border border-white/15 bg-white/8 px-4 text-white disabled:cursor-not-allowed disabled:opacity-40"
              title="Inverser les zones"
            >
              <ArrowLeftRight size={18} />
            </button>
            <TeamSelect
              label="Zone B"
              value={zoneBTeam}
              teams={teams}
              onChange={setZoneBTeam}
            />
          </div>

          {selectedMatch ? (
            <p className="mt-4 rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-100">
              {selectedMatch.competition} - {formatDateTime(selectedMatch.kickoffAt)}
            </p>
          ) : null}
        </article>

        <article className="rounded-lg border border-white/10 bg-slate-950/55 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 text-amber-200">
              <CircuitBoard size={20} />
              <p className="text-xs font-black uppercase">Cartes electroniques</p>
            </div>
            <button
              type="button"
              onClick={() => void loadCards(true)}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/15 bg-white/8 px-3 text-sm font-black text-white"
            >
              <RefreshCw size={15} />
              Recharger
            </button>
          </div>

          <div className="mt-5 grid gap-3">
            <CardSelect
              label={`Carte pour ${zoneATeam || "Zone A"}`}
              value={zoneACard}
              cards={selectableCards}
              blockedCardId={zoneBCardId}
              loading={cardsLoading}
              onChange={setZoneACard}
            />
            <CardSelect
              label={`Carte pour ${zoneBTeam || "Zone B"}`}
              value={zoneBCard}
              cards={selectableCards}
              blockedCardId={zoneACardId}
              loading={cardsLoading}
              onChange={setZoneBCard}
            />
            <button
              type="button"
              onClick={swapCards}
              disabled={!zoneACard || !zoneBCard}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/8 px-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ArrowLeftRight size={17} />
              Inverser les cartes
            </button>
          </div>

          <CardHealthList cards={displayableCards} loading={cardsLoading} message={cardsMessage} />

          {displayedError ? (
            <p className="mt-4 rounded-lg border border-rose-400/30 bg-rose-500/15 p-3 text-sm text-rose-100">
              {displayedError}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void createEvent()}
            disabled={!canCreate}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-400 px-5 font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <CalendarPlus size={18} />
            {saving ? "Creation..." : "Creer l'evenement"}
          </button>
        </article>
      </section>
    </div>
  );
}

async function archiveEvent(eventId: number) {
  try {
    await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "archived",
        skipBridgeStop: true,
      }),
    });
  } catch {
    return;
  }
}

function TeamSelect({
  label,
  value,
  teams,
  onChange,
}: {
  label: string;
  value: string;
  teams: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm font-bold text-slate-300">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={teams.length === 0}
        className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none focus:border-cyan-300/50 disabled:opacity-45"
      >
        {teams.length === 0 ? <option value="">Choisir un match</option> : null}
        {teams.map((team) => (
          <option key={`${label}-${team}`} value={team}>
            {team}
          </option>
        ))}
      </select>
    </label>
  );
}

function CardSelect({
  label,
  value,
  cards,
  blockedCardId,
  loading,
  onChange,
}: {
  label: string;
  value: string;
  cards: ElectronicCard[];
  blockedCardId: number | null;
  loading: boolean;
  onChange: (value: string) => void;
}) {
  const selectedCardId = getCardId(value);
  const options = cards.filter((card) => {
    // Allow already selected card to show
    if (card.id === selectedCardId) return true;
    // Exclude blocked card (already selected elsewhere)
    if (card.id === blockedCardId) return false;
    // Only show healthy and available cards
    return card.healthy && card.available;
  });

  return (
    <label className="text-sm font-bold text-slate-300">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={loading || options.length === 0}
        className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none focus:border-amber-300/50 disabled:opacity-45"
      >
        <option value="">{loading ? "Chargement..." : "Selectionner une carte"}</option>
        {options.map((card) => (
          <option key={`${label}-${card.id}`} value={toCardValue(card)}>
            {card.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CardHealthList({
  cards,
  loading,
  message,
}: {
  cards: ElectronicCard[];
  loading: boolean;
  message: string | null;
}) {
  if (loading) {
    return <p className="mt-4 text-sm text-slate-400">Chargement des cartes...</p>;
  }

  if (message) {
    return (
      <p className="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/10 p-3 text-sm text-amber-100">
        {message}
      </p>
    );
  }

  if (cards.length === 0) {
    return (
      <p className="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/10 p-3 text-sm text-amber-100">
        Aucune carte detectee par la passerelle locale.
      </p>
    );
  }

  return (
    <div className="mt-4 grid gap-2">
      {cards.map((card) => (
        <div
          key={card.id}
          className="grid gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-3 sm:grid-cols-[1fr_auto]"
        >
          <div>
            <p className="font-black text-white">{card.label}</p>
            {card.lastDb !== null ? (
              <p className="mt-1 text-xs text-slate-400">{card.lastDb} dB</p>
            ) : null}
          </div>
          <span
            className={`inline-flex min-h-8 items-center justify-center gap-2 rounded-lg px-3 text-xs font-black uppercase ${
              card.healthy && card.available
                ? "bg-emerald-400/15 text-emerald-200"
                : card.active
                  ? "bg-cyan-400/15 text-cyan-200"
                  : "bg-rose-400/15 text-rose-200"
            }`}
          >
            {card.healthy && card.available ? (
              <CheckCircle2 size={14} />
            ) : (
              <AlertTriangle size={14} />
            )}
            {getCardStatus(card)}
          </span>
        </div>
      ))}
    </div>
  );
}

function getCardId(cardValue: string) {
  // Extract card ID from "G1A-1" or "G1A-2" format by splitting on the last dash
  if (!cardValue) return null;
  
  const parts = cardValue.split('-');
  if (parts.length < 2) return null;
  
  const id = parseInt(parts[parts.length - 1], 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function toCardValue(card: ElectronicCard) {
  return card.label;
}

function isCardSelectable(
  value: string,
  cards: ElectronicCard[],
  blockedCardId: number | null,
) {
  const cardId = getCardId(value);

  if (!cardId || cardId === blockedCardId) {
    return false;
  }

  return cards.some((card) => card.id === cardId);
}

function getCardStatus(card: ElectronicCard) {
  if (card.healthy && card.available) return "disponible";
  if (card.active) return "active";
  if (card.connected) return "non healthy";
  return "hors ligne";
}
