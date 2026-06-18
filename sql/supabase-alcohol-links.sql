-- ============================================================================
-- FanBar Arena - Liaison alcoolemie <-> comptes utilisateurs
--
-- Tables pour permettre aux gerants d'associer un sujet d'alcoolemie (capteur
-- G1D) a un compte utilisateur, afin que le supporter puisse consulter ses
-- propres stats d'alcoolemie dans son espace "Mon compte".
--
-- A executer une seule fois dans Supabase SQL Editor, APRES supabase-g1a-auth.sql.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Alias des sujets : renommage par un gerant ("Personne 3" -> "Karim")
-- ----------------------------------------------------------------------------
create table if not exists public.g1a_subject_aliases (
  subject_id  text primary key,
  alias       text not null,
  updated_at  timestamptz not null default now()
);

alter table public.g1a_subject_aliases enable row level security;

-- Lecture publique (affiche les noms dans le tableau d'alcoolemie).
drop policy if exists "g1a_subject_aliases read" on public.g1a_subject_aliases;
create policy "g1a_subject_aliases read"
on public.g1a_subject_aliases for select
to anon, authenticated
using (true);

-- Seuls les gerants peuvent creer / modifier un alias.
drop policy if exists "g1a_subject_aliases write gerant" on public.g1a_subject_aliases;
create policy "g1a_subject_aliases write gerant"
on public.g1a_subject_aliases for all
to authenticated
using (
  exists (
    select 1 from public.g1a_profiles p
    where p.id = auth.uid() and p.role = 'gerant'
  )
)
with check (
  exists (
    select 1 from public.g1a_profiles p
    where p.id = auth.uid() and p.role = 'gerant'
  )
);

-- ----------------------------------------------------------------------------
-- 2) Liaison sujet <-> compte utilisateur
--    Un gerant associe un subject_id (capteur MQ-3) a un user_id (auth.users).
--    Le supporter voit ensuite SES stats dans "Mon compte".
-- ----------------------------------------------------------------------------
create table if not exists public.g1a_subject_links (
  subject_id  text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  linked_by   uuid references auth.users (id) on delete set null,
  linked_at   timestamptz not null default now()
);

create index if not exists g1a_subject_links_user_idx
on public.g1a_subject_links (user_id);

alter table public.g1a_subject_links enable row level security;

-- Lecture : tout le monde (necessaire pour afficher les noms dans le tableau).
drop policy if exists "g1a_subject_links read" on public.g1a_subject_links;
create policy "g1a_subject_links read"
on public.g1a_subject_links for select
to anon, authenticated
using (true);

-- Ecriture : gerant uniquement.
drop policy if exists "g1a_subject_links write gerant" on public.g1a_subject_links;
create policy "g1a_subject_links write gerant"
on public.g1a_subject_links for all
to authenticated
using (
  exists (
    select 1 from public.g1a_profiles p
    where p.id = auth.uid() and p.role = 'gerant'
  )
)
with check (
  exists (
    select 1 from public.g1a_profiles p
    where p.id = auth.uid() and p.role = 'gerant'
  )
);

-- Suppression : gerant uniquement.
drop policy if exists "g1a_subject_links delete gerant" on public.g1a_subject_links;
create policy "g1a_subject_links delete gerant"
on public.g1a_subject_links for delete
to authenticated
using (
  exists (
    select 1 from public.g1a_profiles p
    where p.id = auth.uid() and p.role = 'gerant'
  )
);
