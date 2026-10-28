# Free-tier operations runbook

This document gives the procedures that keep the Supabase Free plan backend available. It also gives the procedures that recover the system when the backend stops.

The protection has three layers:

1. **Layer 1: Prevention.** Keep the projects active, so that Supabase does not pause them.
2. **Layer 2: Tolerance.** If the backend stops, the apps continue to operate and lose no data.
3. **Layer 3: Recovery.** Resume the project, or rebuild it from git and from our own backups.

## 1. Free plan limits and their effects

Source: Supabase pricing page and the project pausing guide, examined on 2026-10-21.

| Limit | Value | Effect on this project | Control |
|---|---|---|---|
| Pause for low activity | After 7 days without enough database activity | The backend stops. Sync and login fail. | Layers 1, 2, and 3 |
| Restore window of a paused project | The guide gives two values: 90 days and 1 year | After the window, a resume can be impossible. | Plan for 90 days. Keep own backups (section 6). |
| Automatic backups | Not included | A lost project means lost data. | Weekly own backup (section 6) |
| Database size | 500 MB for each project | Enough for one term (data model estimate: below 150 MB) | Examine the size each week (section 7) |
| File storage | 1 GB | Selfie photos can fill it. | Photos 500 KB or less (QR-PE-05). Selfie is off by default. Delete selfies after 60 days. |
| Egress | 5 GB, plus 5 GB cached | Photo downloads use egress. | The facilitator app loads small thumbnails. The app caches photos. |
| Active free projects | 2 | One `dev` project and one `prod` project only | Tests that need a third project use the local stack (Supabase CLI and Docker) |
| Log retention | 1 day | Server logs disappear quickly. | Keep own records: `audit_logs`, `ops.heartbeat`, the app sync log |
| Edge Function calls | 500,000 | Enough | None |
| Monthly active users | 50,000 | Enough | None |
| Default email service | Low limits, for tests only | Password emails can fail. | Do not depend on email. The admin makes accounts and resets passwords (FR-AUTH-07). |
| Database direct connection | IPv6 only on the Free plan | Tools on IPv4 networks (for example, GitHub runners) cannot connect directly. | Use the session pooler connection string for backups |

NOTE: The Free plan terms can change. At the start of each stage, examine the Supabase pricing page. Record changes in the decision log.

## 2. Projects

| Project | Ref | Region | Purpose | Keep-alive |
|---|---|---|---|---|
| `ojt-dtr-dev` | `bclcgckflztfyxqaqvqt` | Southeast Asia (Singapore) | Development, L2 to L4 tests, drills | Yes |
| `ojt-dtr-prod` | Not created | Southeast Asia (Singapore) | Demonstration and user acceptance test | Yes |

The projects are in the same account and organization as the project of a different app (KitaFix). The Free plan allows two active projects. Make `prod` before the S5 entry. Then pause one project: KitaFix if its team does not need it, else `dev` after the S4 gate (D-40).

CAUTION: Before you pause the KitaFix project, ask its team. Do not change its data. A paused project can be restored with one click for 90 days only.

## 3. Layer 1: Prevention

Supabase counts API calls and requests from apps as activity. Real usage during the build stages also counts. Do not depend on real usage alone. Use four sources of activity.

### 3.1 Heartbeat function

The database has a function `ops.heartbeat(source text, secret text)`. Each call does these steps:

1. It compares the secret with the value in `ops.settings`. If the secret is wrong, it stops.
2. It writes one row (source, time) to the table `ops.heartbeat`.
3. It deletes rows older than 30 days.

This makes a real database write. The admin dashboard shows the newest heartbeat of each source.

### 3.2 The four sources

| # | Source | Frequency | How it fails | Alarm |
|---|---|---|---|---|
| A | GitHub Actions workflow `keepalive.yml` | Each day, 09:17 Manila time | GitHub can delay scheduled runs. GitHub disables scheduled workflows in a public repository after 60 days without repository activity. | GitHub sends an email when a run fails |
| B | External free cron service (for example, cron-job.org) | Each day, 21:17 Manila time | The service can stop or change its terms | The service sends an email when a call fails |
| C | Human routine: the developer opens the admin web app and the mobile app, and does one sync | Two times each week (Monday and Thursday) | The developer forgets | Calendar reminder |
| D | Supabase warning email before a pause | When activity is low | Email goes to an inbox that nobody reads | Use an inbox that you read each day |

NOTE: Source C is "two times each week", not "one time in two weeks". The pause occurs after 7 days. A check every two weeks is too late.

NOTE: Source B must support custom HTTP headers. The call needs the `apikey` header.

### 3.3 Procedure: set up the keep-alive (stage S1)

1. Create the `ops` schema, the `ops.heartbeat` table, and the `ops.heartbeat` function with a migration.
2. Put the keep-alive secret in `ops.settings` for each project.
3. Put the project URLs, the anon keys, and the keep-alive secret in GitHub repository secrets.
4. Add the workflow `.github/workflows/keepalive.yml`. It calls the function for `dev` and for `prod`.
5. Run the workflow manually one time. Make sure that two new heartbeat rows exist.
6. Set up source B with a different time of day.
7. Add the calendar reminders for source C.
8. Set the Supabase account email to an inbox that you read each day.

### 3.4 Source B settings (cron-job.org)

Make one job for each active project. The person who owns the project account makes the cron-job.org account. Do not put the keep-alive secret in a tracked file. Copy it from `system/backend/.env` (`KEEPALIVE_SECRET`).

| Setting | Value |
|---|---|
| Title | `ojt-dtr-<project> heartbeat` (for example `ojt-dtr-dev heartbeat`) |
| URL | `https://<project ref>.supabase.co/rest/v1/rpc/heartbeat` |
| Schedule | Each day at 21:17, time zone Asia/Manila |
| Request method | `POST` |
| Header 1 | `apikey`: the publishable key of the project |
| Header 2 | `Content-Type`: `application/json` |
| Request body | `{"source":"cronjob","secret":"<KEEPALIVE_SECRET>"}` |
| Notifications | Send an email when an execution fails. Send an email when the job is disabled because of too many failures. |
| Save responses | On (the response body is the heartbeat time) |

A good call returns HTTP 200 with a time in the body. A wrong secret returns HTTP 403 and writes no row.

To make sure that source B operates, run this SQL on the project (or see the admin dashboard): `select * from public.heartbeat_status();`. The row `cronjob` must show a time of less than 25 hours ago.

NOTE: The keep-alive secret lets a caller write heartbeat rows only. It gives no access to other data. If the secret leaks, make a new one in `ops.settings` and update sources A and B.

## 4. Layer 2: Tolerance

A paused project is the same as network condition N6 (network up, server down). The offline-first design already protects the data. These rules are mandatory:

1. The mobile app keeps all changes in the outbox while the server is not reachable.
2. The mobile app shows "Server not reachable". This message is different from "No network" (FR-SYNC-08).
3. The mobile app keeps the session for a network error, a timeout, a 5xx error, or an unknown response. It does not sign out. It signs out only when Supabase Auth rejects the refresh token as invalid (QR-RE-08).
4. The sync engine uses the retry delays of the offline sync design, section 6.
5. The mobile app shows a warning when a change is unsynced for 72 hours (QR-SF-04).
6. The admin web app shows a "Service not available" page with the time of the last good contact. It keeps the data of an open form in memory.

## 5. Layer 3: Recovery

### 5.1 Procedure A: resume a paused project (target: 30 minutes or less)

1. Log in to the Supabase dashboard.
2. Select the organization and the paused project.
3. Click **Resume project**. Confirm.
4. Wait until the project status is healthy.
5. Run the smoke test script `system/backend/ops/smoke-test`. It calls the heartbeat, logs in a test user, and does one `sync_pull`.
6. Open the mobile app on one device. Do pull-to-refresh. Make sure that the outbox count goes to zero.
7. Find the cause of the pause. Examine the `ops.heartbeat` table and the GitHub workflow runs. Repair the failed source.
8. Record the event in `PROGRESS.md` and in the defect log. A pause of `prod` is an S1 defect.

### 5.2 Procedure B: rebuild the backend (target: 2 hours or less)

Use this procedure if you cannot resume the project, or if the project is lost.

1. Create a new Supabase project in the Southeast Asia (Singapore) region.
2. Link the Supabase CLI: `supabase link --project-ref <new-ref>`.
3. Apply the schema from git: `supabase db push`.
4. Restore the data from the newest backup (section 6.3).
5. Restore the storage files from the newest backup.
6. Set the Edge Function secrets with `supabase secrets set`. Deploy the Edge Functions with `supabase functions deploy`.
7. Set the Auth settings from `system/backend/supabase/auth-settings.md`.
8. Set a new server epoch: `update ops.server_meta set epoch = gen_random_uuid();`.
9. Put the new project URL and anon key in the environment files. Build the admin web app and the APK again. Give the new APK to the users.
10. Put the new URL and key in the keep-alive sources A and B.
11. Run the smoke test.
12. Tell the users to open the new app and log in. Each app finds the new epoch. Then it sends its local records of the last 30 days again (offline sync design, section 12).
13. Record the event in `PROGRESS.md`.

CAUTION: The session tokens of the old project do not work on the new project. All users must log in again.

## 6. Own backups

The Free plan does not include automatic backups. The project makes its own backups.

### 6.1 Schedule

| Backup | When | Tool |
|---|---|---|
| Automatic | Each Sunday, 02:17 Manila time | GitHub Actions workflow `backup.yml` |
| Manual | Before each stage gate and before each demonstration | `system/backend/ops/backup` script |

### 6.2 Contents

1. Roles, schema, and data of the `public`, `ops`, and `auth` schemas (`supabase db dump`).
2. All files in the storage buckets.
3. The Git commit ID of the migrations.

CAUTION: The backup contains personal data and password hashes. Encrypt the archive. Do not put it in a public repository or a public folder.

1. Encrypt the archive with a passphrase from the GitHub secrets.
2. Put the archive in a private location: a private repository release, or the private Google Drive of the developer.
3. Keep the newest 8 backups. Delete older backups.

The workflow `backup.yml` does steps 1 to 3. It puts each archive in a pre-release with the tag `backup-ojt-dtr-<project>-<UTC date and time>` in the private repository `RN22345/ojt-dtr`. It needs the GitHub secrets `DB_URL_<PROJECT>` (session pooler connection string) and `BACKUP_PASSPHRASE`. Storage files are not in the archive until the first bucket exists (S2).

CAUTION: Keep `BACKUP_PASSPHRASE` in a password manager also. GitHub does not show a secret again. Without the passphrase, no backup can be restored.

### 6.3 Restore

1. Decrypt the archive: `gpg -d -o backup.tar.gz <name>.tar.gz.gpg`, then `tar -xzf backup.tar.gz`. The archive has `roles.sql`, `schema.sql`, `data.sql`, and `meta.txt`.
2. Restore the data with `psql` and the session pooler connection string of the target project.
3. Upload the storage files with the `system/backend/ops/restore-storage` script.
4. Run the smoke test.

Do the restore test one time before the S4 gate (TC-ST-Q-RE-04). Use the local stack or the `dev` project.

## 7. Routine checklist (source C, two times each week)

1. Open the admin web app. Examine the newest heartbeat of sources A and B. Each must be less than 48 hours old.
2. Open the mobile app on one device. Do one sync.
3. Examine the newest GitHub `backup.yml` run. It must be less than 8 days old.
4. One time each week, examine the database size and the storage size in the Supabase dashboard. Compare them with section 1.
5. Make one commit in the repository at least one time each month. This keeps the scheduled workflows active.
6. If a check fails, do the related procedure in section 5. Record the result in `PROGRESS.md`.

## 8. Demonstration days

1. One day before the demonstration, run the smoke test on `prod`.
2. Do a manual backup.
3. On the day, open the admin web app and the mobile app before the demonstration starts.

## 9. End of the project

1. Keep all keep-alive sources on until the teacher confirms the final grade.
2. Then do a final backup.
3. Then decide: keep the project active, or let it pause. Record the decision in the decision log.
