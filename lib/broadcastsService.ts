import { createClient } from "@/utils/supabase/server";
import type { Broadcast } from "./types";

// Resumes et best-of Coupe du Monde 2026 (chaine beIN SPORTS France).
// Le gerant peut tout remplacer via "Ajouter une diffusion". Sert de fallback
// si la table g1a_broadcasts n'est pas encore creee/seedee.
const CURATED: Broadcast[] = [
  { id: -1, title: "Résumé France - Sénégal (3-1) | Coupe du Monde 2026", youtubeId: "rVfGFqQ3WjE", matchLabel: "France vs Sénégal", kind: "resume", publishedAt: "2026-06-16T21:00:00Z" },
  { id: -2, title: "Résumé Argentine - Canada (1-0) | Coupe du Monde 2026", youtubeId: "8pCqYi7FGBQ", matchLabel: "Argentine vs Canada", kind: "resume", publishedAt: "2026-06-15T20:00:00Z" },
  { id: -3, title: "Résumé Brésil - Mexique (2-1) | Coupe du Monde 2026", youtubeId: "Q9wdT5Y4E-c", matchLabel: "Brésil vs Mexique", kind: "resume", publishedAt: "2026-06-14T18:00:00Z" },
  { id: -4, title: "Top buts Coupe du Monde 2026 - Journée 1", youtubeId: "x_nDqWbL0gI", matchLabel: "Best of J1", kind: "best", publishedAt: "2026-06-14T23:00:00Z" },
  { id: -5, title: "Résumé Espagne - Portugal (2-2) | Coupe du Monde 2026", youtubeId: "J9bFMSEvt1c", matchLabel: "Espagne vs Portugal", kind: "resume", publishedAt: "2026-06-15T18:00:00Z" },
  { id: -6, title: "Résumé Angleterre - Japon (3-0) | Coupe du Monde 2026", youtubeId: "UmHwkXCCrFY", matchLabel: "Angleterre vs Japon", kind: "resume", publishedAt: "2026-06-16T15:00:00Z" },
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
