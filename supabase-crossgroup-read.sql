-- ============================================================================
-- Acces LECTURE aux capteurs des groupes G1D et G1E (BDD partagee).
--
-- A executer dans Supabase SQL Editor. Ces tables ont des donnees mais leur RLS
-- ne les exposait pas au role public : on ajoute UNIQUEMENT une policy de
-- LECTURE pour anon/authenticated (comme l'ont fait G1B et G1C). Aucune ecriture
-- n'est accordee, les policies existantes des autres groupes sont conservees
-- (les policies RLS s'additionnent / sont combinees en OR).
-- ============================================================================

-- ---- G1D : ethylotest / alcoolemie (g1d_mq3_measurements) ------------------
alter table public.g1d_mq3_measurements enable row level security;
grant select on public.g1d_mq3_measurements to anon, authenticated;

drop policy if exists "public read g1d_mq3_measurements" on public.g1d_mq3_measurements;
create policy "public read g1d_mq3_measurements"
on public.g1d_mq3_measurements for select
to anon, authenticated
using (true);

-- ---- G1E : temperature + humidite ------------------------------------------
-- ATTENTION : la table G1E est nommee avec des MAJUSCULES ("G1E_measurements"),
-- c'est un identifiant cite, sensible a la casse. Il FAUT donc les guillemets.
alter table public."G1E_measurements" enable row level security;
grant select on public."G1E_measurements" to anon, authenticated;

drop policy if exists "public read G1E_measurements" on public."G1E_measurements";
create policy "public read G1E_measurements"
on public."G1E_measurements" for select
to anon, authenticated
using (true);
