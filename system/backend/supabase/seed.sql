-- Seed data for the dev project and the local stack only (test plan, section 10.2).
-- CAUTION: Do not run this file on prod. The accounts have a known test password.
--
-- The password is not in this file (AGENTS.md, rule 8). Set it in the same session first:
--   select set_config('app.seed_password', '<SEED_PASSWORD from system/backend/.env>', false);
-- The file is safe to run again. It does not change rows that exist.
-- The volume data of the quality requirements (section 2) comes in S4.

do $$
declare
  v_pw text := current_setting('app.seed_password', true);
  u record;
begin
  if v_pw is null or length(v_pw) < 8 then
    raise exception 'Set app.seed_password (8 characters or more) before you run seed.sql';
  end if;

  for u in
    select * from (values
      ('00000000-0000-4000-a000-000000000001'::uuid, 'admin@test.local', 'admin', 'Test Admin'),
      ('00000000-0000-4000-a000-000000000011'::uuid, 'fac1@test.local', 'facilitator', 'Facilitator One'),
      ('00000000-0000-4000-a000-000000000012'::uuid, 'fac2@test.local', 'facilitator', 'Facilitator Two'),
      ('00000000-0000-4000-a000-000000000021'::uuid, 'ojt1@test.local', 'ojt', 'OJT One'),
      ('00000000-0000-4000-a000-000000000022'::uuid, 'ojt2@test.local', 'ojt', 'OJT Two'),
      ('00000000-0000-4000-a000-000000000023'::uuid, 'ojt3@test.local', 'ojt', 'OJT Three'),
      ('00000000-0000-4000-a000-000000000024'::uuid, 'ojt4@test.local', 'ojt', 'OJT Four'),
      ('00000000-0000-4000-a000-000000000025'::uuid, 'ojt5@test.local', 'ojt', 'OJT Five'),
      ('00000000-0000-4000-a000-000000000026'::uuid, 'ojt6@test.local', 'ojt', 'OJT Six')
    ) as t (id, email, user_role, full_name)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change)
    values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
      extensions.crypt(v_pw, extensions.gen_salt('bf')), now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', u.user_role),
      jsonb_build_object('full_name', u.full_name), now(), now(), '', '', '', '')
    on conflict (id) do nothing;

    insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), u.id, u.id::text, 'email',
      jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), now(), now(), now())
    on conflict (provider_id, provider) do nothing;
  end loop;
end $$;

insert into public.companies (id, name, address, photo_required, location_required) values
  ('10000000-0000-4000-a000-000000000001', 'Test Company A', 'Valenzuela City', false, true),
  ('10000000-0000-4000-a000-000000000002', 'Test Company B', 'Quezon City', true, true)
on conflict (id) do nothing;

insert into public.batches (id, name, start_date, end_date, required_hours) values
  ('20000000-0000-4000-a000-000000000001', 'Test Batch 2026-1', '2026-10-05', '2027-01-29', 486)
on conflict (id) do nothing;

-- ojt1 to ojt5 go to fac1. ojt6 goes to fac2 (access matrix tests).
insert into public.ojt_assignments (id, ojt_id, facilitator_id, company_id, batch_id) values
  ('30000000-0000-4000-a000-000000000021', '00000000-0000-4000-a000-000000000021', '00000000-0000-4000-a000-000000000011', '10000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001'),
  ('30000000-0000-4000-a000-000000000022', '00000000-0000-4000-a000-000000000022', '00000000-0000-4000-a000-000000000011', '10000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001'),
  ('30000000-0000-4000-a000-000000000023', '00000000-0000-4000-a000-000000000023', '00000000-0000-4000-a000-000000000011', '10000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001'),
  ('30000000-0000-4000-a000-000000000024', '00000000-0000-4000-a000-000000000024', '00000000-0000-4000-a000-000000000011', '10000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001'),
  ('30000000-0000-4000-a000-000000000025', '00000000-0000-4000-a000-000000000025', '00000000-0000-4000-a000-000000000011', '10000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001'),
  ('30000000-0000-4000-a000-000000000026', '00000000-0000-4000-a000-000000000026', '00000000-0000-4000-a000-000000000012', '10000000-0000-4000-a000-000000000002', '20000000-0000-4000-a000-000000000001')
on conflict (id) do nothing;
