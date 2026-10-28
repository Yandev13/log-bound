# Readiness check and stage plan

This document gives the prerequisites for the build, their status, and the stage plan. A new agent session must read it before S1 work. The status is from 2026-10-25 (second check, after the S0 gate).

Related decisions: D-29 (due date 2026-11-21), D-30 (design for change), D-31 (wireframe UI with placeholders), D-32 (plan as solo), D-33 to D-39 (S0 gate and S1 start).

## 1. Prerequisites

### 1.1 Met

| Item | Note |
|---|---|
| Project documents | Requirements, architecture, data model, offline sync design, test plan, test cases, and runbook are written. |
| Open questions | Q-01 to Q-08 have answers or accepted defaults (charter, section 7). |
| S0 gate | Passed on 2026-10-25. See `docs/05-testing/reports/S0-test-report.md`. |
| TC-ST-REV-03 waiver | D-33 |
| UI-01 conflicts | The requirements are the source. The Figma file is a reference only (D-34). |
| Tools | Node 24, npm, Ionic CLI 7.2.1, git 2.55, Supabase CLI 2.122.0, GitHub CLI 2.103.2, Java 17, 21, and 22 (`JAVA_HOME` = JDK 21), Android SDK (platforms 33 to 37, build-tools, platform-tools, emulator, command-line tools), adb (D-36). |
| Android emulator | AVD `ojt_dtr_api35` (Pixel 6, Android 15, x86_64). WHPX acceleration works. It boots in about 35 seconds. |
| Toolchain check (R-06) | The debug APK builds with JDK 21 and Gradle 8.14.3. It installs and opens on the emulator. |
| Git repository and GitHub | Repository at the project root, branch `main`. Remote: private repository `RN22345/ojt-dtr`. `gh` is logged in. The `dev` secrets are GitHub secrets. |
| Supabase `dev` project | `ojt-dtr-dev` (ref `bclcgckflztfyxqaqvqt`, Singapore) in the same account as KitaFix (D-40). Core schema, RLS, seed accounts, heartbeat. |
| Supabase connector | It works in the agent session. |

### 1.2 Not met

| # | Item | Note | Owner |
|---|---|---|---|
| 4 | Supabase `prod` project | Make it before the S5 entry. Then pause KitaFix or `dev` (D-40). | Agent, user decides which to pause |
| 4a | Supabase CLI login | Done on 2026-10-25. The Auth settings are on `dev`. | Closed |
| 4b | `dev` database password | The connector made the project. Nobody has its database password. Reset it in the dashboard (Project Settings, Database) and give the session pooler connection string as the GitHub secret `DB_URL_DEV`. The weekly backup (runbook, section 6) needs it. | User |
| 6 | Docker | Not installed. It needs WSL and administrator rights. Only needed for a local Supabase stack and pgTAP. Without it, tests run against `dev` (D-21). | Optional |
| 8 | Android phone | The emulator is ready. A phone with USB debugging is still necessary for the reference measures (quality requirements, section 2). A second device (phone or emulator) is necessary for two-user sync tests. | User |
| 10 | Push notifications | An FCM (Firebase) project is necessary. Needed in S4 only. | User |
| 11 | Keep-alive and backup secrets | A backup encryption key and an external pinger. Secrets go in GitHub secrets, never in files (AGENTS.md, rule 8). Set up in S1, after items 4 and 7. | Agent and user |
| 12 | Admin web host | A free static host. | User |
| 13 | Mermaid CLI (`mmdc`) | Only for the document diagrams. Not necessary for the app. | Optional |

## 2. Stage plan

The stage tests and gates are in `docs/05-testing/test-plan.md`, section 8.

| Stage | Dates | Delivers | Gate |
|---|---|---|---|
| S0 | to 2026-10-27 | Review the documents. Close the items in section 1.2. | Reviews pass. The user accepts the plan. |
| S1 Foundation | 2026-10-28 to 2026-11-03 | Git, CI, Supabase schema + RLS + seed, auth, role shells with placeholder screens, SQLite adapter, plugin test builds, keep-alive, backup | Login works for each role on Android and on the web |
| S2 Offline core | 2026-11-04 to 2026-11-10 | Outbox, sync engine, `sync_push`, `sync_pull`, DTR, sync status screens | Offline DTR with zero data loss |
| S3 Reports and admin web | 2026-11-11 to 2026-11-14 | Weekly reports, corrections, facilitator views, admin web CRUD | Full report cycle across two devices |
| S4 Completion | 2026-11-15 to 2026-11-18 | Monitoring, PDF and CSV export, reminders, push, audit view, quality tests, drills | Each quality requirement measured |
| S5 Release | 2026-11-19 to 2026-11-21 | Regression, acceptance tests, production deploy, release APK, manuals | Release criteria |

The first working draft (D-32) is the end of S2: login, offline DTR, and sync, with wireframe screens.

## 3. Schedule risk and cut list

The user accepted the S3 to S5 compression and noted the risk. If a gate is at risk, cut in this order. All items are "Should" or "Could". Do not cut a "Must".

1. Push notifications (FR-NOTI-03, FR-NOTI-04).
2. Notification list (FR-NOTI-05).
3. CSV import of accounts (FR-ADM-05).
4. Report photo attachments (FR-RPT-03).
5. Audit log view (FR-AUD-02).
6. iOS build (D-15).

Record each cut in the decision log.

## 4. Next steps

1. The user resets the `dev` database password (item 4b). Then the agent adds the backup workflow.
2. Continue S1: SQLite adapter, plugin test builds, keep-alive sources B and C, the S1 gate.
