import { listEvents } from "./eventService";
import type {
  EventHistoryItem,
  HistoryRankingEntry,
  HistoryRankings,
} from "./types";

/**
 * Historique des evenements termines. Toutes les statistiques (son par zone,
 * moyennes, pic d'affluence) sont CAPTUREES a la cloture et stockees dans
 * g1a_events -> l'historique reste exact meme pour les vieux evenements et
 * coherent avec les classements.
 */
export async function getFinishedEventHistory() {
  const { events, message } = await listEvents({ status: "finished" });

  const items: EventHistoryItem[] = events.map((event) => ({
    event,
    score: { home: event.finalHomeScore, away: event.finalAwayScore },
  }));

  return {
    items,
    rankings: buildRankings(items),
    message,
  };
}

function buildRankings(items: EventHistoryItem[]): HistoryRankings {
  const best = (
    pick: (i: EventHistoryItem) => number | null,
  ): HistoryRankingEntry | null => {
    let winner: HistoryRankingEntry | null = null;
    for (const item of items) {
      const value = pick(item);
      if (value == null) continue;
      if (!winner || value > winner.value) {
        winner = { eventId: item.event.id, name: item.event.name, value };
      }
    }
    return winner;
  };

  return {
    loudest: best((i) => i.event.stats.avgSound),
    hottest: best((i) => i.event.stats.avgTemperature),
    drunkest: best((i) => i.event.stats.avgAlcohol),
    busiest: best((i) => i.event.stats.peakAffluence),
  };
}
