# AGENTS.md: system/frontend/

This folder will contain the Ionic Angular app. One codebase makes three builds: Android, iOS (optional, D-15), and the admin web app.

## Status

Created on 2026-10-25 (S1). The app has the Android platform, the layer 0 hours utilities, login with the platform check (D-38), route guards, and wireframe role shells (D-31). The starter tab pages were removed. The local database (SQLite on mobile, sql.js in tests), the local migrations (version 2), the outbox, the repositories, the sync engine, and the DTR service exist (S2). The OJT DTR page, the sync status bar, the "Sync issues" screen, and the logout CAUTION exist. `SyncSessionService` starts the sync after login. The facilitator "My OJTs" list and OJT DTR view exist. Photos exist: a selfie for each punch when the company requires it (FR-DTR-05, D-50), uploaded before the push (D-49).

NOTE: UI prototype (D-63). The OJT home, progress, reports, corrections, export, the facilitator overview and reviews, the profile, and the notifications use fake data from `data/mock/` (`MockStore`). The data stays in `localStorage` on the device and does not sync. The profile page has "Reset sample data". The facilitator now opens on the "Overview" tab.

NOTE: `environment.ts` has `faultInjection: true`. A dev build gives `window.ojtFaults.set({ drop, serverError })` for the device fault tests. `environment.prod.ts` has it false. `ng build` uses the production settings, so build with `--configuration development` for the fault tests. All Capacitor plugins of the functional requirements, section 13, are installed (TC-SI-PLUG-01 passes).

NOTE: Local reminders must use `isExactNotification: false` (D-44). Else `LocalNotifications.schedule` opens the Android "Alarms & reminders" screen and waits.

NOTE: On a cold emulator, geolocation has no position. Start a location request (for example, open the DTR page), then send `adb emu geo fix <lng> <lat>` while it waits. A fix sent before the request can be lost.

NOTE: Device test tools: `adb root` works on this AVD (for `date` and `settings put global auto_time`). In the dev build, `ng.getComponent(document.querySelector('app-dtr-page')).punch()` runs the real punch action through the DevTools protocol. Do not name a PowerShell function `Kill`: the `kill` alias wins.

NOTE: The emulator AVD has no front camera (`hw.camera.front=none`). The camera screen uses the emulated back camera. Its photos are small (about 20 KB). To test the compression of a large photo, bundle `shared/utils/jpeg-compress.ts` with esbuild and run it in the WebView through the DevTools protocol.

## How the app was made

1. `ionic start frontend tabs --type=angular-standalone --capacitor --package-id=ph.edu.plv.ojtdtr` (Ionic CLI 7.2.1).
2. `npm install @capacitor/android@8.5.3`, then `npx cap add android`.
3. `npm install -D @vitest/coverage-v8@5.0.5` for coverage (QR-MA-05).
4. `npm install` of the plugins in the versions table, then `npx cap sync android`. `npm install -D sql.js@1.15.1 @types/sql.js` for the local database tests.

NOTE: You need macOS and Xcode to build the iOS app. iOS is optional (D-15). Add iOS only if a Mac is available: `npx cap add ios`.

## Commands

Run these commands in `system/frontend/`.

| Task | Command |
|---|---|
| Unit tests (once) | `npx ng test --watch=false` |
| Unit tests with coverage | `npx ng test --watch=false --coverage` |
| Lint | `npx ng lint` |
| Web build | `npx ng build` |
| Copy the web build to Android | `npx cap sync android` |
| Debug APK | In `android/`: `gradlew.bat assembleDebug`. `JAVA_HOME` must be JDK 21 (D-36). |
| Start the emulator | `emulator -avd ojt_dtr_api35` (in the Android SDK `emulator/` folder) |
| Dev server | `npx ng serve --port 8100`, or the `frontend` entry in `.claude/launch.json` |
| Test the mobile screens in a browser | Set `platformOverride: 'mobile'` in `src/environments/environment.ts`. Do not commit the change. |

## Folder map (files made in S1)

| Path | Contents |
|---|---|
| `src/app/shared/utils/hours.ts` | Layer 0: work sessions and hours from punches, Asia/Manila dates and weeks |
| `src/app/shared/utils/hours.spec.ts` | TC-U-UTIL-01 to TC-U-UTIL-05 |
| `src/app/core/platform.service.ts` | Mobile or web platform (one place) |
| `src/app/core/supabase.client.ts` | The one Supabase client (`SUPABASE` token) |
| `src/app/core/auth/access.ts`, `access.spec.ts` | Role and platform access table. TC-U-AUTH-03. |
| `src/app/core/auth/auth.service.ts`, `auth.service.spec.ts` | Login, restore, logout, platform check. TC-CI-AUTH-02 (fake client). |
| `src/app/core/auth/auth.guards.ts` | `groupGuard`, `startGuard`, `loginGuard` |
| `src/app/core/auth/token-storage.ts`, `token-storage.spec.ts` | Secure storage on mobile, `sessionStorage` on web (D-42). Keeps the token expiry in device time (DEF-012). |
| `src/app/data/local-db/local-db.ts` | `LocalDb` adapter interface and SQL value helpers |
| `src/app/data/local-db/schema.ts`, `migrate.ts` | Local tables (offline sync design, section 2) and migrations with `PRAGMA user_version` |
| `src/app/data/local-db/capacitor-sqlite.db.ts`, `sqljs.db.ts` | Adapters: SQLite plugin on mobile, sql.js in tests |
| `src/app/data/local-db/local-db.service.ts` | Opens the local database once (`LOCAL_DB_OPENER` token) |
| `src/app/data/local-db/migrate.spec.ts` | TC-CI-DB-01 |
| `src/app/data/sync/outbox.ts` | Outbox: add, list, count, take, requeue, and finish operations |
| `src/app/data/sync/sync-engine.ts`, `sync-engine.spec.ts` | Push, pull, clock offset, epoch change (S2). TC-U-SYNC-02, 04, 05, 07. |
| `src/app/data/sync/sync.service.ts`, `sync.service.spec.ts` | Triggers, retry delays, connection state, unsynced count. TC-U-SYNC-03. |
| `src/app/data/sync/sync-transport.ts`, `sync-transport.spec.ts` | `sync_push` and `sync_pull` calls, error kinds, one refresh and resend after a 401 (offline sync design 13, DEF-012) |
| `src/app/data/sync/local-merge.ts`, `payloads.ts`, `sync-state.ts`, `sync-log.ts` | Pull merge rules, create payloads, cursor and device values, sync log |
| `src/app/data/sync/local-data.ts`, `local-data.spec.ts` | Clear local data with the unsynced check. TC-U-SYNC-06. |
| `src/app/data/repositories/device.repository.ts` | Device ID and clock offset for a new punch |
| `src/app/features/dtr/dtr.service.ts`, `dtr.service.spec.ts` | DTR rules: time-in, time-out, sessions, "Missing time-out". TC-U-DTR-01 to 04. |
| `src/app/core/http/fetch-wrapper.ts`, `fetch-wrapper.spec.ts` | Request timeout (O-5) and the fault injector of test builds (D-20) |
| `src/app/plugins/` | Wrappers: network, app lifecycle, geolocation, camera (selfie, compressed), files (app data folder) (frontend rule 5) |
| `src/app/shared/utils/jpeg-compress.ts`, `jpeg-compress.spec.ts` | Photo compression to 500 KB or less, canvas encoder, base64 helpers. TC-CI-FILE-01 (client part). |
| `src/app/data/repositories/attachment.repository.ts` | Photo files on the device, photo record and outbox operation (D-49) |
| `src/app/data/sync/file-upload.ts` | Upload of one photo file to Storage (offline sync design, section 10) |
| `src/app/shared/config/dtr-settings.ts` | DTR settings: "Missing time-out" hours, location wait (D-30, D-37, D-48) |
| `src/app/shared/utils/retry.ts` | Retry delays (offline sync design 6) |
| `src/app/data/repositories/profile.repository.ts` | Profile reads from the server and the local cache |
| `src/app/data/repositories/punch.repository.ts` | Punch save (record and outbox operation in one transaction) and reads |
| `src/app/data/repositories/repositories.spec.ts` | TC-CI-DB-02 |
| `src/app/shared/utils/uuid.ts` | Record IDs and ISO times |
| `eslint.config.js` | Lint rules: no import between feature folders (QR-MA-01), complexity 10 or less (QR-MA-04) |
| `src/app/features/auth/login.page.ts` | Login page |
| `src/app/shells/{ojt,facilitator,admin}.routes.ts` | Role shells: the tabs of each role. They are outside `features/`, because a shell puts features together (QR-MA-01). |
| `src/app/features/dtr/dtr.page.ts` | OJT DTR page: time-in, time-out, history by week and day with sync status, pull-to-refresh |
| `src/app/features/dtr/dtr-history.ts`, `dtr-history.spec.ts` | History by week and day (FR-DTR-07), summary for the facilitator list |
| `src/app/features/dtr/dtr-history.component.ts` | History list. The doubtful-time flag shows only for the facilitator (FR-DTR-11). |
| `src/app/features/dtr/my-ojts.page.ts`, `ojt-dtr.page.ts` | Facilitator: "My OJTs" list and the DTR of one OJT (FR-DTR-10, FR-DTR-11) |
| `src/app/data/repositories/assignment.repository.ts`, `assignment.repository.spec.ts` | Active OJTs of a facilitator from the local data |
| `src/app/features/sync/sync-issues.page.ts`, `sync-issue-text.ts`, `sync-issue-text.spec.ts` | "Sync issues" screen (FR-SYNC-06, DEF-009) |
| `src/app/data/repositories/sync-issue.repository.ts`, `sync-issue.repository.spec.ts` | Sync issue list, "Try again", "Discard my change" |
| `src/app/core/auth/logout.service.ts`, `logout.service.spec.ts` | Logout with the unsynced-changes check (FR-AUTH-05, QR-SF-01) |
| `src/app/core/sync-session.service.ts` | Starts and stops the sync with the login state |
| `src/app/shared/page-header/` | Page header: title, logout with the CAUTION, sync status bar |
| `src/app/shared/sync-status/` | Sync status bar (FR-SYNC-04, FR-SYNC-08) |
| `src/app/shared/utils/format.ts` | Time, date, and duration text (Asia/Manila) |
| `src/app/shared/strings.ts` | All UI text (D-31) |
| `src/app/shared/placeholder/` | Placeholder box and wireframe page (D-31) |
| `src/app/shared/shell/` | Tab shell and its route helper |
| `src/app/data/mock/mock-data.ts`, `mock-store.service.ts`, `mock-store.service.spec.ts` | UI prototype (D-63): fake data and the store with the rules of the reports, corrections, monitoring, and notifications. Replace with the real repositories in S3. |
| `src/app/shared/ui/` | Progress ring, bar chart, status badge, stat tile |
| `src/app/shared/strings-ui.ts`, `strings-ojt.ts`, `strings-fac.ts` | UI text of the prototype screens (shared, OJT, facilitator and profile and notifications) |
| `src/app/features/monitoring/` | OJT home and progress (FR-MON-01). Facilitator overview and OJT overview (FR-MON-02). |
| `src/app/features/reports/` | OJT weekly report list and editor (FR-RPT-01 to 08, FR-EXP-02) |
| `src/app/features/corrections/` | OJT correction request list and form (FR-COR-01, FR-COR-03) |
| `src/app/features/export/` | OJT DTR export (FR-EXP-01, prototype: no PDF file yet) |
| `src/app/features/reviews/` | Facilitator review list, report review, correction review (FR-RPT-05, FR-RPT-07, FR-COR-02) |
| `src/app/features/profile/`, `notifications/` | Profile and password change (FR-PROF-01, 02, FR-AUTH-06). Notification list (FR-NOTI-05). The page header opens them. |
| `src/environments/` | Supabase URL and publishable key. `environment.prod.ts` points to `dev` until `prod` exists (D-40). |
| `android/` | Capacitor Android project (Gradle 8.14.3, Android Gradle plugin 8.13.0, minSdk 24, targetSdk 36) |

## Planned structure

```
system/frontend/src/app/
  core/            auth, route guards, Supabase client, network service, platform service, config
  data/
    local-db/      SQLite adapter, local schema, local migrations
    repositories/  one repository for each entity (the only path to data)
    sync/          outbox, sync engine, sync status store
  plugins/         wrapper services for Capacitor plugins (camera, geolocation, notifications, files)
  shared/          shared components (status chip, hours card, offline banner), pipes, utilities
  features/
    auth/  profile/  dtr/  corrections/  reports/  monitoring/  notifications/  export/   (mobile)
    admin/  users/  companies/  batches/  assignments/  dashboard/  audit/              (web)
  app.routes.ts
```

## Rules

1. Use standalone components only. Do not create NgModules.
2. Lazy-load each feature with `loadComponent` or `loadChildren` routes.
3. A page or component must not call supabase-js directly. Use a repository.
4. Each write from a mobile feature goes through a repository to the local database and the outbox. See `docs/03-architecture/offline-sync-design.md`.
5. Call Capacitor plugins only through the wrapper services in `plugins/`. This lets unit tests replace the plugins with fakes.
6. Do not import one feature folder from another feature folder. Use `core/`, `data/`, or `shared/`.
7. Use route guards for role and platform access. The server also enforces access (see `QR-SE-01`).
8. Store tokens with a secure storage plugin. Do not store tokens in `localStorage`.
9. Use TypeScript strict mode.
10. Put a test file next to each service. The test file name ends with `.spec.ts`.
11. Make one Supabase client in `core/`. In test builds, give it the fetch wrapper of the fault injector (D-20).
12. Do not sign out for a network error, a timeout, or a 5xx error. Sign out only when Supabase Auth rejects the refresh token (QR-RE-08).
13. Build screens as wireframes with placeholders (D-31). Use one shared placeholder component for each missing asset (for example, a box with the text "LOGO"). Keep all text, colors, and assets in replaceable theme, string, and asset files. Do not put them in pages.
14. Isolate rules that can change (time-in verification, DTR export layout, facilitator-company relation) behind a service or setting (D-30).

## Versions

Recorded on 2026-10-25 and 2026-10-26. Update this table when a version changes.

| Package | Version |
|---|---|
| @angular/core | 22.2.3 |
| @ionic/angular | 9.0.9 |
| @capacitor/core, @capacitor/android, @capacitor/cli | 8.5.3 |
| typescript | 6.0.3 |
| vitest | 5.0.5 |
| @capacitor-community/sqlite | 8.1.1 |
| @supabase/supabase-js | 2.118.0 |
| @aparajita/capacitor-secure-storage | 8.0.1 |
| @capacitor/network | 8.0.1 |
| @capacitor/geolocation | 8.2.4 |
| @capacitor/camera | 8.2.6 |
| @capacitor/local-notifications | 8.3.1 |
| @capacitor/push-notifications | 8.1.3 |
| @capacitor/filesystem | 8.1.5 |
| @capacitor/share | 8.0.3 |
| sql.js (dev, tests only) | 1.15.1 |
