-- S1 migration: core schema, RLS, audit triggers, keep-alive heartbeat.
-- Sources: docs/03-architecture/data-model.md, system-modules.md (sections 6 and 7),
-- docs/07-operations/free-tier-operations-runbook.md (section 3.1).
-- The mobile app writes only through sync_push (S2). Thus mobile roles get no write grants here.

-- ---------------------------------------------------------------------------
-- 1. Schemas. The Data API does not expose `private` and `ops`.
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create schema if not exists ops;
revoke all on schema ops from public, anon, authenticated;

-- The server change number. It is the pull cursor (D-11).
create sequence private.change_seq;

-- Sets the common columns of each synced table (data model, section 2).
create function private.touch_row() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.version := 1;
    new.created_at := now();
  else
    new.version := old.version + 1;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  new.change_seq := nextval('private.change_seq');
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('ojt', 'facilitator', 'admin')),
  full_name text not null default '' check (char_length(full_name) <= 200),
  contact_no text check (contact_no ~ '^[0-9+() -]{0,20}$'),
  status text not null default 'active' check (status in ('active', 'inactive')),
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  change_seq bigint not null default 0
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  address text not null default '' check (char_length(address) <= 500),
  photo_required boolean not null default false,
  location_required boolean not null default false,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  change_seq bigint not null default 0
);

create table public.batches (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  start_date date not null,
  end_date date not null,
  required_hours int not null check (required_hours between 1 and 2000),
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  change_seq bigint not null default 0,
  check (end_date >= start_date)
);

create table public.ojt_assignments (
  id uuid primary key default gen_random_uuid(),
  ojt_id uuid not null references public.profiles (id),
  facilitator_id uuid not null references public.profiles (id),
  company_id uuid not null references public.companies (id),
  batch_id uuid not null references public.batches (id),
  active boolean not null default true,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  change_seq bigint not null default 0,
  check (ojt_id <> facilitator_id)
);
-- One active assignment for each OJT (A-01, data model rule 3).
create unique index ojt_assignments_one_active on public.ojt_assignments (ojt_id) where active;

create table public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  ojt_id uuid not null references public.profiles (id),
  week_start date not null check (extract(isodow from week_start) = 1),
  tasks_done text not null default '' check (char_length(tasks_done) <= 5000),
  skills_learned text not null default '' check (char_length(skills_learned) <= 5000),
  problems text not null default '' check (char_length(problems) <= 5000),
  next_plans text not null default '' check (char_length(next_plans) <= 5000),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'returned')),
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  change_seq bigint not null default 0,
  unique (ojt_id, week_start)
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id),
  report_id uuid references public.weekly_reports (id),
  storage_key text not null check (char_length(storage_key) between 1 and 500),
  -- QR-PE-05: 500 KB or less.
  size_bytes int not null check (size_bytes between 1 and 512000),
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  change_seq bigint not null default 0
);

create table public.punches (
  id uuid primary key default gen_random_uuid(),
  ojt_id uuid not null references public.profiles (id),
  type text not null check (type in ('in', 'out')),
  device_time timestamptz not null,
  time_zone text not null check (char_length(time_zone) between 1 and 64),
  clock_offset_s int,
  server_received_at timestamptz not null default now(),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  accuracy_m real check (accuracy_m >= 0),
  photo_id uuid references public.attachments (id),
  device_id text not null check (char_length(device_id) between 1 and 200),
  corrects_punch_id uuid references public.punches (id),
  doubtful_time boolean not null default false,
  approved boolean not null default false,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  change_seq bigint not null default 0,
  check ((lat is null) = (lng is null))
);

create table public.correction_requests (
  id uuid primary key default gen_random_uuid(),
  ojt_id uuid not null references public.profiles (id),
  punch_id uuid references public.punches (id),
  kind text not null check (kind in ('add', 'change')),
  requested_time timestamptz not null,
  reason text not null check (char_length(reason) between 1 and 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decided_by uuid references public.profiles (id),
  decided_device_id text,
  decided_at timestamptz,
  remark text check (char_length(remark) <= 1000),
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  change_seq bigint not null default 0,
  check ((kind = 'change') = (punch_id is not null))
);

create table public.report_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.weekly_reports (id),
  actor_id uuid not null references public.profiles (id),
  action text not null check (action in ('submit', 'approve', 'return')),
  device_id text,
  remark text check (char_length(remark) <= 1000),
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  change_seq bigint not null default 0
);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('android', 'ios', 'web')),
  push_token text check (char_length(push_token) <= 4096),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (char_length(type) between 1 and 50),
  title text not null check (char_length(title) between 1 and 200),
  read boolean not null default false,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  change_seq bigint not null default 0
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

-- Stops a second application of the same operation (FR-SYNC-05).
create table public.processed_ops (
  op_id uuid primary key,
  user_id uuid not null,
  result text not null,
  processed_at timestamptz not null default now()
);

create table ops.server_meta (
  id int primary key default 1 check (id = 1),
  epoch uuid not null default gen_random_uuid()
);
insert into ops.server_meta (id) values (1);

create table ops.heartbeat (
  id bigint generated always as identity primary key,
  source text not null,
  created_at timestamptz not null default now()
);

create table ops.settings (
  key text primary key,
  value text not null
);

-- Indexes for the pull cursor and the foreign keys.
create index on public.profiles (change_seq);
create index on public.companies (change_seq);
create index on public.batches (change_seq);
create index on public.ojt_assignments (change_seq);
create index on public.ojt_assignments (facilitator_id) where active;
create index on public.ojt_assignments (company_id);
create index on public.ojt_assignments (batch_id);
create index on public.weekly_reports (change_seq);
create index on public.attachments (change_seq);
create index on public.attachments (owner_id);
create index on public.attachments (report_id);
create index on public.punches (change_seq);
create index on public.punches (ojt_id, device_time);
create index on public.punches (photo_id);
create index on public.punches (corrects_punch_id);
create index on public.correction_requests (change_seq);
create index on public.correction_requests (ojt_id);
create index on public.correction_requests (punch_id);
create index on public.correction_requests (decided_by);
create index on public.report_events (change_seq);
create index on public.report_events (report_id);
create index on public.report_events (actor_id);
create index on public.devices (user_id);
create index on public.notifications (change_seq);
create index on public.notifications (user_id);
create index on public.audit_logs (created_at);
create index on ops.heartbeat (source, created_at);

-- Common column triggers
create trigger touch before insert or update on public.profiles for each row execute function private.touch_row();
create trigger touch before insert or update on public.companies for each row execute function private.touch_row();
create trigger touch before insert or update on public.batches for each row execute function private.touch_row();
create trigger touch before insert or update on public.ojt_assignments for each row execute function private.touch_row();
create trigger touch before insert or update on public.weekly_reports for each row execute function private.touch_row();
create trigger touch before insert or update on public.attachments for each row execute function private.touch_row();
create trigger touch before insert or update on public.punches for each row execute function private.touch_row();
create trigger touch before insert or update on public.correction_requests for each row execute function private.touch_row();
create trigger touch before insert or update on public.report_events for each row execute function private.touch_row();
create trigger touch before insert or update on public.notifications for each row execute function private.touch_row();

-- ---------------------------------------------------------------------------
-- 3. Rules (QR-SE-05)
-- ---------------------------------------------------------------------------
-- An assignment must link an OJT account to a facilitator account.
create function private.check_assignment_roles() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles where id = new.ojt_id and role = 'ojt') then
    raise exception 'ojt_id must be an OJT account' using errcode = '23514';
  end if;
  if not exists (select 1 from public.profiles where id = new.facilitator_id and role = 'facilitator') then
    raise exception 'facilitator_id must be a facilitator account' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger check_roles before insert or update on public.ojt_assignments
  for each row execute function private.check_assignment_roles();

-- Punches are append-only (D-05). Only the server flags can change.
create function private.protect_punch() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'punches are append-only' using errcode = '42501';
  end if;
  if (new.ojt_id, new.type, new.device_time, new.time_zone, new.device_id, new.corrects_punch_id,
      new.server_received_at, new.lat, new.lng, new.accuracy_m, new.photo_id, new.clock_offset_s)
     is distinct from
     (old.ojt_id, old.type, old.device_time, old.time_zone, old.device_id, old.corrects_punch_id,
      old.server_received_at, old.lat, old.lng, old.accuracy_m, old.photo_id, old.clock_offset_s) then
    raise exception 'punches are append-only' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger append_only before update or delete on public.punches
  for each row execute function private.protect_punch();

-- Audit entries cannot change (QR-SE-07).
create function private.protect_audit() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'audit_logs are read-only' using errcode = '42501';
end $$;
create trigger read_only before update or delete on public.audit_logs
  for each row execute function private.protect_audit();

-- ---------------------------------------------------------------------------
-- 4. New accounts. The admin sets the role in app_metadata (only the service role can set it).
--    An account without a role gets status 'inactive' and has no access.
-- ---------------------------------------------------------------------------
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, role, full_name, status)
  values (
    new.id,
    coalesce(new.raw_app_meta_data ->> 'role', 'ojt'),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when new.raw_app_meta_data ? 'role' then 'active' else 'inactive' end
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- 5. Access helpers for the RLS policies. They read only the profile and the assignments.
-- ---------------------------------------------------------------------------
create function private.my_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.profiles
  where id = (select auth.uid()) and status = 'active' and deleted_at is null
$$;

create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select private.my_role()) = 'admin', false)
$$;

-- True if the current user is the active facilitator of the OJT.
create function private.facilitates(p_ojt uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select (select private.my_role()) = 'facilitator' and exists (
    select 1 from public.ojt_assignments a
    where a.ojt_id = p_ojt and a.facilitator_id = (select auth.uid()) and a.active and a.deleted_at is null)
$$;

-- True if the user can read the records of this OJT: the OJT, its facilitator, or an admin.
create function private.can_read_ojt(p_ojt uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    ((select private.my_role()) = 'ojt' and p_ojt = (select auth.uid()))
    or (select private.facilitates(p_ojt))
    or (select private.is_admin()), false)
$$;

-- True if the profile is a person that the current user works with through an active assignment.
create function private.is_assignment_peer(p_profile uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.ojt_assignments a
    where a.active and a.deleted_at is null
      and ((a.ojt_id = (select auth.uid()) and a.facilitator_id = p_profile)
        or (a.facilitator_id = (select auth.uid()) and a.ojt_id = p_profile)))
  and (select private.my_role()) in ('ojt', 'facilitator')
$$;

-- True if the company or batch is in an active assignment of the current user.
create function private.in_my_assignment(p_company uuid, p_batch uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select (select private.my_role()) in ('ojt', 'facilitator') and exists (
    select 1 from public.ojt_assignments a
    where a.active and a.deleted_at is null
      and (a.ojt_id = (select auth.uid()) or a.facilitator_id = (select auth.uid()))
      and (a.company_id = p_company or a.batch_id = p_batch))
$$;

create function private.can_read_report(p_report uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.weekly_reports r where r.id = p_report and private.can_read_ojt(r.ojt_id))
$$;

revoke all on all functions in schema private from public;
grant execute on function private.my_role(), private.is_admin(), private.facilitates(uuid),
  private.can_read_ojt(uuid), private.is_assignment_peer(uuid), private.in_my_assignment(uuid, uuid),
  private.can_read_report(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Grants. Anonymous users get nothing. Mobile roles write through sync_push (S2).
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
-- Tables made by later migrations also give nothing to anonymous users.
alter default privileges for role postgres in schema public revoke all on tables from anon;
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from authenticated;
grant insert, update on public.companies, public.batches, public.ojt_assignments to authenticated;
grant update on public.profiles to authenticated;
grant insert, update on public.devices to authenticated;

-- ---------------------------------------------------------------------------
-- 7. RLS. One policy for one role and one action (backend rule 3).
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.batches enable row level security;
alter table public.ojt_assignments enable row level security;
alter table public.weekly_reports enable row level security;
alter table public.attachments enable row level security;
alter table public.punches enable row level security;
alter table public.correction_requests enable row level security;
alter table public.report_events enable row level security;
alter table public.devices enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.processed_ops enable row level security;

-- profiles
create policy profiles_select_own on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_select_peer on public.profiles for select to authenticated
  using ((select private.is_assignment_peer(id)));
create policy profiles_select_admin on public.profiles for select to authenticated
  using ((select private.is_admin()));
create policy profiles_update_admin on public.profiles for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- companies
create policy companies_select_assigned on public.companies for select to authenticated
  using ((select private.in_my_assignment(id, null)));
create policy companies_select_admin on public.companies for select to authenticated
  using ((select private.is_admin()));
create policy companies_insert_admin on public.companies for insert to authenticated
  with check ((select private.is_admin()));
create policy companies_update_admin on public.companies for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- batches
create policy batches_select_assigned on public.batches for select to authenticated
  using ((select private.in_my_assignment(null, id)));
create policy batches_select_admin on public.batches for select to authenticated
  using ((select private.is_admin()));
create policy batches_insert_admin on public.batches for insert to authenticated
  with check ((select private.is_admin()));
create policy batches_update_admin on public.batches for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- ojt_assignments
create policy assignments_select_ojt on public.ojt_assignments for select to authenticated
  using (ojt_id = (select auth.uid()) and (select private.my_role()) = 'ojt');
create policy assignments_select_facilitator on public.ojt_assignments for select to authenticated
  using (facilitator_id = (select auth.uid()) and (select private.my_role()) = 'facilitator');
create policy assignments_select_admin on public.ojt_assignments for select to authenticated
  using ((select private.is_admin()));
create policy assignments_insert_admin on public.ojt_assignments for insert to authenticated
  with check ((select private.is_admin()));
create policy assignments_update_admin on public.ojt_assignments for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Records of an OJT: read by the OJT, the facilitator, and the admin. No client writes in S1.
create policy punches_select on public.punches for select to authenticated
  using ((select private.can_read_ojt(ojt_id)));
create policy weekly_reports_select on public.weekly_reports for select to authenticated
  using ((select private.can_read_ojt(ojt_id)));
create policy correction_requests_select on public.correction_requests for select to authenticated
  using ((select private.can_read_ojt(ojt_id)));
create policy attachments_select on public.attachments for select to authenticated
  using ((select private.can_read_ojt(owner_id)));
create policy report_events_select on public.report_events for select to authenticated
  using ((select private.can_read_report(report_id)));

-- devices (push tokens, network document section 7)
create policy devices_select_own on public.devices for select to authenticated
  using (user_id = (select auth.uid()));
create policy devices_insert_own on public.devices for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.my_role()) in ('ojt', 'facilitator'));
create policy devices_update_own on public.devices for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- notifications
create policy notifications_select_own on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

-- audit_logs: the admin reads. Nobody writes through the API (QR-SE-07).
create policy audit_logs_select_admin on public.audit_logs for select to authenticated
  using ((select private.is_admin()));

-- processed_ops: no policy. Only sync_push (security definer, S2) uses it.

-- ---------------------------------------------------------------------------
-- 8. Audit triggers (FR-AUD-01): user changes, assignment changes, admin data,
--    report and correction decisions, and correction punches.
-- ---------------------------------------------------------------------------
create function private.audit_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_old jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  v_new jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
begin
  insert into public.audit_logs (actor_id, action, entity, entity_id, before_data, after_data)
  values ((select auth.uid()), lower(tg_op), tg_table_name,
          coalesce((v_new ->> 'id')::uuid, (v_old ->> 'id')::uuid), v_old, v_new);
  return null;
end $$;

create trigger audit after insert or update or delete on public.profiles
  for each row execute function private.audit_change();
create trigger audit after insert or update or delete on public.ojt_assignments
  for each row execute function private.audit_change();
create trigger audit after insert or update or delete on public.companies
  for each row execute function private.audit_change();
create trigger audit after insert or update or delete on public.batches
  for each row execute function private.audit_change();
create trigger audit after update on public.weekly_reports
  for each row when (old.status is distinct from new.status) execute function private.audit_change();
create trigger audit after insert or update on public.correction_requests
  for each row when (new.status <> 'pending') execute function private.audit_change();
create trigger audit after insert on public.punches
  for each row when (new.corrects_punch_id is not null) execute function private.audit_change();

-- ---------------------------------------------------------------------------
-- 9. Keep-alive (runbook, section 3.1). The heartbeat makes a real database write.
-- ---------------------------------------------------------------------------
create function ops.heartbeat(p_source text, p_secret text) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  v_secret text;
  v_now timestamptz := now();
begin
  select value into v_secret from ops.settings where key = 'keepalive_secret';
  if v_secret is null or p_secret is null or v_secret <> p_secret then
    raise exception 'invalid secret' using errcode = '28000';
  end if;
  if p_source !~ '^[A-Za-z0-9_-]{1,32}$' then
    raise exception 'invalid source' using errcode = '22023';
  end if;
  insert into ops.heartbeat (source, created_at) values (p_source, v_now);
  delete from ops.heartbeat where created_at < v_now - interval '30 days';
  return v_now;
end $$;
revoke all on function ops.heartbeat(text, text) from public;

-- The Data API exposes only `public`. This wrapper is the only entry to `ops` (S0 observation O-3).
create function public.heartbeat(source text, secret text) returns timestamptz
language sql security definer set search_path = '' as $$
  select ops.heartbeat(source, secret)
$$;
revoke all on function public.heartbeat(text, text) from public;
grant execute on function public.heartbeat(text, text) to anon, authenticated;

-- The newest heartbeat of each source, for the admin dashboard (runbook, section 7).
create function public.heartbeat_status() returns table (source text, last_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select h.source, max(h.created_at) from ops.heartbeat h
  where (select private.is_admin())
  group by h.source
$$;
revoke all on function public.heartbeat_status() from public;
grant execute on function public.heartbeat_status() to authenticated;

-- The current server epoch (D-19). sync_pull also returns it (S2).
create function public.server_epoch() returns uuid
language sql stable security definer set search_path = '' as $$
  select epoch from ops.server_meta where id = 1
$$;
revoke all on function public.server_epoch() from public;
grant execute on function public.server_epoch() to authenticated;
