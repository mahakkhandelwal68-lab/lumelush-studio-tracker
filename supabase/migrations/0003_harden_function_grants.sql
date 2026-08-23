-- Move the RLS helper out of the PostgREST-exposed `public` schema so it can't
-- be called over the REST API, while RLS policies can still use it internally.
-- Postgres rewrites existing policy expressions to `private.current_role_is`
-- automatically, since policies store the function OID.
create schema if not exists private;
alter function public.current_role_is(user_role) set schema private;

grant usage on schema private to authenticated;
revoke all on function private.current_role_is(user_role) from public, anon;
grant execute on function private.current_role_is(user_role) to authenticated;

-- book_meeting must stay callable via RPC (the caller dashboard invokes it),
-- but only by signed-in users, never anon.
revoke all on function public.book_meeting(uuid, uuid, text) from public, anon;
grant execute on function public.book_meeting(uuid, uuid, text) to authenticated;
