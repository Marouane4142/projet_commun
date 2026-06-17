import type { ElectronicCard } from "./types";

const defaultBridgeUrl = "http://127.0.0.1:8765";
const bridgeTimeoutMs = 1_500;

export type BridgeStatus = {
  ok: boolean;
  activeEventId: number | null;
  cards: ElectronicCard[];
  generatedAt: string | null;
  message: string | null;
};

type BridgeResponse = {
  ok?: boolean;
  activeEventId?: number | null;
  cards?: ElectronicCard[];
  generatedAt?: string;
  error?: string;
};

export async function getBridgeStatus(): Promise<BridgeStatus> {
  try {
    const payload = await requestBridge<BridgeResponse>("/cards");

    return {
      ok: payload.ok ?? true,
      activeEventId: payload.activeEventId ?? null,
      cards: normalizeCards(payload.cards),
      generatedAt: payload.generatedAt ?? null,
      message: payload.error ?? null,
    };
  } catch (error) {
    return {
      ok: false,
      activeEventId: null,
      cards: [],
      generatedAt: null,
      message: error instanceof Error ? error.message : "Passerelle locale indisponible.",
    };
  }
}

export async function assertCardsAvailable(cardIds: number[]) {
  const uniqueCardIds = [...new Set(cardIds)];

  if (uniqueCardIds.length !== cardIds.length) {
    throw new Error("Chaque equipe doit avoir une carte differente.");
  }

  const status = await getBridgeStatus();

  if (!status.ok) {
    throw new Error(status.message ?? "Passerelle locale indisponible.");
  }

  const cardsById = new Map(status.cards.map((card) => [card.id, card]));
  const unavailable = uniqueCardIds.filter((cardId) => {
    const card = cardsById.get(cardId);
    return !card || !card.healthy || !card.available;
  });

  if (unavailable.length > 0) {
    throw new Error(`Carte(s) indisponible(s): ${unavailable.join(", ")}.`);
  }

  return status;
}

export async function startBridgeEvent(eventId: number, cardIds: number[]) {
  const payload = await requestBridge<BridgeResponse>("/events/start", {
    method: "POST",
    body: JSON.stringify({
      eventId,
      cards: cardIds,
    }),
  });

  return {
    ...payload,
    cards: normalizeCards(payload.cards),
  };
}

export async function stopBridgeEvent(eventId: number) {
  const payload = await requestBridge<BridgeResponse>("/events/stop", {
    method: "POST",
    body: JSON.stringify({ eventId }),
  });

  return {
    ...payload,
    cards: normalizeCards(payload.cards),
  };
}

export function parseElectronicCardId(card: string) {
  // Match the LAST digit sequence — "G1A-2" must return 2, not 1 (the digit in "G1A")
  const match = card.match(/(\d+)\D*$/);
  if (!match) return null;

  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : null;
}

async function requestBridge<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), bridgeTimeoutMs);
  const url = `${getBridgeUrl()}${path}`;

  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
      signal: controller.signal,
    });
    const payload = (await response.json()) as BridgeResponse;

    if (!response.ok) {
      throw new Error(payload.error ?? `Passerelle locale: HTTP ${response.status}.`);
    }

    return payload as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Passerelle locale indisponible ou trop lente.");
    }

    if (error instanceof TypeError) {
      throw new Error("Passerelle locale indisponible. Lance le script Python.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function getBridgeUrl() {
  return (process.env.FANBAR_BRIDGE_URL ?? defaultBridgeUrl).replace(/\/$/, "");
}

function normalizeCards(cards?: ElectronicCard[]) {
  return (cards ?? [])
    .map((card) => ({
      ...card,
      id: Number(card.id),
      label: card.label ?? `G1A-${card.id}`,
      connected: Boolean(card.connected),
      healthy: Boolean(card.healthy),
      available: Boolean(card.available),
      active: Boolean(card.active),
    }))
    .sort((first, second) => first.id - second.id);
}
