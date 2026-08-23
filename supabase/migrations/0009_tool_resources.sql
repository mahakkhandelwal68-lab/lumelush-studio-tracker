-- Admin-editable playbook cards (proposal / invoice / meeting analysis).
-- Instructions and agent links are content, not code, so admins can change
-- them without a deploy. Seed rows carry sample copy.
create table tool_resources (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  summary text,
  instructions text,
  agent_url text,
  agent_label text,
  sort_order int not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

alter table tool_resources enable row level security;

create policy "tool_resources_admin_write" on tool_resources for all
  using (private.current_role_is('admin'))
  with check (private.current_role_is('admin'));

-- Any signed-in team member can read them.
create policy "tool_resources_read" on tool_resources for select
  using (auth.uid() is not null);

-- Seed rows live in 0009_tool_resources_seed.sql for readability.
