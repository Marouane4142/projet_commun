-- ============================================================================
-- FanBar Arena - Seed des diffusions officielles FIFA (Coupe du Monde 2026)
--
-- Supprime les anciennes diffusions du seed et insère des highlights de matchs
-- vérifiés via l'oEmbed YouTube (auteur : FIFA).
-- À exécuter dans Supabase SQL Editor.
-- ============================================================================

-- Supprime uniquement les anciens IDs connus comme indisponibles ou non officiels.
delete from public.g1a_broadcasts
where youtube_id in (
  'SlmYDbzHqjg', 'Wbal5ZuGeI8', 'MM5hUuEzH3g', 'gQOgcN7_IZE', '7DLR9gCjXHk', '7cFSYqlo-2w',
  'obVK3tuUXgs', 'eVPNdLv1ugQ', 'q3ppzcwriGE', 'F38RMQltGP0', '3Q8JGYb50MY', 'kjcC5ia95_Y',
  'rVfGFqQ3WjE', '8pCqYi7FGBQ', 'Q9wdT5Y4E-c', 'x_nDqWbL0gI', 'J9bFMSEvt1c', 'UmHwkXCCrFY',
  'gdaCaPqp0D4', 't2HIDkYd3cw', 'cupn9ARPukA', '8I2s_hs4TUU', 'CZ2CdOyXSho'
);

-- Insère les vidéos officielles FIFA.
insert into public.g1a_broadcasts (title, youtube_id, match_label, kind, published_at)
values
  ('Highlights | France 3-1 Senegal | FIFA World Cup 2026', 'n3JDGlOwMJ4', 'France vs Senegal', 'resume', '2026-06-16T21:00:00Z'),
  ('Highlights | Belgium 1-1 Egypt | FIFA World Cup 2026', 'i8sD2Aea9_M', 'Belgium vs Egypt', 'resume', '2026-06-15T21:00:00Z'),
  ('Highlights | Austria 3-1 Jordan | FIFA World Cup 2026', 'pU-mPZcuENY', 'Austria vs Jordan', 'resume', '2026-06-17T21:00:00Z'),
  ('Highlights | Qatar 1-1 Switzerland | FIFA World Cup 2026', 'KVz43-eddIQ', 'Qatar vs Switzerland', 'resume', '2026-06-13T21:00:00Z'),
  ('Highlights | Spain 0-0 Cabo Verde | FIFA World Cup 2026', 'W9Z4ER9oX0k', 'Spain vs Cabo Verde', 'resume', '2026-06-13T20:00:00Z'),
  ('Highlights | Saudi Arabia 1-1 Uruguay | FIFA World Cup 2026', 'XrDExPcLCXY', 'Saudi Arabia vs Uruguay', 'resume', '2026-06-14T21:00:00Z')
on conflict (youtube_id) do update
  set title = excluded.title,
      match_label = excluded.match_label,
      kind = excluded.kind,
      published_at = excluded.published_at;
