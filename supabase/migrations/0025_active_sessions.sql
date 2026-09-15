-- Tracks how long each user is actively logged in — one row per login
-- session (started_at -> ended_at), not a per-minute/per-5-minute ping.
-- Active time for a session is simply ended_at - started_at (or
-- now() - started_at while ended_at is still null, i.e. currently online).
-- This intentionally avoids the growth pattern of the old activity_pings
-- table (see 0021/0022 migrations) — one row per login instead of one row
-- per minute of use.
create table active_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index active_sessions_user_started_idx on active_sessions(user_id, started_at);
-- Fast lookup of "is this user currently online" (their open session, if any).
create index active_sessions_open_idx on active_sessions(user_id) where ended_at is null;

alter table active_sessions enable row level security;

create policy "active_sessions_self_read" on active_sessions for select
  using (user_id = auth.uid());
create policy "active_sessions_admin_read" on active_sessions for select
  using (private.current_role_is('admin'::user_role));

-- Client inserts a row on login and updates its own ended_at on
-- logout/idle-timeout — no admin/service-role needed for the common path.
create policy "active_sessions_self_insert" on active_sessions for insert
  with check (user_id = auth.uid());
create policy "active_sessions_self_update" on active_sessions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
