-- One row per device that has opted in to phone push notifications (currently
-- only the admin's phone). The server reads these with the service role when a
-- meeting is booked; users can only see and manage their own rows.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy push_subscriptions_self_read on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());
create policy push_subscriptions_self_insert on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());
create policy push_subscriptions_self_update on public.push_subscriptions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy push_subscriptions_self_delete on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());
