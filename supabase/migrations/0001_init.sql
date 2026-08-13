-- ============================================================
-- CRM schema: profiles (roles), leads, calls, availability, meetings
-- ============================================================

create type user_role as enum ('admin', 'caller', 'consultant');
create type lead_status as enum ('new', 'contacted', 'interested', 'not_interested', 'callback_later', 'booked', 'closed');
create type call_outcome as enum ('interested', 'not_interested', 'callback_later', 'no_answer');
create type meeting_result as enum ('pending', 'won', 'lost', 'follow_up_needed', 'rescheduled');

-- ------------------------------------------------------------
-- profiles: one row per auth.users row, holds role + status
-- ------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role user_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- leads
-- ------------------------------------------------------------
create table leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  source text,
  status lead_status not null default 'new',
  assigned_caller_id uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_assigned_caller_idx on leads(assigned_caller_id);
create index leads_status_idx on leads(status);

-- ------------------------------------------------------------
-- calls: log of every call attempt against a lead
-- ------------------------------------------------------------
create table calls (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  caller_id uuid not null references profiles(id),
  outcome call_outcome not null,
  notes text,
  called_at timestamptz not null default now()
);

create index calls_lead_idx on calls(lead_id);
create index calls_caller_idx on calls(caller_id);

-- ------------------------------------------------------------
-- availability_slots: consultant-defined open slots
-- ------------------------------------------------------------
create table availability_slots (
  id uuid primary key default gen_random_uuid(),
  consultant_id uuid not null references profiles(id),
  start_time timestamptz not null,
  end_time timestamptz not null,
  is_booked boolean not null default false,
  created_at timestamptz not null default now(),
  constraint slot_time_valid check (end_time > start_time)
);

create index availability_consultant_idx on availability_slots(consultant_id);
create index availability_open_idx on availability_slots(is_booked, start_time);

-- ------------------------------------------------------------
-- meetings: booked from a lead + slot, carries caller context
-- ------------------------------------------------------------
create table meetings (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  caller_id uuid not null references profiles(id),
  consultant_id uuid not null references profiles(id),
  slot_id uuid not null references availability_slots(id),
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  context_notes text,
  result meeting_result not null default 'pending',
  result_notes text,
  created_at timestamptz not null default now()
);

create index meetings_caller_idx on meetings(caller_id);
create index meetings_consultant_idx on meetings(consultant_id);
create index meetings_lead_idx on meetings(lead_id);

-- ============================================================
-- Row Level Security
-- ============================================================

create or replace function current_role_is(target_role user_role)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = target_role and active
  );
$$;

alter table profiles enable row level security;
alter table leads enable row level security;
alter table calls enable row level security;
alter table availability_slots enable row level security;
alter table meetings enable row level security;

-- profiles
create policy "profiles_self_read" on profiles for select
  using (id = auth.uid() or current_role_is('admin'));
create policy "profiles_admin_write" on profiles for all
  using (current_role_is('admin')) with check (current_role_is('admin'));

-- leads
create policy "leads_admin_all" on leads for all
  using (current_role_is('admin')) with check (current_role_is('admin'));
create policy "leads_caller_read_own" on leads for select
  using (assigned_caller_id = auth.uid());
create policy "leads_caller_update_own" on leads for update
  using (assigned_caller_id = auth.uid())
  with check (assigned_caller_id = auth.uid());

-- calls
create policy "calls_admin_all" on calls for all
  using (current_role_is('admin')) with check (current_role_is('admin'));
create policy "calls_caller_own" on calls for select
  using (caller_id = auth.uid());
create policy "calls_caller_insert" on calls for insert
  with check (caller_id = auth.uid());

-- availability_slots
create policy "availability_admin_all" on availability_slots for all
  using (current_role_is('admin')) with check (current_role_is('admin'));
create policy "availability_consultant_own" on availability_slots for all
  using (consultant_id = auth.uid()) with check (consultant_id = auth.uid());
create policy "availability_caller_read_open" on availability_slots for select
  using (current_role_is('caller'));

-- meetings
create policy "meetings_admin_all" on meetings for all
  using (current_role_is('admin')) with check (current_role_is('admin'));
create policy "meetings_caller_own" on meetings for select
  using (caller_id = auth.uid());
create policy "meetings_caller_insert" on meetings for insert
  with check (caller_id = auth.uid());
create policy "meetings_consultant_own" on meetings for select
  using (consultant_id = auth.uid());
create policy "meetings_consultant_update" on meetings for update
  using (consultant_id = auth.uid())
  with check (consultant_id = auth.uid());
