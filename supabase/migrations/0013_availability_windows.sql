-- Consultants now declare open *ranges* (e.g. 08:00-20:00) rather than fixed
-- one-hour slots, so a lead can be booked at any 15-minute start time inside
-- a range. A booking occupies its duration and blocks overlapping starts.
create table availability_windows (
  id uuid primary key default gen_random_uuid(),
  consultant_id uuid not null references profiles(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  created_at timestamptz not null default now(),
  constraint window_valid check (end_time > start_time)
);

create index aw_consultant_idx on availability_windows(consultant_id, start_time);

alter table availability_windows enable row level security;

create policy "aw_admin_all" on availability_windows for all
  using (private.current_role_is('admin'))
  with check (private.current_role_is('admin'));

create policy "aw_consultant_own" on availability_windows for all
  using (consultant_id = auth.uid())
  with check (consultant_id = auth.uid());

create policy "aw_caller_read" on availability_windows for select
  using (private.current_role_is('caller'));

alter table availability_change_requests drop column slot_id;
alter table meetings drop column slot_id;
drop table availability_slots;

-- Callers need to know which times are taken, but must NOT see other
-- callers' handover notes or the consultants' meeting analyses. Expose the
-- busy intervals alone rather than granting SELECT on meetings.
create or replace function busy_times(
  p_consultant_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (busy_start timestamptz, busy_end timestamptz)
language sql
security definer
stable
set search_path = public
as $$
  select scheduled_start, scheduled_end
  from meetings
  where consultant_id = p_consultant_id
    and scheduled_end > p_from
    and scheduled_start < p_to;
$$;

revoke all on function busy_times(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function busy_times(uuid, timestamptz, timestamptz) to authenticated;
