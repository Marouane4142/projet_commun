-- ============================================================================
-- FanBar Arena - Seed des diffusions beIN SPORTS France (Coupe du Monde 2026)
--
-- Supprime les anciennes diffusions et insere les resumes beIN SPORTS.
-- A executer une seule fois dans Supabase SQL Editor.
-- ============================================================================

-- Vide la table (supprime les anciennes videos non beIN).
delete from public.g1a_broadcasts;

-- Insere les resumes beIN SPORTS France.
insert into public.g1a_broadcasts (title, youtube_id, match_label, kind, published_at)
values
  ('Résumé France - Sénégal (3-1) | Coupe du Monde 2026', 'rVfGFqQ3WjE', 'France vs Sénégal', 'resume', '2026-06-16T21:00:00Z'),
  ('Résumé Argentine - Canada (1-0) | Coupe du Monde 2026', '8pCqYi7FGBQ', 'Argentine vs Canada', 'resume', '2026-06-15T20:00:00Z'),
  ('Résumé Brésil - Mexique (2-1) | Coupe du Monde 2026', 'Q9wdT5Y4E-c', 'Brésil vs Mexique', 'resume', '2026-06-14T18:00:00Z'),
  ('Top buts Coupe du Monde 2026 - Journée 1', 'x_nDqWbL0gI', 'Best of J1', 'best', '2026-06-14T23:00:00Z'),
  ('Résumé Espagne - Portugal (2-2) | Coupe du Monde 2026', 'J9bFMSEvt1c', 'Espagne vs Portugal', 'resume', '2026-06-15T18:00:00Z'),
  ('Résumé Angleterre - Japon (3-0) | Coupe du Monde 2026', 'UmHwkXCCrFY', 'Angleterre vs Japon', 'resume', '2026-06-16T15:00:00Z')
on conflict (youtube_id) do update
  set title = excluded.title,
      match_label = excluded.match_label,
      kind = excluded.kind,
      published_at = excluded.published_at;
