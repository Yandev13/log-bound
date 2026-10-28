-- Supabase grants EXECUTE on new public functions to anon directly. Only the keep-alive
-- heartbeat is for anonymous callers (it needs the secret). Revoke the other grants.
revoke execute on function public.heartbeat_status() from anon;
revoke execute on function public.server_epoch() from anon;
-- Functions made by later migrations also give nothing to anonymous users.
alter default privileges for role postgres in schema public revoke execute on functions from anon;
