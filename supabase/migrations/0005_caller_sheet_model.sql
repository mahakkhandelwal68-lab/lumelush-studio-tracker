-- Rework lead statuses so they map 1:1 onto the caller's sheets:
-- Raw | Callbacks | No answer | Not interested | Meeting booked
create type lead_status_new as enum (
  'new', 'callback', 'no_answer', 'not_interested', 'booked'
);

alter table leads alter column status drop default;

alter table leads
  alter column status type lead_status_new
  using (
    case status::text
      when 'new'            then 'new'
      when 'contacted'      then 'no_answer'
      when 'interested'     then 'callback'
      when 'callback_later' then 'callback'
      when 'not_interested' then 'not_interested'
      when 'booked'         then 'booked'
      when 'closed'         then 'not_interested'
    end::lead_status_new
  );

alter table leads alter column status set default 'new';

drop type lead_status;
alter type lead_status_new rename to lead_status;

-- When the lead promised a callback, and why a lead went cold.
alter table leads add column follow_up_at timestamptz;
alter table leads add column not_interested_reason text;

-- Callbacks sheet is sorted by what's due first.
create index leads_follow_up_idx on leads(follow_up_at) where follow_up_at is not null;

-- ------------------------------------------------------------
-- "Request more leads" card
-- ------------------------------------------------------------
create type lead_request_status as enum ('pending', 'fulfilled', 'declined');

create table lead_requests (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references profiles(id),
  requested_count int not null check (requested_count > 0 and requested_count <= 500),
  note text,
  status lead_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references profiles(id)
);

create index lead_requests_caller_idx on lead_requests(caller_id);
create index lead_requests_status_idx on lead_requests(status);

alter table lead_requests enable row level security;

create policy "lead_requests_admin_all" on lead_requests for all
  using (private.current_role_is('admin'))
  with check (private.current_role_is('admin'));

create policy "lead_requests_caller_read_own" on lead_requests for select
  using (caller_id = auth.uid());

create policy "lead_requests_caller_insert" on lead_requests for insert
  with check (caller_id = auth.uid());
