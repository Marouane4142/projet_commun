import { createClient } from "@/utils/supabase/server";
import type { Broadcast } from "./types";

// Highlights officiels FIFA de matchs Coupe du Monde 2026.
// Le gérant peut tout remplacer via "Ajouter une diffusion". Sert de fallback
// si la table g1a_broadcasts n'est pas encore créée/seedée.
const CURATED: Broadcast[] = [
  { id: -1, title: "Highlights | France 3-1 Senegal | FIFA World Cup 2026", youtubeId: "n3JDGlOwMJ4", matchLabel: "France vs Senegal", kind: "resume", publishedAt: "2026-06-16T21:00:00Z" },
  { id: -2, title: "Highlights | Belgium 1-1 Egypt | FIFA World Cup 2026", youtubeId: "i8sD2Aea9_M", matchLabel: "Belgium vs Egypt", kind: "resume", publishedAt: "2026-06-15T21:00:00Z" },
  { id: -3, title: "Highlights | Austria 3-1 Jordan | FIFA World Cup 2026", youtubeId: "pU-mPZcuENY", matchLabel: "Austria vs Jordan", kind: "resume", publishedAt: "2026-06-17T21:00:00Z" },
  { id: -4, title: "Highlights | Qatar 1-1 Switzerland | FIFA World Cup 2026", youtubeId: "KVz43-eddIQ", matchLabel: "Qatar vs Switzerland", kind: "resume", publishedAt: "2026-06-13T21:00:00Z" },
  { id: -5, title: "Highlights | Spain 0-0 Cabo Verde | FIFA World Cup 2026", youtubeId: "W9Z4ER9oX0k", matchLabel: "Spain vs Cabo Verde", kind: "resume", publishedAt: "2026-06-13T20:00:00Z" },
  { id: -6, title: "Highlights | Saudi Arabia 1-1 Uruguay | FIFA World Cup 2026", youtubeId: "XrDExPcLCXY", matchLabel: "Saudi Arabia vs Uruguay", kind: "resume", publishedAt: "2026-06-14T21:00:00Z" },
];

type BroadcastRow = {
  id: number;
  title: string;
  youtube_id: string;
  match_label: string | null;
  kind: "resume" | "live" | "best";
  published_at: string | null;
};

export async function getBroadcasts(): Promise<{ items: Broadcast[]; fallback: boolean }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("g1a_broadcasts")
      .select("id, title, youtube_id, match_label, kind, published_at")
      .order("published_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return { items: CURATED, fallback: true };
    }

    const items = (data as BroadcastRow[]).map((r) => ({
      id: r.id,
      title: r.title,
      youtubeId: r.youtube_id,
      matchLabel: r.match_label,
      kind: r.kind,
      publishedAt: r.published_at,
    }));
    return { items, fallback: false };
  } catch {
    return { items: CURATED, fallback: true };
  }
}
