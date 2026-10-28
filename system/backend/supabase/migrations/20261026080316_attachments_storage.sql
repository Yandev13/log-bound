-- S2 migration: photo files (offline sync design, section 10; FR-DTR-05, QR-PE-05).
-- 1. A private Storage bucket for photos: JPEG only, 500 KB or less.
-- 2. Storage policies: an OJT uploads only into its own folder. The same people as the records read the files.
-- 3. sync_push accepts `attachments` records. The file must be in Storage first. The server takes the size from Storage.

-- ---------------------------------------------------------------------------
-- 1. Bucket. Object names: <owner_id>/<attachment_id>.jpg
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attachments', 'attachments', false, 512000, array['image/jpeg']);

-- The owner of an object name, or null if the name does not have the correct form.
create function private.attachment_owner(p_name text) returns uuid
language sql immutable set search_path = '' as $$
  select case
    when p_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
    then split_part(p_name, '/', 1)::uuid
  end
$$;
revoke all on function private.attachment_owner(text) from public;
grant execute on function private.attachment_owner(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Storage policies (one policy for one role and one action, backend rule 3). No update and no delete:
--    a photo of a punch does not change (D-05).
-- ---------------------------------------------------------------------------
create policy attachments_insert_own on storage.objects for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and (select private.my_role()) = 'ojt'
    and private.attachment_owner(name) = (select auth.uid())
  );

create policy attachments_select on storage.objects for select to authenticated
  using (
    bucket_id = 'attachments'
    and (select private.can_read_ojt(private.attachment_owner(name)))
  );

-- ---------------------------------------------------------------------------
-- 3. sync_push: attachments (create only)
-- ---------------------------------------------------------------------------
create function private.push_attachment(p_op jsonb, p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_p jsonb := p_op -> 'payload';
  v_id uuid := (p_op ->> 'entity_id')::uuid;
  v_owner uuid;
  v_key text;
  v_size int;
  v_row public.attachments;
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
  if (v_p ->> 'owner_id')::uuid is distinct from p_uid then
    perform private.reject('forbidden');
  end if;

  select owner_id into v_owner from public.attachments where id = v_id;
  if found then
    if v_owner = p_uid then
      raise exception 'duplicate' using errcode = 'PSDUP';
    end if;
    perform private.reject('id_conflict');
  end if;

  v_key := p_uid::text || '/' || v_id::text || '.jpg';
  if v_p ->> 'storage_key' is distinct from v_key then
    perform private.reject('invalid_data');
  end if;
  -- The file must be uploaded before its record (section 10, step 3). The size comes from Storage.
  select (o.metadata ->> 'size')::int into v_size
    from storage.objects o where o.bucket_id = 'attachments' and o.name = v_key;
  if v_size is null then
    perform private.reject('file_missing');
  end if;

  -- A report link comes with the report functions (S3).
  insert into public.attachments (id, owner_id, storage_key, size_bytes)
  values (v_id, p_uid, v_key, v_size)
  returning * into v_row;
  return to_jsonb(v_row) - 'change_seq';
end $$;
revoke all on function private.push_attachment(jsonb, uuid) from public;

create or replace function private.current_record(p_entity text, p_id uuid) returns jsonb
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
  elsif p_entity = 'attachments' then
    select to_jsonb(t) - 'change_seq' into v from public.attachments t
    where t.id = p_id and private.can_read_ojt(t.owner_id);
  end if;
  return v;
end $$;

create or replace function public.sync_push(p_ops jsonb, p_device_now timestamptz default null) returns jsonb
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
        when 'attachments' then private.push_attachment(v_op, v_uid)
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
