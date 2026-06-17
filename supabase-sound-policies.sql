-- Run this in Supabase SQL Editor.
-- It allows the site to read sound metrics with the publishable/anon key.
-- It also allows the sensor API to insert new decibel measurements.
-- `electronic_card` identifies which hardware card emitted the measurement.

alter table public.g1a_sound
add column if not exists electronic_card bigint;

alter table public.g1a_sound enable row level security;

drop policy if exists "Allow public read sound metrics" on public.g1a_sound;
create policy "Allow public read sound metrics"
on public.g1a_sound
for select
to anon
using (true);

drop policy if exists "Allow public insert sound metrics" on public.g1a_sound;
create policy "Allow public insert sound metrics"
on public.g1a_sound
for insert
to anon
with check (true);
