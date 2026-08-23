-- Slots inside the 24h window can't be edited directly; the consultant
-- files one of these instead and an admin resolves it.
create type change_request_status as enum ('pending', 'approved', 'declined');

create table availability_change_requests (
  id uuid primary key default gen_random_uuid(),
  consultant_id uuid not null references profiles(id),
  slot_id uuid references availability_slots(id) on delete set null,
  slot_start timestamptz not null,
  reason text not null,
  status change_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references profiles(id)
);

create index acr_consultant_idx on availability_change_requests(consultant_id);
create index acr_status_idx on availability_change_requests(status);

alter table availability_change_requests enable row level security;

create policy "acr_admin_all" on availability_change_requests for all
  using (private.current_role_is('admin'))
  with check (private.current_role_is('admin'));

create policy "acr_consultant_read_own" on availability_change_requests for select
  using (consultant_id = auth.uid());

create policy "acr_consultant_insert" on availability_change_requests for insert
  with check (consultant_id = auth.uid());
