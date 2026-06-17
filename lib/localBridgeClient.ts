import type { ElectronicCard } from "./types";

const defaultBridgeUrl = "http://127.0.0.1:8765";
const bridgeTimeoutMs = 1_500;

type LocalBridgeResponse = {
  ok?: boolean;
  activeEventId?: number | null;
  cards?: ElectronicCard[];
  generatedAt?: string;
  error?: string;
};

export type LocalBridgeStatus = {
  ok: boolean;
  activeEventId: number | null;
  cards: ElectronicCard[];
  generatedAt: string | null;
  message: string | null;
};

export async function getLocalBridgeStatus(): Promise<LocalBridgeStatus> {
  try {
    const payload = await requestLocalBridge<LocalBridgeResponse>("/cards");

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
      message:
        error instanceof Error
          ? error.message
          : "Passerelle locale indisponible. Lance le script Python.",
    };
  }
}

export async function startLocalBridgeEvent(eventId: number, cardIds: number[]) {
  return requestLocalBridge<LocalBridgeResponse>("/events/start", {
    method: "POST",
    body: JSON.stringify({
      eventId,
      cards: cardIds,
    }),
  });
}

export async function stopLocalBridgeEvent(eventId: number) {
  return requestLocalBridge<LocalBridgeResponse>("/events/stop", {
    method: "POST",
    body: JSON.stringify({ eventId }),
  });
}

async function requestLocalBridge<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), bridgeTimeoutMs);

  try {
    const response = await fetch(`${getLocalBridgeUrl()}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
      signal: controller.signal,
    });

    const payload = (await response.json()) as LocalBridgeResponse;

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
    window.clearTimeout(timeout);
  }
}

function getLocalBridgeUrl() {
  return (process.env.NEXT_PUBLIC_FANBAR_BRIDGE_URL ?? defaultBridgeUrl).replace(/\/$/, "");
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
