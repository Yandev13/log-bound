# Test case register

This document lists the test cases of the OJT-DTR system. The test levels and the stage gates are in `test-plan.md`. Section 8 gives the traceability from each requirement to its test cases.

## 1. Test case template

Use this template when you write the full steps of a test case. Put full test cases in the automated test code or in the stage report.

| Field | Content |
|---|---|
| ID | `TC-<LEVEL>-<MODULE>-NN` |
| Title | Short statement of the behavior under test |
| Requirements | FR and QR IDs |
| Level and stage | Example: L3, S2 |
| Network condition | N1 to N7 (test plan, section 6) |
| Preconditions | Data, accounts, device state |
| Steps | Numbered steps. One action in each step. |
| Expected result | Measurable result for each step that has a check |
| Actual result | Filled in during the test |
| Status | Pass, Fail, Blocked, Not run |
| Defect | DEF-NNN, if the test fails |

### 1.1 Example of a full test case

| Field | Content |
|---|---|
| ID | TC-SI-SYNC-02 |
| Title | Network faults do not cause data loss or duplicates |
| Requirements | QR-RE-03, FR-SYNC-01, FR-SYNC-05 |
| Level and stage | L3, S2 |
| Network condition | N3, N4, N6 |
| Preconditions | Test build with the fault injector on: 30% dropped requests, 10% error 500. Project `dev`. Account `ojt1`. Empty outbox. |
| Steps | 1. Run the test script that makes 200 punches (100 time-in and time-out pairs) on the device, with random network on and off. 2. Turn off the fault injector. 3. Let the app sync until the outbox is empty. 4. Count the punches of `ojt1` on the server. 5. Search for duplicate punch IDs and duplicate `op_id` values. |
| Expected result | Step 3: the outbox count is 0 and no record has status `issue`. Step 4: the count is exactly 200. Step 5: zero duplicates. |

## 2. Level 1: Unit tests (U)

| ID | Stage | Requirements | Title | Expected result |
|---|---|---|---|---|
| TC-U-UTIL-01 | S1 | FR-DTR-06, QR-FS-02 | Hours of one work session | 08:00 to 17:00 gives 540 minutes. |
| TC-U-UTIL-02 | S1 | FR-DTR-06, QR-FS-02 | Hours of more than one work session in a day | 08:00-12:00 and 13:00-17:00 gives 480 minutes. |
| TC-U-UTIL-03 | S1 | FR-DTR-06, QR-FS-02 | Work session across midnight | 22:00 to 02:00 gives 240 minutes. The hours count on the date of the time-in. |
| TC-U-UTIL-04 | S1 | FR-DTR-06, FR-RPT-02 | Week limits in Asia/Manila time | A punch at Sunday 23:30 Manila time is in that week. A punch at Monday 00:10 is in the next week. |
| TC-U-UTIL-05 | S1 | FR-DTR-06, FR-COR-03, QR-FS-02 | Hours with a corrected punch | The calculation uses the new punch and ignores the punch that it corrects. |
| TC-U-AUTH-01 | S1 | QR-SE-04 | Password rules | A password shorter than 8 characters is rejected. A correct password signs in. A wrong password does not sign in. |
| TC-U-AUTH-02 | S1 | QR-SE-03 | Token settings | The JWT expiry is 900 seconds or less. Refresh token rotation and reuse detection are on. `auth-settings.md` agrees with the dashboard. |
| TC-U-AUTH-03 | S1 | FR-AUTH-02, FR-AUTH-03 | Client route guards | Each role and platform pair opens only the routes in the access table (system modules, section 6). |
| TC-U-AUTH-04 | S1 | QR-SE-08 | Login rate limit | A burst of failed logins from one client gets HTTP 429. The app shows a wait message. |
| TC-U-DTR-01 | S2 | FR-DTR-01, FR-DTR-08 | Time-in with an open session | The service rejects the second time-in and gives the cause. |
| TC-U-DTR-02 | S2 | FR-DTR-02 | Time-out without an open session | The service rejects the time-out and gives the cause. |
| TC-U-DTR-03 | S2 | FR-DTR-09 | Missing time-out | A session open 16 hours after its time-in gets the "Missing time-out" mark. A session from 22:00 to 02:00 does not get the mark (D-37). |
| TC-U-DTR-04 | S2 | FR-DTR-03, FR-DTR-04, QR-SF-05 | Punch data and denied location permission | With permission: the punch has the device time, time zone, device ID, location, and accuracy. Without permission: the punch is saved with a "no location" flag. |
| TC-U-SYNC-01 | S2 | FR-SYNC-01 | Local save makes an outbox operation | The record has status `pending`. One outbox operation exists with a unique `op_id`. |
| TC-U-SYNC-02 | S2 | FR-SYNC-01, FR-SYNC-06 | Results of a push | `applied` and `duplicate` remove the operation and set `synced`. `rejected` and `conflict` set `issue` and keep the operation. |
| TC-U-SYNC-03 | S2 | FR-SYNC-02 | Retry delays | Delays are 5 s, 15 s, 60 s, then 300 s. A network-online event resets the delay. |
| TC-U-SYNC-04 | S2 | FR-SYNC-02 | One sync at a time | Three triggers during one sync cause one more sync only. |
| TC-U-SYNC-05 | S2 | FR-SYNC-07 | Pull merge rules | A local `pending` record stays. A local `synced` record changes to the server copy. A tombstone removes the local record. |
| TC-U-SYNC-06 | S2 | QR-SF-03, QR-SF-01 | No delete of unsynced records | The "clear data" and "logout" services do not delete `pending` or `issue` records without the confirmation flag. |
| TC-U-SYNC-07 | S2 | FR-DTR-11 | Clock offset | After a sync, the app stores `server_time - device_time`. The next punch has this offset. |
| TC-U-SRV-01 | S2 | FR-DTR-11 | Server doubtful-time rules | Each of the three conditions in the offline sync design, section 8, sets `doubtful_time`. Normal punches do not get the flag. |
| TC-U-RPT-01 | S3 | FR-RPT-04, FR-RPT-05, FR-RPT-06 | Report status machine | Permitted: draft to submitted, submitted to approved, submitted to returned, returned to submitted. Content changes only in `draft` or `returned`. All other changes are rejected. |
| TC-U-RPT-02 | S3 | FR-RPT-02 | Report hours | The report shows the logged hours of its week from the DTR. |
| TC-U-COR-01 | S3 | FR-COR-03 | Approved correction | Approval makes a new punch with `corrects_punch_id`. The original punch does not change. |
| TC-U-MON-01 | S4 | FR-MON-01 | Progress calculation | Logged, approved, and remaining hours and the percent are correct for the test data. Approved hours include only approved weeks (A-06). |

## 3. Level 2: Component integration tests (CI)

| ID | Stage | Requirements | Title | Expected result |
|---|---|---|---|---|
| TC-CI-DB-01 | S1 | FR-SYNC-01, QR-FL-04 | Local migrations | The migrations make all local tables on an empty database. A second run makes no change and no error. The in-memory adapter passes the same repository tests. |
| TC-CI-DB-02 | S1 | FR-SYNC-01, FR-AUTH-04 | Repository with the SQLite adapter | A saved record reads back with the same data. The outbox row exists. The stored profile reads back. |
| TC-CI-AUTH-01 | S1 | FR-AUTH-01, QR-SE-03 | Login and refresh endpoints | Valid login gives tokens. A wrong password is rejected. Refresh gives a new pair. An old used refresh token (older than the parent of the active token) is rejected after the 10-second reuse interval. The parent of the active token gives the active session (D-41). |
| TC-CI-AUTH-02 | S1 | FR-AUTH-03 | Platform restriction | After an admin login in the mobile client, the client signs out at once, shows a message, and stores no data. An OJT or facilitator login in the web client gives the same result (D-38). |
| TC-CI-AUTH-03 | S1 | FR-AUTH-05, FR-AUTH-06, FR-AUTH-07 | Logout, password change, and password reset | Logout revokes the refresh token. Password change needs the old password. Admin reset makes the old password invalid. |
| TC-CI-ACL-01 | S2 | QR-SE-01 | OJT data scope | `ojt1` cannot read or write data of `ojt6` through the Data API, Storage, or sync, also with forged IDs. The result is an error or zero rows. |
| TC-CI-ACL-02 | S3 | QR-SE-01, FR-DTR-10 | Facilitator data scope | `fac1` reads only `ojt1` to `ojt5`. After the admin moves `ojt5` to `fac2`, `fac1` cannot read `ojt5`. |
| TC-CI-ACL-03 | S1 | QR-SE-01 | Admin endpoints | With OJT and facilitator tokens, these calls fail: writes to `companies`, `batches`, and `ojt_assignments`; reads of `audit_logs`; the `admin-users` and `export-csv` Edge Functions. |
| TC-CI-SYNC-01 | S2 | FR-SYNC-05, FR-DTR-03 | Idempotent push | The first push gives `applied`. The same `op_id` again gives `duplicate`. Only one row exists. The row has `server_received_at`. |
| TC-CI-SYNC-02 | S2 | FR-SYNC-06 | Version conflict | A push with an old `base_version` gives `conflict`. The server record does not change. |
| TC-CI-SYNC-03 | S2 | FR-SYNC-07 | Pull scope and pages | The pull returns only records in the scope of the user. `has_more` and the cursor return all records with no gaps. Tombstones are included. |
| TC-CI-SYNC-04 | S2 | FR-SYNC-06, QR-SE-05 | Invalid payload | A push with invalid data gives `rejected` with a cause code. No row is written. |
| TC-CI-FILE-01 | S2 | QR-PE-05, FR-RPT-03, FR-DTR-05 | Photo upload | A photo of 500 KB or less is accepted. A larger file is rejected. The client compression makes a 4 MB camera photo 500 KB or less. |
| TC-CI-RPT-01 | S3 | FR-RPT-07, FR-AUD-01, FR-RPT-08 | Approval approves the week | After approval, all punches of that week have `approved = true`. An audit entry and a report event exist. |
| TC-CI-RPT-02 | S3 | FR-RPT-05, FR-COR-02 | First decision wins | A second decision on the same report or correction gives `conflict`. |
| TC-CI-ADM-01 | S3 | FR-ADM-01, FR-ADM-02, FR-ADM-03, FR-ADM-04, FR-ADM-06 | Admin data endpoints | Create, change, and deactivate work with validation. An OJT can have only one active assignment. Company settings save. |
| TC-CI-ADM-02 | S4 | FR-ADM-05 | CSV user import | Valid rows make users. Invalid rows are listed with the cause. No partial user is made. |
| TC-CI-AUD-01 | S3 | FR-AUD-01, QR-SE-07 | Audit entries | Each event type in FR-AUD-01 makes one entry with actor, action, and before and after data. No policy or function lets a user change or delete an entry. |
| TC-CI-EXP-01 | S4 | FR-EXP-01, FR-EXP-02, QR-CO-03 | PDF output | The DTR PDF has one row for each day and correct totals. The report PDF has all sections. Both open in a standard PDF reader. |
| TC-CI-EXP-02 | S4 | FR-EXP-03, QR-CO-03 | CSV output | The CSV is UTF-8 with a header row. It opens in Excel and Google Sheets with correct columns. |

## 4. Level 3: Subsystem integration tests (SI)

| ID | Stage | Network | Requirements | Title | Expected result |
|---|---|---|---|---|---|
| TC-SI-AUTH-01 | S1 | N1 | FR-AUTH-01, FR-AUTH-02 | Login for each role on its platform | OJT and facilitator log in on the Android app. Admin logs in on the web app. Each sees only the modules of the role. |
| TC-SI-AUTH-02 | S2 | N2, N7 | FR-AUTH-04, FR-PROF-01 | Offline open and expired session | After one online login, the app opens offline and shows the profile. With an expired refresh token, the app asks for login. The outbox stays and syncs after login. |
| TC-SI-PLUG-01 | S1 | N1 | QR-FL-01 | Plugin smoke test | Each plugin in the functional requirements, section 13, builds and runs one call on the Android device. |
| TC-SI-SYNC-01 | S2 | N1, N3 | FR-SYNC-01, FR-SYNC-02, FR-SYNC-07 | End-to-end sync | A punch made on the device appears on the server. A server change appears on the device after the next sync. |
| TC-SI-SYNC-02 | S2 | N3, N4, N6 | QR-RE-03, FR-SYNC-05 | Network fault test | See the full test case in section 1.1. |
| TC-SI-SYNC-03 | S2 | N4 | QR-RE-04 | App stop during sync | Stop the app during a sync 10 times. After each restart, the sync finishes. Zero loss. Zero duplicates. |
| TC-SI-SYNC-04 | S2 | N1 | QR-SE-01 | Other user on the same device | `ojt2` logs in on the device of `ojt1`. The app does not send the outbox of `ojt1` under `ojt2`. |
| TC-SI-SYNC-05 | S2 | N2, N3 | FR-DTR-11, QR-SF-02 | Device clock change | Change the device clock by 2 hours while offline. Make a punch. Sync. The facilitator sees the doubtful-time flag. |
| TC-SI-SYNC-06 | S2 | N6 | FR-SYNC-08, QR-RE-08, QR-SF-03 | Backend not reachable | Fault injector at 100% for a simulated 24 hours (short test clock) while the OJT makes punches. The app shows "Server not reachable", keeps the session, and keeps all changes. After the injector is off, all changes sync. Zero forced sign-outs. |
| TC-SI-SYNC-07 | S2 | N1 | QR-RE-07 | Server epoch change | Set a new epoch on the local stack or `dev`. The app resets the cursor and sends its records of the last 30 days again. The server gives `duplicate` for existing records. Zero duplicates on the server. |
| TC-SI-FILE-01 | S2 | N2, N3 | FR-DTR-05, FR-RPT-03 | Offline photo | A photo taken offline uploads before its operation. The server record refers to the file. |
| TC-SI-RPT-01 | S3 | N1, N2, N3 | FR-RPT-01 to FR-RPT-08 | Two-device report cycle | OJT writes a draft offline, submits, facilitator returns with a remark, OJT changes and submits again, facilitator approves. Each status and remark is correct on both devices. The week hours become approved. |
| TC-SI-COR-01 | S3 | N1, N2 | FR-COR-01, FR-COR-02, FR-COR-03 | Two-device correction cycle | OJT requests a correction offline. Facilitator approves. The new punch appears on the OJT device. The hours change. |
| TC-SI-NOTI-01 | S4 | N1, N2 | FR-NOTI-01 to FR-NOTI-05 | Notifications | The time-out reminder and the report reminder show while offline. A push notification arrives when a facilitator decides. The in-app list shows each notification. |

## 5. Level 4: System tests (ST)

### 5.1 Reviews (static tests)

| ID | Stage | Requirements | Title | Expected result |
|---|---|---|---|---|
| TC-ST-REV-01 | S0 | All FR, all QR | Requirement review | Each requirement has an ID, a priority, and a testable statement. No two requirements conflict. |
| TC-ST-REV-02 | S0 | All FR | Design review | Each "Must" FR maps to a module, a flow or a rule in the architecture, and one or more test cases. |
| TC-ST-REV-03 | S0 | QR-IC-01, QR-IC-02 | UI prototype walkthrough | Three users find the primary action of their role in 10 seconds or less. Problems found go to the UI/UX design. |
| TC-ST-REV-04 | S5 | DL-11 | Document review | All planned documents exist. A sample of each document obeys the STE self-check. |

### 5.2 Functional system tests

| ID | Stage | Network | Requirements | Title | Expected result |
|---|---|---|---|---|---|
| TC-ST-OJT-01 | S2 | N2, N3 | FR-DTR-01, FR-DTR-02, FR-DTR-06, FR-DTR-07, FR-SYNC-03, FR-SYNC-04 | OJT day offline | The OJT makes two work sessions in airplane mode. The history shows the hours and `pending` status. After network returns and pull-to-refresh, all entries show `synced`. The network status and the unsynced count are correct at each step. |
| TC-ST-OJT-02 | S4 | N2, N3 | FR-RPT-01, FR-RPT-03, FR-RPT-04, FR-EXP-01, FR-EXP-02 | OJT week | The OJT writes a report with photos offline and submits it. The OJT exports the DTR PDF and opens the share sheet. |
| TC-ST-OJT-03 | S2 | N1 | FR-SYNC-06, QR-SF-02 | Sync issues screen | A change that the server rejects shows on the "Sync issues" screen with the cause and the actions. Each action works. |
| TC-ST-OJT-04 | S2 | N2 | FR-AUTH-05, QR-SF-01 | Logout with unsynced changes | The app shows a CAUTION with the count of unsynced changes. Cancel keeps the session. Confirm logs out. |
| TC-ST-OJT-05 | S4 | N1, N2 | FR-PROF-01, FR-PROF-02, FR-MON-01 | Profile and progress | The profile, the assignment, and the progress show offline. A contact number change syncs. |
| TC-ST-FAC-01 | S3 | N1, N2, N3 | FR-DTR-10, FR-RPT-05, FR-COR-02, FR-MON-02 | Facilitator review offline | The facilitator sees the OJT list and the DTR of each OJT offline. The facilitator approves one report, returns one report, and decides one correction offline. All decisions sync. |
| TC-ST-ADM-01 | S3, S4 | N1 | FR-ADM-01 to FR-ADM-04, FR-MON-03, FR-MON-04, FR-AUD-02, FR-EXP-03 | Admin full cycle | The admin makes a company, a batch, users, and assignments. The dashboard counts are correct. Filters work. CSV export works. The audit log shows the changes. |
| TC-ST-ADM-02 | S3 | N2 | D-13 | Admin web app offline | The web app shows an offline message. Save actions are disabled. No data is lost in the form. |
| TC-ST-ACC-01 | S3 | N1 | FR-AUTH-03, QR-SE-01 | Role and platform access | Admin login on the mobile app fails. OJT and facilitator login on the web app fails. A typed URL of another role is blocked. |
| TC-ST-DEP-01 | S5 | N1 | QR-SE-02, QR-FL-03 | Production smoke test | The smoke test passes on `prod`: heartbeat, login of each role, one sync, one push notification. The admin web URL redirects HTTP to HTTPS. |

### 5.3 Quality tests (ISO/IEC 25010)

| ID | Stage | Requirements | Title | Expected result |
|---|---|---|---|---|
| TC-ST-Q-FS-01 | S5 | QR-FS-01, QR-RE-01 | Release readiness | In the final regression run, 100% of the test cases for "Must" FRs pass. The defect log has zero open S1 and S2 defects. |
| TC-ST-Q-PE-01 | S2, S4 | QR-PE-01, QR-FS-03 | Time-in speed and taps | Confirmation in 1 s or less offline (median of 10). Two taps or fewer from the home screen. |
| TC-ST-Q-PE-02 | S4 | QR-PE-02, QR-PE-06 | Start time and app size | Cold start 3 s or less (median of 5). Release APK 25 MB or less. |
| TC-ST-Q-PE-03 | S4 | QR-PE-03, QR-PE-07 | API load test | With seed data and 20 virtual users for 5 minutes, the 95th percentile of list requests is 800 ms or less. Error rate under 1%. |
| TC-ST-Q-PE-04 | S4 | QR-PE-04 | Sync of a full outbox | 100 queued changes sync in 30 s or less on Wi-Fi. |
| TC-ST-Q-CO-01 | S4 | QR-FL-05, QR-CO-01 | Device and browser matrix | The main flows pass on each target in QR-FL-05. The Android manifest has no unexpected background service. |
| TC-ST-Q-CO-02 | S4 | QR-CO-02 | API contract | Each table, policy, RPC function, and Edge Function is in `api-contract.md`. The L2 tests cover each RPC function. |
| TC-ST-Q-IC-01 | S4 | QR-IC-01, QR-IC-02, QR-IC-05 | Usability test | 5 new OJT users, 3 facilitator users, 2 admin users do the task script. Targets of QR-IC-01, QR-IC-02, and QR-IC-05 are met. |
| TC-ST-Q-IC-02 | S4 | QR-IC-03, QR-IC-06, QR-IC-07 | Accessibility test | Touch targets meet the minimum. Contrast is 4.5:1 or more. Layout is usable at 200% font size. TalkBack reads all controls. axe gives zero serious or critical results on web screens. |
| TC-ST-Q-IC-03 | S4 | QR-IC-04, QR-IC-08 | Error protection and status | Each irreversible action asks for confirmation. Each form error shows at its field. Each mobile screen shows the network status. Each record shows its sync status. |
| TC-ST-Q-RE-01 | S4 | QR-RE-02 | Offline availability | Each FR with "Offline = Yes" passes in airplane mode after one online login. |
| TC-ST-Q-RE-02 | S4 | QR-RE-05 | Backup restore | A backup restores to a new database. The restored data agrees with the source. |
| TC-ST-Q-RE-03 | S4 | QR-RE-07, QR-RE-08 | Pause drill | Pause the `dev` project in the dashboard. The apps behave as in TC-SI-SYNC-06. Do runbook procedure A. The resume and the smoke test finish in 30 minutes or less. All outbox changes sync. |
| TC-ST-Q-RE-04 | S4 | QR-RE-05, QR-RE-07 | Rebuild drill | Do runbook procedure B on the local stack with the newest backup. The rebuild finishes in 2 hours or less. Users of the restored data log in with their passwords. The smoke test passes. |
| TC-ST-Q-RE-05 | Each gate from S1 | QR-RE-06 | Keep-alive check | On `dev` and `prod`, the newest heartbeat of sources A and B is less than 48 hours old. The newest backup is 8 days old or less. |
| TC-ST-Q-SE-01 | S4 | QR-SE-02, QR-SE-09 | Security scans | `npm audit` gives zero high or critical results. The Supabase security advisor gives zero errors. Each `public` table has RLS. TLS 1.2 or later is on. |
| TC-ST-Q-SE-02 | S4 | QR-SE-04, QR-MA-03 | Secrets and logs | A secret scan of the repository finds no secrets. Edge Function logs contain no passwords, tokens, or personal data. Each log line has a request ID. The release build does not contain the fault injector. |
| TC-ST-Q-SE-03 | S4 | QR-SE-03, QR-SE-10 | Token storage on the device | Tokens are in secure storage, not in plain storage. If QR-SE-10 is done, the SQLite file is not readable without the key. |
| TC-ST-Q-SE-04 | S4 | QR-SE-05, QR-SE-06 | Record integrity | Each punch and decision has the user ID, device ID, and server time. No policy or function can change a punch. Each database function validates its input. |
| TC-ST-Q-MA-01 | Each gate | QR-MA-01, QR-MA-02, QR-MA-04, QR-MA-05 | Static quality | Zero lint errors. The lint rules include the feature import rule and the complexity rule. Strict mode on. Coverage meets the targets. Shared components exist. |
| TC-ST-Q-FL-01 | S4, S5 | QR-FL-01, QR-FL-02, QR-FL-03, QR-FL-04 | Install and build | Android, iOS (if possible), and web builds come from one repository. The APK installs in 2 minutes or less. A classmate runs the system with `developer-setup.md` in 30 minutes or less. Database functions and Edge Functions keep no state outside tables (code review). |
| TC-ST-Q-SF-01 | S4 | QR-SF-03, QR-SF-04, QR-SF-05 | Data protection | A change unsynced for 72 hours shows a warning (test build with a short clock). Denied location and camera permissions do not stop a punch. Sync errors do not delete local records. |

## 6. Level 5: User acceptance tests (UAT)

| ID | Stage | Requirements | Title | Expected result |
|---|---|---|---|---|
| TC-UAT-OJT-01 | S5 | Quality in use, FR-DTR, FR-RPT, FR-EXP | OJT script | The OJT user does one simulated week: punches, a report, a correction request, and an export. Task completion 90% or more. Zero data loss. |
| TC-UAT-FAC-01 | S5 | Quality in use, FR-DTR-10, FR-RPT-05, FR-COR-02, FR-MON-02 | Facilitator script | The facilitator user reviews the week, returns one report, approves one report, and decides one correction. Task completion 90% or more. |
| TC-UAT-ADM-01 | S5 | Quality in use, FR-ADM, FR-MON-03, FR-AUD-02 | Admin script | The admin user sets up a new batch with users and assignments, and finds a late report on the dashboard. Task completion 90% or more. |

## 7. Count of test cases

| Level | Count |
|---|---|
| L1 Unit | 25 |
| L2 Component integration | 20 |
| L3 Subsystem integration | 14 |
| L4 System (reviews, functional, quality) | 36 |
| L5 Acceptance | 3 |
| Total | 98 |

## 8. Traceability

This table lists each requirement and the test cases that verify it. The reviews TC-ST-REV-01 and TC-ST-REV-02 also cover all requirements. They are not in the table. Regenerate this table when a requirement or a test case changes.

NOTE: TC-UAT-OJT-01 and TC-UAT-ADM-01 refer to all requirements of a module (FR-DTR, FR-RPT, FR-EXP, FR-ADM). This table does not list them for each requirement of these modules.

| Requirement | Priority | Test cases |
|---|---|---|
| FR-AUTH-01 | Must | TC-CI-AUTH-01, TC-SI-AUTH-01 |
| FR-AUTH-02 | Must | TC-SI-AUTH-01, TC-U-AUTH-03 |
| FR-AUTH-03 | Must | TC-CI-AUTH-02, TC-ST-ACC-01, TC-U-AUTH-03 |
| FR-AUTH-04 | Must | TC-CI-DB-02, TC-SI-AUTH-02 |
| FR-AUTH-05 | Must | TC-CI-AUTH-03, TC-ST-OJT-04 |
| FR-AUTH-06 | Should | TC-CI-AUTH-03 |
| FR-AUTH-07 | Should | TC-CI-AUTH-03 |
| FR-PROF-01 | Must | TC-SI-AUTH-02, TC-ST-OJT-05 |
| FR-PROF-02 | Could | TC-ST-OJT-05 |
| FR-DTR-01 | Must | TC-ST-OJT-01, TC-U-DTR-01 |
| FR-DTR-02 | Must | TC-ST-OJT-01, TC-U-DTR-02 |
| FR-DTR-03 | Must | TC-CI-SYNC-01, TC-U-DTR-04 |
| FR-DTR-04 | Must | TC-U-DTR-04 |
| FR-DTR-05 | Should | TC-CI-FILE-01, TC-SI-FILE-01 |
| FR-DTR-06 | Must | TC-ST-OJT-01, TC-U-UTIL-01, TC-U-UTIL-02, TC-U-UTIL-03, TC-U-UTIL-04, TC-U-UTIL-05 |
| FR-DTR-07 | Must | TC-ST-OJT-01 |
| FR-DTR-08 | Must | TC-U-DTR-01 |
| FR-DTR-09 | Should | TC-U-DTR-03 |
| FR-DTR-10 | Must | TC-CI-ACL-02, TC-ST-FAC-01, TC-UAT-FAC-01 |
| FR-DTR-11 | Should | TC-SI-SYNC-05, TC-U-SRV-01, TC-U-SYNC-07 |
| FR-COR-01 | Must | TC-SI-COR-01 |
| FR-COR-02 | Must | TC-CI-RPT-02, TC-SI-COR-01, TC-ST-FAC-01, TC-UAT-FAC-01 |
| FR-COR-03 | Must | TC-SI-COR-01, TC-U-COR-01, TC-U-UTIL-05 |
| FR-RPT-01 | Must | TC-SI-RPT-01, TC-ST-OJT-02 |
| FR-RPT-02 | Must | TC-SI-RPT-01, TC-U-RPT-02, TC-U-UTIL-04 |
| FR-RPT-03 | Should | TC-CI-FILE-01, TC-SI-FILE-01, TC-SI-RPT-01, TC-ST-OJT-02 |
| FR-RPT-04 | Must | TC-SI-RPT-01, TC-ST-OJT-02, TC-U-RPT-01 |
| FR-RPT-05 | Must | TC-CI-RPT-02, TC-SI-RPT-01, TC-ST-FAC-01, TC-U-RPT-01, TC-UAT-FAC-01 |
| FR-RPT-06 | Must | TC-SI-RPT-01, TC-U-RPT-01 |
| FR-RPT-07 | Must | TC-CI-RPT-01, TC-SI-RPT-01 |
| FR-RPT-08 | Should | TC-CI-RPT-01, TC-SI-RPT-01 |
| FR-MON-01 | Must | TC-ST-OJT-05, TC-U-MON-01 |
| FR-MON-02 | Must | TC-ST-FAC-01, TC-UAT-FAC-01 |
| FR-MON-03 | Must | TC-ST-ADM-01, TC-UAT-ADM-01 |
| FR-MON-04 | Should | TC-ST-ADM-01 |
| FR-NOTI-01 | Should | TC-SI-NOTI-01 |
| FR-NOTI-02 | Should | TC-SI-NOTI-01 |
| FR-NOTI-03 | Should | TC-SI-NOTI-01 |
| FR-NOTI-04 | Could | TC-SI-NOTI-01 |
| FR-NOTI-05 | Should | TC-SI-NOTI-01 |
| FR-EXP-01 | Must | TC-CI-EXP-01, TC-ST-OJT-02 |
| FR-EXP-02 | Should | TC-CI-EXP-01, TC-ST-OJT-02 |
| FR-EXP-03 | Should | TC-CI-EXP-02, TC-ST-ADM-01 |
| FR-ADM-01 | Must | TC-CI-ADM-01, TC-ST-ADM-01 |
| FR-ADM-02 | Must | TC-CI-ADM-01, TC-ST-ADM-01 |
| FR-ADM-03 | Must | TC-CI-ADM-01, TC-ST-ADM-01 |
| FR-ADM-04 | Must | TC-CI-ADM-01, TC-ST-ADM-01 |
| FR-ADM-05 | Could | TC-CI-ADM-02 |
| FR-ADM-06 | Could | TC-CI-ADM-01 |
| FR-AUD-01 | Must | TC-CI-AUD-01, TC-CI-RPT-01 |
| FR-AUD-02 | Should | TC-ST-ADM-01, TC-UAT-ADM-01 |
| FR-SYNC-01 | Must | TC-CI-DB-01, TC-CI-DB-02, TC-SI-SYNC-01, TC-U-SYNC-01, TC-U-SYNC-02 |
| FR-SYNC-02 | Must | TC-SI-SYNC-01, TC-U-SYNC-03, TC-U-SYNC-04 |
| FR-SYNC-03 | Must | TC-ST-OJT-01 |
| FR-SYNC-04 | Must | TC-ST-OJT-01 |
| FR-SYNC-05 | Must | TC-CI-SYNC-01, TC-SI-SYNC-02 |
| FR-SYNC-06 | Must | TC-CI-SYNC-02, TC-CI-SYNC-04, TC-ST-OJT-03, TC-U-SYNC-02 |
| FR-SYNC-07 | Must | TC-CI-SYNC-03, TC-SI-SYNC-01, TC-U-SYNC-05 |
| FR-SYNC-08 | Must | TC-SI-SYNC-06 |
| QR-FS-01 | Must | TC-ST-Q-FS-01 |
| QR-FS-02 | Must | TC-U-UTIL-01, TC-U-UTIL-02, TC-U-UTIL-03, TC-U-UTIL-05 |
| QR-FS-03 | Must | TC-ST-Q-PE-01 |
| QR-PE-01 | Must | TC-ST-Q-PE-01 |
| QR-PE-02 | Should | TC-ST-Q-PE-02 |
| QR-PE-03 | Should | TC-ST-Q-PE-03 |
| QR-PE-04 | Must | TC-ST-Q-PE-04 |
| QR-PE-05 | Must | TC-CI-FILE-01 |
| QR-PE-06 | Should | TC-ST-Q-PE-02 |
| QR-PE-07 | Should | TC-ST-Q-PE-03 |
| QR-CO-01 | Should | TC-ST-Q-CO-01 |
| QR-CO-02 | Must | TC-ST-Q-CO-02 |
| QR-CO-03 | Must | TC-CI-EXP-01, TC-CI-EXP-02 |
| QR-IC-01 | Must | TC-ST-Q-IC-01, TC-ST-REV-03 |
| QR-IC-02 | Must | TC-ST-Q-IC-01, TC-ST-REV-03 |
| QR-IC-03 | Must | TC-ST-Q-IC-02 |
| QR-IC-04 | Must | TC-ST-Q-IC-03 |
| QR-IC-05 | Should | TC-ST-Q-IC-01 |
| QR-IC-06 | Must | TC-ST-Q-IC-02 |
| QR-IC-07 | Should | TC-ST-Q-IC-02 |
| QR-IC-08 | Must | TC-ST-Q-IC-03 |
| QR-RE-01 | Must | TC-ST-Q-FS-01 |
| QR-RE-02 | Must | TC-ST-Q-RE-01 |
| QR-RE-03 | Must | TC-SI-SYNC-02 |
| QR-RE-04 | Must | TC-SI-SYNC-03 |
| QR-RE-05 | Must | TC-ST-Q-RE-02, TC-ST-Q-RE-04 |
| QR-RE-06 | Must | TC-ST-Q-RE-05 |
| QR-RE-07 | Must | TC-SI-SYNC-07, TC-ST-Q-RE-03, TC-ST-Q-RE-04 |
| QR-RE-08 | Must | TC-SI-SYNC-06, TC-ST-Q-RE-03 |
| QR-SE-01 | Must | TC-CI-ACL-01, TC-CI-ACL-02, TC-CI-ACL-03, TC-SI-SYNC-04, TC-ST-ACC-01 |
| QR-SE-02 | Must | TC-ST-DEP-01, TC-ST-Q-SE-01 |
| QR-SE-03 | Must | TC-CI-AUTH-01, TC-ST-Q-SE-03, TC-U-AUTH-02 |
| QR-SE-04 | Must | TC-ST-Q-SE-02, TC-U-AUTH-01 |
| QR-SE-05 | Must | TC-CI-SYNC-04, TC-ST-Q-SE-04 |
| QR-SE-06 | Must | TC-ST-Q-SE-04 |
| QR-SE-07 | Must | TC-CI-AUD-01 |
| QR-SE-08 | Must | TC-U-AUTH-04 |
| QR-SE-09 | Should | TC-ST-Q-SE-01 |
| QR-SE-10 | Could | TC-ST-Q-SE-03 |
| QR-MA-01 | Must | TC-ST-Q-MA-01 |
| QR-MA-02 | Should | TC-ST-Q-MA-01 |
| QR-MA-03 | Must | TC-ST-Q-SE-02 |
| QR-MA-04 | Must | TC-ST-Q-MA-01 |
| QR-MA-05 | Must | TC-ST-Q-MA-01 |
| QR-FL-01 | Must | TC-SI-PLUG-01, TC-ST-Q-FL-01 |
| QR-FL-02 | Should | TC-ST-Q-FL-01 |
| QR-FL-03 | Must | TC-ST-DEP-01, TC-ST-Q-FL-01 |
| QR-FL-04 | Should | TC-CI-DB-01, TC-ST-Q-FL-01 |
| QR-FL-05 | Must | TC-ST-Q-CO-01 |
| QR-SF-01 | Must | TC-ST-OJT-04, TC-U-SYNC-06 |
| QR-SF-02 | Must | TC-SI-SYNC-05, TC-ST-OJT-03 |
| QR-SF-03 | Must | TC-SI-SYNC-06, TC-ST-Q-SF-01, TC-U-SYNC-06 |
| QR-SF-04 | Should | TC-ST-Q-SF-01 |
| QR-SF-05 | Must | TC-ST-Q-SF-01, TC-U-DTR-04 |
