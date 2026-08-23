-- Tracks caller/consultant activity: the client sends one ping per minute
-- while the tab is visible and the user has interacted within the last 5
-- minutes (see src/components/ActivityTracker.tsx). Active time for a day
-- is approximated as ping_count, since each ping represents ~1 minute of
-- active heartbeat interval.
create table activity_pings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  pinged_at timestamptz not null default now()
);

create index activity_pings_user_time_idx on activity_pings(user_id, pinged_at);

alter table activity_pings enable row level security;

create policy "activity_pings_self_insert" on activity_pings for insert
  with check (user_id = auth.uid());
create policy "activity_pings_self_read" on activity_pings for select
  using (user_id = auth.uid());
create policy "activity_pings_admin_read" on activity_pings for select
  using (private.current_role_is('admin'::user_role));
