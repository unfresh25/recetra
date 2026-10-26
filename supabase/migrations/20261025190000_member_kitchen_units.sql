-- Per-person kitchen units ("Configura tus preferencias en la cocina").
-- Defaults match Colombia, so existing members need no backfill.

create type public.measurement_system as enum ('metric', 'imperial');
create type public.temperature_unit as enum ('celsius', 'fahrenheit');

alter table public.members
  add column measurement_system public.measurement_system not null default 'metric',
  add column temperature_unit public.temperature_unit not null default 'celsius';

-- Members edit their own row only ("members update themselves"); extend the column grant.
grant update (display_name, onboarded_at, full_name, avatar_path, measurement_system, temperature_unit)
  on public.members to authenticated;
