# AGENTS.md: system/backend/

This folder will contain the Supabase backend: migrations, RLS policies, database functions, Edge Functions, seed data, backend tests, and operation scripts.

## Status

Created on 2026-10-25 (S1). The `dev` project has the core schema, RLS, audit triggers, the heartbeat, and the seed accounts. `prod` does not exist yet (D-40). `sync_push` and `sync_pull` exist (S2: punches, report content, and photo records). The private Storage bucket `attachments` exists (D-49). Edge Functions come in S3 and S4.

| Project | Ref | URL |
|---|---|---|
| `ojt-dtr-dev` | `bclcgckflztfyxqaqvqt` | `https://bclcgckflztfyxqaqvqt.supabase.co` |

CAUTION: The same account has the project "RN22345's Project" (ref `pkfataaehrjdipdbrthz`) of a different app (KitaFix). Do not run SQL, migrations, or seed files on it.

## Commands

Run these commands in `system/backend/`. Copy `.env.example` to `.env` first.

| Task | Command |
|---|---|
| L2 tests against `dev` | `npm test` |
| Rate-limit test (TC-U-AUTH-04, by hand only, D-43) | `npm run test:ratelimit`. After it, logins from your IP address fail for 5 minutes. |
| Smoke test (runbook, procedure A) | `npm run smoke` |
| Apply the Auth settings of `config.toml` | `supabase config push --project-ref bclcgckflztfyxqaqvqt`. Answer "n" first to see the difference. The CLI is logged in. |

CAUTION: In `config.toml`, keep `[auth.email] enable_signup = true`. On a hosted project, `false` turns off email login for all users. `[auth] enable_signup = false` stops the sign-ups.

NOTE: A sign-out with the default (global) scope ends all sessions of that user. Tests that share a seed account must not run at the same time.

NOTE: The agent applied the migrations with the Supabase connector (`apply_migration`). Each local file name has the version that the connector recorded. Thus `supabase db push` sees them as applied.

NOTE: The sync tests use `ojt4` (facilitator `fac1`) and `ojt6` (facilitator `fac2`). Punches are append-only, so each run leaves about 25 test punches on `dev` (device ID `l2-test-device`). Do not use `ojt4` or `ojt6` for demonstrations.

NOTE: The seed needs the session setting `app.seed_password`. See the header of `supabase/seed.sql`.

## Folder map (files made in S1)

| Path | Contents |
|---|---|
| `supabase/config.toml` | CLI configuration. Auth values from QR-SE-03, QR-SE-04, D-22. |
| `supabase/migrations/20261025134548_core_schema.sql` | Tables, triggers, RLS, audit, heartbeat |
| `supabase/migrations/20261025134615_restrict_anon_functions.sql` | Removes anonymous EXECUTE grants |
| `supabase/migrations/20261026070655_sync_functions.sql` | `sync_push`, `sync_pull`, doubtful-time rule (S2) |
| `supabase/migrations/20261026071035_strict_time_format.sql` | ISO 8601 times only in `sync_push` (DEF-008) |
| `supabase/migrations/20261026080316_attachments_storage.sql` | Storage bucket `attachments` and its policies, photo records in `sync_push` (D-49) |
| `tests/sync.test.ts` | L2 tests: TC-CI-SYNC-01 to TC-CI-SYNC-04, TC-U-SRV-01, TC-CI-ACL-01 (sync and Data API part) |
| `tests/coverage-map.json`, `tests/coverage-map.test.ts` | Backend coverage (QR-MA-05, D-52): each function, policy, and `sync_push` cause code with the L2 tests that cover it. The test fails if the map misses an item of the migrations. When you add an item or a test, update the map. |
| `tests/files.test.ts` | L2 tests: TC-CI-FILE-01, TC-CI-ACL-01 (Storage part and attachment records). Files cannot be deleted, so each run leaves about 540 KB in the bucket. |
| `tests/acl-scope.test.ts` | L2 tests: TC-CI-ACL-01 (assignments and device records), TC-CI-ACL-02 (assignments part). Each run leaves one `devices` row of `ojt1`. |
| `tests/keepalive.test.ts` | L2 tests of `heartbeat` and `heartbeat_status` (keep-alive, TC-ST-Q-RE-05). Each run adds one heartbeat with the source `l2-test`. |
| `supabase/seed.sql` | Seed accounts, companies, batch, assignments (dev and local only) |
| `supabase/api-contract.md` | The API contract (D-23) |
| `supabase/auth-settings.md` | Auth settings for each project |
| `tests/helpers.ts`, `tests/auth.test.ts`, `tests/acl-admin.test.ts` | L2 tests: TC-CI-AUTH-01, TC-CI-ACL-03 |
| `tests/auth-account.test.ts` | L2 tests: TC-U-AUTH-01, TC-U-AUTH-02, TC-CI-AUTH-03 (logout and password change) |
| `tests-ratelimit/rate-limit.test.ts`, `vitest.ratelimit.config.ts` | TC-U-AUTH-04, separate suite (D-43) |
| `ops/smoke-test.mjs` | Smoke test: heartbeat, test login, server epoch |
| `vitest.config.ts`, `package.json`, `.env.example` | Test setup |
| `../../.github/workflows/ci.yml`, `keepalive.yml` | CI and keep-alive source A |
| `../../.github/workflows/backup.yml` | Encrypted own backup each Sunday, kept as private releases (runbook, section 6) |

## Stack

| Part | Choice |
|---|---|
| Platform | Supabase, Free plan (two projects: `ojt-dtr-dev`, `ojt-dtr-prod`) |
| Database | PostgreSQL with Row Level Security (RLS) |
| Server logic | PostgreSQL functions (PL/pgSQL) for sync and rules. Edge Functions (TypeScript, Deno) for work that needs secrets. |
| Authentication | Supabase Auth (email and password). Roles in the `profiles` table. |
| Files | Supabase Storage (private buckets) |
| Tools | Supabase CLI (migrations, deploys, type generation) |
| Tests | Vitest with supabase-js against `dev` (L2). pgTAP with `supabase test db` if the local stack is available. |
| API contract | `supabase/api-contract.md` (D-23) |

## Planned structure

```
system/backend/
  supabase/
    config.toml
    migrations/        one SQL file for each schema change, in time order
    functions/
      admin-users/     create, deactivate, reset password (needs the service role key)
      push-notify/     send FCM messages (called from a database trigger)
      export-csv/      CSV export for the admin
    seed.sql           test accounts and volume data (dev and local only)
    tests/             pgTAP tests (optional)
    api-contract.md    tables, RLS policies, RPC functions, Edge Functions
    auth-settings.md   Auth dashboard settings (for the rebuild procedure)
  tests/               Vitest + supabase-js tests: RLS access matrix, sync_push, sync_pull
  ops/
    smoke-test         heartbeat, test login, one sync_pull
    backup             manual encrypted backup
    restore-storage    upload storage files from a backup
  .env.example
../.github/workflows/
  ci.yml               lint and tests on each push
  keepalive.yml        heartbeat each day (runbook, section 3)
  backup.yml           encrypted backup each week (runbook, section 6)
```

## Rules

1. Make each schema change as a migration file. Do not change the schema in the dashboard only. The rebuild procedure needs all changes in git.
2. Turn on RLS for each table in `public`. A table without RLS is an S1 defect.
3. Write each RLS policy for one role and one action. Add a test for each policy in the access matrix (TC-CI-ACL-*).
4. The mobile app writes only through `sync_push` (offline sync design, section 4). Give mobile roles no direct `insert`, `update`, or `delete` grants on synced tables.
5. Store all times in UTC (`timestamptz`). Clients show Asia/Manila time.
6. Do not update or delete a punch. A correction makes a new punch (D-05).
7. `sync_push` applies each `op_id` one time only (FR-SYNC-05).
8. Write an audit entry for each event in FR-AUD-01 with a trigger. The API must not change or delete audit entries.
9. Put secrets only in Edge Function secrets and GitHub secrets. Never commit the service role key.
10. Update `api-contract.md` in the same commit as each change to a table, policy, or function.
11. After a change to the Auth settings, update `auth-settings.md`.
12. Generate the TypeScript types after each migration: `supabase gen types typescript`. Put them in the frontend `data/` folder.
