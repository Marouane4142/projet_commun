import { createClient } from "@/utils/supabase/server";
import type { Broadcast } from "./types";

// Resumes Coupe du Monde 2026 (chaines francaises). Point de depart : le gerant
// peut tout remplacer via "Ajouter une diffusion". Sert aussi de fallback si la
// table g1a_broadcasts n'est pas encore creee/seedee.
const CURATED: Broadcast[] = [
  { id: -1, title: "France 3-1 Senegal - Resume et buts", youtubeId: "gdaCaPqp0D4", matchLabel: "France vs Senegal", kind: "resume", publishedAt: "2026-06-16T21:00:00Z" },
  { id: -2, title: "France - Senegal - Resume et buts", youtubeId: "t2HIDkYd3cw", matchLabel: "France vs Senegal", kind: "resume", publishedAt: "2026-06-16T20:30:00Z" },
  { id: -3, title: "Pays-Bas - Japon - Resume", youtubeId: "cupn9ARPukA", matchLabel: "Pays-Bas vs Japon", kind: "resume", publishedAt: "2026-06-15T18:00:00Z" },
  { id: -4, title: "Tous les buts des Bleus (eliminatoires)", youtubeId: "LhPR2Gi-9xQ", matchLabel: "Equipe de France", kind: "best", publishedAt: "2026-06-10T12:00:00Z" },
  { id: -5, title: "France vs Senegal 3-1 - Resume", youtubeId: "8I2s_hs4TUU", matchLabel: "France vs Senegal", kind: "resume", publishedAt: "2026-06-16T20:00:00Z" },
  { id: -6, title: "France 3-1 Senegal - En direct du resume", youtubeId: "CZ2CdOyXSho", matchLabel: "France vs Senegal", kind: "resume", publishedAt: "2026-06-16T19:30:00Z" },
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
