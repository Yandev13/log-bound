-- S2 migration: DEF-008. sync_push accepted PostgreSQL time words ('yesterday', 'now', 'infinity')
-- as punch times. The payload must use ISO 8601 text only (QR-SE-05).

-- Gives the time of an ISO 8601 text with a time zone, or raises PSREJ invalid_data.
create function private.parse_iso_time(p_text text) returns timestamptz
language plpgsql set search_path = '' as $$
begin
  if p_text is null
     or p_text !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}(:?\d{2})?)$' then
    perform private.reject('invalid_data');
  end if;
  return p_text::timestamptz;
end $$;

-- Gives the date of an ISO 8601 date text (YYYY-MM-DD), or raises PSREJ invalid_data.
create function private.parse_iso_date(p_text text) returns date
language plpgsql set search_path = '' as $$
begin
  if p_text is null or p_text !~ '^\d{4}-\d{2}-\d{2}$' then
    perform private.reject('invalid_data');
  end if;
  return p_text::date;
end $$;

create or replace function private.push_punch(p_op jsonb, p_uid uuid, p_offset_now_s int) returns jsonb
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
  v_time := private.parse_iso_time(v_p ->> 'device_time');
  insert into public.punches (id, ojt_id, type, device_time, time_zone, clock_offset_s,
    lat, lng, accuracy_m, photo_id, device_id, doubtful_time)
  values (v_id, p_uid, v_p ->> 'type', v_time, v_p ->> 'time_zone', v_offset,
    (v_p ->> 'lat')::double precision, (v_p ->> 'lng')::double precision, (v_p ->> 'accuracy_m')::real,
    (v_p ->> 'photo_id')::uuid, v_p ->> 'device_id',
    coalesce(private.is_doubtful_time(v_time, v_offset, p_offset_now_s), false))
  returning * into v_row;
  return to_jsonb(v_row) - 'change_seq';
end $$;

create or replace function private.push_report(p_op jsonb, p_uid uuid) returns jsonb
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
    values (v_id, p_uid, private.parse_iso_date(v_p ->> 'week_start'),
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

revoke all on function private.parse_iso_time(text), private.parse_iso_date(text) from public;
