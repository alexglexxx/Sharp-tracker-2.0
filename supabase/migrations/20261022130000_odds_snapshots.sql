-- Pinnacle line snapshots, written by /api/sharp-snapshot and read by the engine
-- to detect line movement since the first observation (the "opener").
-- Server-only: accessed with the secret key; anon/authenticated get no access.

create table public.odds_snapshots (
  id bigint generated always as identity primary key,
  captured_at timestamptz not null default now(),
  schema_version smallint not null default 1,
  league text not null check (league in ('MLB', 'NFL')),
  event_id text not null,
  away text not null default '',
  home text not null default '',
  team text not null,
  bookmaker text not null,
  market text not null,
  price integer not null check (price <> 0 and abs(price) >= 100),
  point numeric,
  commence_time timestamptz
);

create index odds_snapshots_opener_idx
  on public.odds_snapshots (league, bookmaker, market, event_id, team, captured_at);

alter table public.odds_snapshots enable row level security;

-- First observed line per event/team/book/market.
create view public.odds_openers with (security_invoker = true) as
select distinct on (league, bookmaker, market, event_id, team)
  league, bookmaker, market, event_id, team, price, point, captured_at
from public.odds_snapshots
order by league, bookmaker, market, event_id, team, captured_at;

revoke all on public.odds_snapshots from anon, authenticated;
revoke all on public.odds_openers from anon, authenticated;
grant select, insert on public.odds_snapshots to service_role;
grant select on public.odds_openers to service_role;
