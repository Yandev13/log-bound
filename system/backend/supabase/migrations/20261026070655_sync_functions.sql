-- S2 migration: sync_push and sync_pull.
-- Source: docs/03-architecture/offline-sync-design.md, sections 4, 5, 7, 8, and 12.
-- S2 entities: punches (create only, D-05) and weekly report content (create and update).
-- S3 adds the report and correction decisions.

-- ---------------------------------------------------------------------------
-- 1. Doubtful device time (offline sync design, section 8; FR-DTR-11)
-- ---------------------------------------------------------------------------
-- p_stored_offset_s: the offset that the punch stored. p_offset_now_s: the offset at this sync.
create function private.is_doubtful_time(p_time timestamptz, p_stored_offset_s int, p_offset_now_s int)
returns boolean
language sql stable set search_path = '' as $$
  select p_time > now() + interval '2 minutes'
      or p_time < now() - interval '7 days'
      or (p_stored_offset_s is not null and p_offset_now_s is not null
          and abs(p_offset_now_s - p_stored_offset_s) > 300)
$$;

-- ---------------------------------------------------------------------------
-- 2. Operation handlers. Each handler returns the server record, or raises one of these codes:
--    PSDUP: the record exists already (duplicate)
--    PSCON: the base version is not the current version (conflict)
--    PSREJ: the operation is not valid. The message is the cause code.
-- ---------------------------------------------------------------------------
create function private.reject(p_cause text) returns void
language plpgsql set search_path = '' as $$
begin
  raise exception '%', p_cause using errcode = 'PSREJ';
end $$;

create function private.push_punch(p_op jsonb, p_uid uuid, p_offset_now_s int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_p jsonb := p_op -> 'payload';
  v_id uuid := (p_op ->> 'entity_id')::uuid;
  v_owner uuid;
  v_offset int;
  v_time timestamptz;
  v_row public.punches;
begin
  if p_op ->> 'op_type' is distinct from 'create' then
    perform private.reject('append_only');
  end if;
  if (select private.my_role()) is distinct from 'ojt' then
    perform private.reject('forbidden');
  end if;
  if jsonb_typeof(v_p) is distinct from 'object' or (v_p ->> 'id')::uuid is distinct from v_id then
    perform private.reject('invalid_data');
  end if;
  if (v_p ->> 'ojt_id')::uuid is distinct from p_uid then
    perform private.reject('forbidden');
  end if;
  -- Only the server makes a correction punch, when a facilitator approves a correction (S3).
  if v_p ->> 'corrects_punch_id' is not null then
    perform private.reject('forbidden');
  end if;

  select ojt_id into v_owner from public.punches where id = v_id;
  if found then
    if v_owner = p_uid then
      raise exception 'duplicate' using errcode = 'PSDUP';
    end if;
    perform private.reject('id_conflict');
  end if;

  if v_p ->> 'photo_id' is not null and not exists (
    select 1 from public.attachments where id = (v_p ->> 'photo_id')::uuid and owner_id = p_uid) then
    perform private.reject('invalid_reference');
  end if;

  v_offset := (v_p ->> 'clock_offset_s')::int;
  v_time := (v_p ->> 'device_time')::timestamptz;
  insert into public.punches (id, ojt_id, type, device_time, time_zone, clock_offset_s,
    lat, lng, accuracy_m, photo_id, device_id, doubtful_time)
  values (v_id, p_uid, v_p ->> 'type', v_time, v_p ->> 'time_zone', v_offset,
    (v_p ->> 'lat')::double precision, (v_p ->> 'lng')::double precision, (v_p ->> 'accuracy_m')::real,
    (v_p ->> 'photo_id')::uuid, v_p ->> 'device_id',
    coalesce(private.is_doubtful_time(v_time, v_offset, p_offset_now_s), false))
  returning * into v_row;
  return to_jsonb(v_row) - 'change_seq';
end $$;

-- Weekly report content. The OJT can change it only in status draft or returned (offline sync design, section 7).
create function private.push_report(p_op jsonb, p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_p jsonb := p_op -> 'payload';
  v_id uuid := (p_op ->> 'entity_id')::uuid;
  v_cur public.weekly_reports;
  v_row public.weekly_reports;
begin
  if (select private.my_role()) is distinct from 'ojt' then
    perform private.reject('forbidden');
  end if;
  if jsonb_typeof(v_p) is distinct from 'object' then
    perform private.reject('invalid_data');
  end if;

  select * into v_cur from public.weekly_reports where id = v_id for update;

  if p_op ->> 'op_type' = 'create' then
    if (v_p ->> 'id')::uuid is distinct from v_id then
      perform private.reject('invalid_data');
    end if;
    if (v_p ->> 'ojt_id')::uuid is distinct from p_uid then
      perform private.reject('forbidden');
    end if;
    if v_cur.id is not null then
      if v_cur.ojt_id = p_uid then
        raise exception 'duplicate' using errcode = 'PSDUP';
      end if;
      perform private.reject('id_conflict');
    end if;
    insert into public.weekly_reports (id, ojt_id, week_start, tasks_done, skills_learned, problems, next_plans)
    values (v_id, p_uid, (v_p ->> 'week_start')::date,
      coalesce(v_p ->> 'tasks_done', ''), coalesce(v_p ->> 'skills_learned', ''),
      coalesce(v_p ->> 'problems', ''), coalesce(v_p ->> 'next_plans', ''))
    returning * into v_row;

  elsif p_op ->> 'op_type' = 'update' then
    if v_cur.id is null then
      perform private.reject('not_found');
    end if;
    if v_cur.ojt_id <> p_uid then
      perform private.reject('forbidden');
    end if;
    if p_op ->> 'base_version' is null then
      perform private.reject('invalid_data');
    end if;
    if (p_op ->> 'base_version')::int <> v_cur.version then
      raise exception 'conflict' using errcode = 'PSCON';
    end if;
    if v_cur.status not in ('draft', 'returned') then
      perform private.reject('not_editable');
    end if;
    update public.weekly_reports set
      tasks_done = coalesce(v_p ->> 'tasks_done', tasks_done),
      skills_learned = coalesce(v_p ->> 'skills_learned', skills_learned),
      problems = coalesce(v_p ->> 'problems', problems),
      next_plans = coalesce(v_p ->> 'next_plans', next_plans)
    where id = v_id
    returning * into v_row;

  else
    perform private.reject('unsupported');
  end if;
  return to_jsonb(v_row) - 'change_seq';
end $$;

-- The current server copy of a record, if the user can read it. The client uses it for duplicate and conflict.
create function private.current_record(p_entity text, p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v jsonb;
begin
  if p_entity = 'punches' then
    select to_jsonb(t) - 'change_seq' into v from public.punches t
    where t.id = p_id and private.can_read_ojt(t.ojt_id);
  elsif p_entity = 'weekly_reports' then
    select to_jsonb(t) - 'change_seq' into v from public.weekly_reports t
    where t.id = p_id and private.can_read_ojt(t.ojt_id);
  end if;
  return v;
end $$;

-- ---------------------------------------------------------------------------
-- 3. sync_push (offline sync design, section 4)
-- ---------------------------------------------------------------------------
-- p_ops: array of 1 to 50 operations: {op_id, entity, entity_id, op_type, payload, base_version}.
-- p_device_now: the device clock at the send time. The server uses it for the doubtful-time rule.
-- Returns {server_time, results: [{op_id, result, cause, record}]}.
create function public.sync_push(p_ops jsonb, p_device_now timestamptz default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_offset_now int;
  v_op jsonb;
  v_op_id uuid;
  v_record jsonb;
  v_results jsonb := '[]'::jsonb;
  v_constraint text;
  v_result jsonb;
begin
  if (select private.my_role()) is null or (select private.my_role()) not in ('ojt', 'facilitator') then
    raise exception 'sync is for active OJT and facilitator accounts' using errcode = '42501';
  end if;
  if jsonb_typeof(p_ops) is distinct from 'array' then
    raise exception 'p_ops must be an array of 1 to 50 operations' using errcode = '22023';
  end if;
  if jsonb_array_length(p_ops) not between 1 and 50 then
    raise exception 'p_ops must be an array of 1 to 50 operations' using errcode = '22023';
  end if;
  if p_device_now is not null then
    v_offset_now := round(extract(epoch from (now() - p_device_now)));
  end if;

  for v_op in select value from jsonb_array_elements(p_ops) loop
    v_record := null;
    begin
      v_op_id := (v_op ->> 'op_id')::uuid;
      if v_op_id is null then
        perform private.reject('invalid_data');
      end if;
      if exists (select 1 from public.processed_ops where op_id = v_op_id) then
        raise exception 'duplicate' using errcode = 'PSDUP';
      end if;
      v_record := case v_op ->> 'entity'
        when 'punches' then private.push_punch(v_op, v_uid, v_offset_now)
        when 'weekly_reports' then private.push_report(v_op, v_uid)
      end;
      if v_record is null then
        perform private.reject('unsupported');
      end if;
      insert into public.processed_ops (op_id, user_id, result) values (v_op_id, v_uid, 'applied');
      v_result := jsonb_build_object('result', 'applied', 'record', v_record);
    exception
      when sqlstate 'PSDUP' then
        v_result := jsonb_build_object('result', 'duplicate');
      when sqlstate 'PSCON' then
        v_result := jsonb_build_object('result', 'conflict', 'cause', 'version');
      when sqlstate 'PSREJ' then
        v_result := jsonb_build_object('result', 'rejected', 'cause', sqlerrm);
      when unique_violation then
        -- A second send of the same operation at the same time, or two reports for one week.
        get stacked diagnostics v_constraint = constraint_name;
        if v_constraint = 'weekly_reports_ojt_id_week_start_key' then
          v_result := jsonb_build_object('result', 'conflict', 'cause', 'week_exists');
        else
          v_result := jsonb_build_object('result', 'duplicate');
        end if;
      when foreign_key_violation then
        v_result := jsonb_build_object('result', 'rejected', 'cause', 'invalid_reference');
      when check_violation or not_null_violation or invalid_text_representation
        or invalid_datetime_format or datetime_field_overflow or numeric_value_out_of_range
        or string_data_right_truncation or invalid_parameter_value then
        v_result := jsonb_build_object('result', 'rejected', 'cause', 'invalid_data');
    end;
    if v_result ->> 'result' in ('duplicate', 'conflict') then
      begin
        v_result := v_result || jsonb_build_object('record',
          private.current_record(v_op ->> 'entity', (v_op ->> 'entity_id')::uuid));
      exception when invalid_text_representation then
        null;
      end;
    end if;
    v_results := v_results || jsonb_build_array(jsonb_build_object('op_id', v_op ->> 'op_id') || v_result);
  end loop;

  return jsonb_build_object('server_time', now(), 'results', v_results);
end $$;

-- ---------------------------------------------------------------------------
-- 4. sync_pull (offline sync design, sections 5 and 12)
-- ---------------------------------------------------------------------------
-- SECURITY INVOKER: the RLS select policies give the scope of the user (section 5, "Scope of the pull").
-- p_cursor: the last change_seq that the app has. p_epoch: the epoch that the app knows (null at the first pull).
-- Returns {epoch, epoch_changed, server_time, records: [{entity, change_seq, data}], cursor, has_more}.
-- Rows changed in the last 2 seconds wait for the next pull. Thus a transaction that is not committed yet
-- cannot leave a gap behind the cursor.
create function public.sync_pull(p_cursor bigint default 0, p_epoch uuid default null, p_limit int default 500)
returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  v_epoch uuid := public.server_epoch();
  v_limit int := least(greatest(coalesce(p_limit, 500), 1), 500);
  v_cursor bigint := greatest(coalesce(p_cursor, 0), 0);
  v_records jsonb := '[]'::jsonb;
  v_count int := 0;
  v_has_more boolean := false;
  r record;
begin
  if (select private.my_role()) is null or (select private.my_role()) not in ('ojt', 'facilitator') then
    raise exception 'sync is for active OJT and facilitator accounts' using errcode = '42501';
  end if;
  if p_epoch is not null and p_epoch <> v_epoch then
    return jsonb_build_object('epoch', v_epoch, 'epoch_changed', true, 'server_time', now(),
      'records', '[]'::jsonb, 'cursor', 0, 'has_more', true);
  end if;

  for r in
    select * from (
      (select 'profiles' as entity, t.change_seq, t.updated_at, to_jsonb(t) - 'change_seq' as data
         from public.profiles t where t.change_seq > v_cursor order by t.change_seq limit v_limit + 1)
      union all
      (select 'companies', t.change_seq, t.updated_at, to_jsonb(t) - 'change_seq'
         from public.companies t where t.change_seq > v_cursor order by t.change_seq limit v_limit + 1)
      union all
      (select 'batches', t.change_seq, t.updated_at, to_jsonb(t) - 'change_seq'
         from public.batches t where t.change_seq > v_cursor order by t.change_seq limit v_limit + 1)
      union all
      (select 'ojt_assignments', t.change_seq, t.updated_at, to_jsonb(t) - 'change_seq'
         from public.ojt_assignments t where t.change_seq > v_cursor order by t.change_seq limit v_limit + 1)
      union all
      (select 'punches', t.change_seq, t.updated_at, to_jsonb(t) - 'change_seq'
         from public.punches t where t.change_seq > v_cursor order by t.change_seq limit v_limit + 1)
      union all
      (select 'weekly_reports', t.change_seq, t.updated_at, to_jsonb(t) - 'change_seq'
         from public.weekly_reports t where t.change_seq > v_cursor order by t.change_seq limit v_limit + 1)
      union all
      (select 'report_events', t.change_seq, t.updated_at, to_jsonb(t) - 'change_seq'
         from public.report_events t where t.change_seq > v_cursor order by t.change_seq limit v_limit + 1)
      union all
      (select 'correction_requests', t.change_seq, t.updated_at, to_jsonb(t) - 'change_seq'
         from public.correction_requests t where t.change_seq > v_cursor order by t.change_seq limit v_limit + 1)
      union all
      (select 'attachments', t.change_seq, t.updated_at, to_jsonb(t) - 'change_seq'
         from public.attachments t where t.change_seq > v_cursor order by t.change_seq limit v_limit + 1)
      union all
      (select 'notifications', t.change_seq, t.updated_at, to_jsonb(t) - 'change_seq'
         from public.notifications t where t.change_seq > v_cursor order by t.change_seq limit v_limit + 1)
    ) c
    order by c.change_seq
    limit v_limit + 1
  loop
    if r.updated_at > now() - interval '2 seconds' then
      v_has_more := true;
      exit;
    end if;
    if v_count = v_limit then
      v_has_more := true;
      exit;
    end if;
    v_records := v_records || jsonb_build_array(
      jsonb_build_object('entity', r.entity, 'change_seq', r.change_seq, 'data', r.data));
    v_cursor := r.change_seq;
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('epoch', v_epoch, 'epoch_changed', false, 'server_time', now(),
    'records', v_records, 'cursor', v_cursor, 'has_more', v_has_more);
end $$;

-- ---------------------------------------------------------------------------
-- 5. Grants. Only signed-in users can call the sync functions. The private handlers are internal.
-- ---------------------------------------------------------------------------
revoke all on function private.is_doubtful_time(timestamptz, int, int), private.reject(text),
  private.push_punch(jsonb, uuid, int), private.push_report(jsonb, uuid),
  private.current_record(text, uuid) from public;
revoke all on function public.sync_push(jsonb, timestamptz), public.sync_pull(bigint, uuid, int) from public, anon;
grant execute on function public.sync_push(jsonb, timestamptz), public.sync_pull(bigint, uuid, int) to authenticated;
