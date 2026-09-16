-- Pins search_path on the remaining SECURITY DEFINER functions that were
-- missing it (flagged by Supabase's security linter) — an explicit
-- search_path prevents a same-named object earlier in a mutable path from
-- being resolved instead of the intended public-schema table.
create or replace function private.is_active()
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select exists (select 1 from profiles where id = auth.uid() and active);
$function$;

create or replace function private.user_conversation_ids()
returns setof uuid
language sql
stable security definer
set search_path to 'public'
as $function$
  select conversation_id from chat_participants where user_id = auth.uid();
$function$;

create or replace function public.get_or_create_dm(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
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
$function$;
