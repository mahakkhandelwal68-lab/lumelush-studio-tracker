-- ============================================================
-- In-app team chat: DMs between any two active users, plus one
-- always-on "Team Chat" channel everyone active can see.
-- ============================================================

create type chat_conversation_kind as enum ('dm', 'team');

create table chat_conversations (
  id uuid primary key default gen_random_uuid(),
  kind chat_conversation_kind not null,
  created_at timestamptz not null default now()
);

create table chat_participants (
  conversation_id uuid not null references chat_conversations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (conversation_id, user_id)
);

create index chat_participants_user_idx on chat_participants(user_id);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references chat_conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create index chat_messages_conversation_idx on chat_messages(conversation_id, created_at);

-- Fixed id so app code doesn't need to look up the team channel.
insert into chat_conversations (id, kind)
values ('00000000-0000-0000-0000-000000000001', 'team');

-- ------------------------------------------------------------
-- helpers
-- ------------------------------------------------------------
create or replace function private.is_active()
returns boolean
language sql
security definer
stable
as $$
  select exists (select 1 from profiles where id = auth.uid() and active);
$$;

revoke all on function private.is_active() from public, anon;
grant execute on function private.is_active() to authenticated;

create or replace function private.user_conversation_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select conversation_id from chat_participants where user_id = auth.uid();
$$;

revoke all on function private.user_conversation_ids() from public, anon;
grant execute on function private.user_conversation_ids() to authenticated;

-- ------------------------------------------------------------
-- profiles: chat needs to see everyone active, not just same-role
-- ------------------------------------------------------------
create policy "profiles_read_for_chat" on profiles for select to authenticated
  using (active and private.is_active());

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table chat_conversations enable row level security;
alter table chat_participants enable row level security;
alter table chat_messages enable row level security;

create policy "chat_conversations_read" on chat_conversations for select to authenticated
  using (private.is_active() and (kind = 'team' or id in (select private.user_conversation_ids())));

create policy "chat_participants_read" on chat_participants for select to authenticated
  using (private.is_active() and (user_id = auth.uid() or conversation_id in (select private.user_conversation_ids())));

create policy "chat_messages_read" on chat_messages for select to authenticated
  using (
    private.is_active()
    and exists (
      select 1 from chat_conversations c
      where c.id = chat_messages.conversation_id
        and (c.kind = 'team' or c.id in (select private.user_conversation_ids()))
    )
  );

create policy "chat_messages_insert" on chat_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and private.is_active()
    and exists (
      select 1 from chat_conversations c
      where c.id = chat_messages.conversation_id
        and (c.kind = 'team' or c.id in (select private.user_conversation_ids()))
    )
  );

-- Conversations/participants are only ever created through get_or_create_dm
-- (security definer, runs as table owner, bypasses RLS) — no client insert
-- policy needed for chat_conversations/chat_participants.

-- ------------------------------------------------------------
-- get_or_create_dm: find the existing 1:1 conversation between the
-- caller and another active user, or create one.
-- ------------------------------------------------------------
create or replace function public.get_or_create_dm(other_user_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  conv_id uuid;
begin
  if not private.is_active() then
    raise exception 'not an active user';
  end if;

  if other_user_id = auth.uid() then
    raise exception 'cannot start a DM with yourself';
  end if;

  if not exists (select 1 from profiles where id = other_user_id and active) then
    raise exception 'user not found';
  end if;

  select cp1.conversation_id into conv_id
  from chat_participants cp1
  join chat_participants cp2 on cp2.conversation_id = cp1.conversation_id
  join chat_conversations c on c.id = cp1.conversation_id
  where c.kind = 'dm'
    and cp1.user_id = auth.uid()
    and cp2.user_id = other_user_id
  limit 1;

  if conv_id is not null then
    return conv_id;
  end if;

  insert into chat_conversations (kind) values ('dm') returning id into conv_id;
  insert into chat_participants (conversation_id, user_id)
    values (conv_id, auth.uid()), (conv_id, other_user_id);

  return conv_id;
end;
$$;

revoke all on function public.get_or_create_dm(uuid) from public, anon;
grant execute on function public.get_or_create_dm(uuid) to authenticated;

-- ------------------------------------------------------------
-- realtime: push new messages to subscribed clients
-- ------------------------------------------------------------
alter publication supabase_realtime add table chat_messages;
