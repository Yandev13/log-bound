# Stage test report: S2 Offline core

This report gives the results of the S2 tests and the status of the S2 gate. The S2 work started before the S1 gate (D-46). Thus the S2 gate cannot pass before the S1 gate passes. Update this report at the gate check (S2 end date 2026-11-10).

## 1. Summary

| Item | Value |
|---|---|
| Stage | S2 |
| Dates | 2026-11-04 to 2026-11-10 (work started 2026-10-26, D-46) |
| Build or commit | `3bbe97a` and later on `main` |
| Gate result | Fail for now (not passed yet). All 31 S2 test cases pass or part pass. The open item is the S1 gate (section 8). |
| Prepared by | Claude Code (desktop), for the developer |

Test devices: Android 15 emulator (AVD `ojt_dtr_api35`, 1080 x 2400), development build. PC with Node.js for the L2 tests. Supabase project `dev`.

## 2. Test execution

| Level | Planned | Run | Pass | Fail | Blocked | Not run |
|---|---|---|---|---|---|---|
| L1 Unit | 12 | 12 | 12 | 0 | 0 | 0 |
| L2 Component integration | 6 | 6 | 6 (1 part pass) | 0 | 0 | 0 |
| L3 Subsystem integration | 9 | 9 | 9 (1 part pass) | 0 | 0 | 0 |
| L4 System | 4 | 4 | 4 | 0 | 0 | 0 |
| L5 Acceptance | 0 | 0 | 0 | 0 | 0 | 0 |

The two part passes are TC-CI-FILE-01 and TC-SI-FILE-01. Their DTR photo part passes. Their weekly report photo part (FR-RPT-03, "Should") is S3 work.

Automated test totals on 2026-10-26: frontend 184 of 184 pass, backend L2 75 of 75 pass. CI passes on `3bbe97a`. After the coverage tests (D-52): backend L2 92 of 92 pass.

### 2.1 Level 1: unit tests

| Test case | Title | Result |
|---|---|---|
| TC-U-DTR-01 to TC-U-DTR-04 | DTR rules, punch data, denied location permission | Pass |
| TC-U-SYNC-01 to TC-U-SYNC-07 | Outbox, push results, retry delays, one sync at a time, merge rules, no delete of unsynced records, clock offset | Pass |
| TC-U-SRV-01 | Server doubtful-time rules | Pass (backend L2 suite) |

### 2.2 Level 2: component integration tests

| Test case | Title | Result |
|---|---|---|
| TC-CI-ACL-01 | OJT data scope | Pass: sync, Data API, and Storage parts. Assignments, device records, and attachment records added for the backend coverage (D-52). |
| TC-CI-SYNC-01 to TC-CI-SYNC-03 | Idempotent push, version conflict, pull scope and pages | Pass |
| TC-CI-SYNC-04 | Invalid payload | Pass, after DEF-008 |
| TC-CI-FILE-01 | Photo upload | Part pass. A photo of 500 KB or less is accepted; a larger file and a file that is not JPEG are rejected; a file cannot be replaced or deleted; the client compression makes a large photo 500 KB or less. The report photo part comes in S3. |

NOTE: For the backend coverage (D-52), the database parts of three S3 test cases ran early: TC-CI-ACL-02 (a facilitator reads only its assignments), TC-CI-ADM-01 (an assignment must link an OJT account to a facilitator account), and TC-CI-AUD-01 (a company change makes an audit entry). All pass. These test cases are run in full in S3. `keepalive.test.ts` examines the heartbeat functions that TC-ST-Q-RE-05 uses.

### 2.3 Level 3: subsystem integration tests (emulator)

| Test case | Title | Result |
|---|---|---|
| TC-SI-AUTH-02 | Offline open and expired session | Pass. The app opens offline and shows the stored profile (name and role). After a sign-out of all sessions on the server and the end of the access token, the app shows the login screen and keeps the outbox. The punch syncs after the next login. NOTE: The full profile page of FR-PROF-01 (company, facilitator, batch, required hours) is examined in TC-ST-OJT-05 (S4). |
| TC-SI-SYNC-01 | End-to-end sync | Pass. A punch reached the server 2.4 s after the tap. A server change reached the device after pull-to-refresh. |
| TC-SI-SYNC-02 | Network fault test | Pass. 200 punches with the fault injector at 30% dropped requests and 10% error 500, and 82 airplane mode changes. 62 syncs failed and were tried again. After the injector was off: outbox 0, no issue, exactly 200 punches on the server (100 time-ins, 100 time-outs), zero duplicate IDs, zero duplicate `op_id` values. |
| TC-SI-SYNC-03 | App stop during sync | Pass. 10 force-stops while outbox operations had the status `sending`. After each restart, the sync finished. 100 of 100 punches on the server, zero duplicates. |
| TC-SI-SYNC-04 | Other user on the same device | Pass. `ojt2` logged in while the outbox of `ojt1` had one punch. The sync of `ojt2` sent nothing of `ojt1`. The logout of `ojt2` kept the punch. After the login of `ojt1`, the punch synced. |
| TC-SI-SYNC-05 | Device clock change | Pass, after DEF-012 and DEF-013. Device clock 2 hours ahead, offline punch, sync with the clock still wrong. The server set the doubtful-time flag. `fac1` sees "Doubtful time" on the punch. |
| TC-SI-SYNC-06 | Backend not reachable | Pass. Fault injector at 100% for 17 minutes with 5 punches. The app showed "Server not reachable", kept the session, and kept all changes. The retries followed 5 s, 15 s, 60 s, and the 5-minute timer. After the injector was off, all changes synced. Zero forced sign-outs. See section 7, item 1. |
| TC-SI-SYNC-07 | Server epoch change | Pass. A new epoch on `dev`. The app reset the cursor, pulled again, and sent its records of the last 30 days again. The server count did not change. |
| TC-SI-FILE-01 | Offline photo | Part pass. A time-out with a selfie in airplane mode (`ojt6`, Company B requires a photo). When the network returned, the file uploaded 0.34 s before its record. The punch refers to the photo. The report photo part comes in S3. |

### 2.4 Level 4: system tests (emulator)

| Test case | Title | Result |
|---|---|---|
| TC-ST-OJT-01 | OJT day offline | Pass, after DEF-013. Two work sessions in airplane mode. The history showed the sessions with "Pending sync". The count went from 1 to 4 unsynced changes. After the network returned and pull-to-refresh, all punches showed "Synced" and the bar showed "All changes synced". |
| TC-ST-OJT-03 | Sync issues screen | Pass. A rejected change showed with its cause and the two actions. "Try again" sent it again (rejected again). "Discard my change" removed it. |
| TC-ST-OJT-04 | Logout with unsynced changes | Pass, after DEF-014. The CAUTION showed the count. Cancel kept the session and the change. Confirm logged out offline in less than 3 s and removed the change. |
| TC-ST-Q-PE-01 | Time-in speed and taps (first measure) | Pass on the emulator. See section 5. |

## 3. Common gate rules (test plan, section 7)

| Rule | Result | Evidence |
|---|---|---|
| G1 All planned test cases run | Yes | 31 of 31 (section 2) |
| G2 "Must" test cases pass | Yes | The two part passes are for FR-RPT-03 ("Should", S3). |
| G3 Zero open S1 and S2 defects | Yes | Section 6, `defect-log.md` |
| G4 Lint, type check, and builds pass | Yes | Lint 0 errors. Web build and Android debug build pass. |
| G5 Regression suites pass | Yes | CI on each push (lint, L1, L2). Frontend 184 of 184, backend 92 of 92. |
| G6 Coverage meets QR-MA-05 | Yes | Frontend yes (section 5). Backend 88.2% of the rule items (D-52, accepted), target 70%. |
| G7 This report exists | Yes | This file |
| G8 `PROGRESS.md` updated | Yes | Test results recorded. The gate result is recorded at the gate check. |
| G9 Keep-alive check passes | No | Same open S1 items: keep-alive sources B and C, a scheduled run of source A. |

## 4. Stage exit criteria (test plan, section 8)

| Criterion | Result | Evidence |
|---|---|---|
| S1 gate passed (entry criterion) | No | S2 work started early (D-46). |
| Common gate rules | No | G9 (section 3) |
| TC-SI-SYNC-02 passes (zero data loss) | Yes | Section 2.3 |
| TC-SI-SYNC-03 passes (app stop) | Yes | Section 2.3 |
| TC-SI-SYNC-06 passes (backend not reachable) | Yes | Section 2.3 |

## 5. Quality measures in this stage

| QR ID | Target | Measured value | Pass or fail |
|---|---|---|---|
| QR-PE-01 | Time-in confirmation 1 s or less offline (median of 10) | 940 ms with no GPS position (911 to 1027 ms). 267 ms with a GPS position (117 to 417 ms). Emulator. | Pass (first measure; S4 measures on a real phone) |
| QR-FS-03 | Two taps or fewer from the home screen | 2 taps (DTR tab, Time in) | Pass |
| QR-PE-05 | Each photo 500 KB or less | Server rejects 512,001 bytes. Real compression code: 7.5 MB image to 234 KB (1280 x 960) in 0.34 s in the emulator WebView. | Pass |
| QR-PE-06 | Release APK 25 MB or less | Debug APK 21.6 MB (release build not made yet) | Not measured yet (S4) |
| QR-RE-03 | Zero data loss and zero duplicates with network faults | TC-SI-SYNC-02: 200 of 200, zero duplicates | Pass |
| QR-RE-04 | Sync finishes after an app stop | TC-SI-SYNC-03: 10 of 10 stops, zero loss, zero duplicates | Pass |
| QR-RE-07 | Backend recovery; after a rebuild, the devices send their records of the last 30 days again | Device part only (TC-SI-SYNC-07): the records were sent again, and the server count did not change. The resume and rebuild times are measured in S4 (TC-ST-Q-RE-*). | Part pass (device part) |
| QR-RE-08 | Backend not reachable for 24 hours: zero data loss, zero forced sign-outs, "Server not reachable" shows | 17 minutes (TC-SI-SYNC-06), past the access token life: zero data loss, zero forced sign-outs, the message shows. TC-SI-SYNC-05: no sign-out with a wrong device clock (after DEF-012). The 24-hour measure is the pause drill (S4). | Pass for the S2 part |
| QR-SE-01 | Each user reads and sends only own scope | TC-CI-ACL-01, TC-SI-SYNC-04 | Pass |
| QR-SF-01, QR-SF-03 | CAUTION before unsynced data is lost; no silent delete | TC-ST-OJT-04, TC-U-SYNC-06 | Pass |
| QR-SF-02 | Doubtful time is flagged for the facilitator | TC-SI-SYNC-05 | Pass |
| QR-MA-05 | Coverage: auth 80%, sync 80%, DTR 80%, frontend 60%, backend 70% | `core/auth` 94.5%, `data/sync` 91.8%, `features/dtr` 97.3%, frontend 84.0% lines. Backend 88.2% of the rule items (60 of 68, D-52). | Pass |

NOTE: Some files run only on a device: `plugins/` (17% lines), `data/sync/file-upload.ts` (23%), and the canvas part of `shared/utils/jpeg-compress.ts`. TC-SI-PLUG-01, TC-SI-FILE-01, and the compression check on the emulator examined them.

## 6. Defects

| Severity | Found | Closed | Open |
|---|---|---|---|
| S1 | 0 | 0 | 0 |
| S2 | 6 | 6 | 0 |
| S3 | 1 | 1 | 0 |
| S4 | 2 | 2 | 0 |

| ID | Severity | Summary |
|---|---|---|
| DEF-008 | S2 | `sync_push` accepted time words such as `yesterday` |
| DEF-009 | S2 | Sync issue card stopped on an invalid time |
| DEF-010 | S4 | Compression unit test too slow in CI (test fault) |
| DEF-011 | S2 | Idle app synced every 3 s |
| DEF-012 | S2 | Wrong device clock ended the session |
| DEF-013 | S2 | Wrong device clock blocked the time-out (D-51) |
| DEF-014 | S2 | Offline logout took 15 s, and the page took taps |
| DEF-015 | S4 | A failed sync hid "No network" |
| DEF-016 | S3 | Offline start waited 7.5 s |

Each fix has a unit test. For DEF-011, DEF-013, and DEF-015, the new test fails without the fix. Each fix was tested again on the emulator.

## 7. Skipped tests and limits

No S2 test case was skipped. Limits:

1. TC-SI-SYNC-06 asks for a simulated 24 hours with a short test clock. The app has no test clock. The outage ran 17 minutes, which is more than the access token life (15 minutes). Thus the token expired during the outage, and the refresh also failed.
2. TC-SI-SYNC-03: the first run of 10 rounds was not valid, because the stop command of the test script did not stop the app. That run was not counted. The second run used a real force-stop and a check of the process ID.
3. All device tests ran on the emulator. The emulator has no front camera, so the selfie used the back camera. Run TC-SI-FILE-01 and TC-ST-Q-PE-01 again on a real phone in S4.
4. The report photo part of TC-CI-FILE-01 and TC-SI-FILE-01 waits for the weekly report functions (S3).

Observations (OBS-S2-01 in `PROGRESS.md`; not defects now):

| # | Observation | Proposed action |
|---|---|---|
| 1 | With no GPS position, the offline time-in takes 940 ms. The 800 ms location wait (D-48) leaves 60 ms of margin to QR-PE-01. | Measure on a real phone in S4. If the margin is too small, make the location wait shorter (a setting, D-30). |
| 2 | The WebView `navigator.onLine` turns true some seconds after the network plugin event. The first sync after the network returns can then wait for the retries (about 30 s). | Start one more sync when the WebView `online` event comes. |
| 3 | The confirmation message after a punch covers the "Log out" button for 2.5 s. | Show the message at the bottom of the screen. |
| 4 | Punches made with a wrong device clock still pair by device time in the hours (D-51). | The facilitator sees the doubtful-time flag and asks for a correction (FR-COR, S3). |

## 8. Decision

The S2 gate does not pass yet. The S2 test results meet the S2 exit criteria. The gate waits for these actions:

1. The S1 gate passes (S1 report, section 5): keep-alive sources B and C, a scheduled run of source A, TC-ST-Q-RE-05.
2. Done 2026-10-26: backend coverage (QR-MA-05). The user accepted D-52. 13 L2 tests were added; 88.2% of the items are covered (60 of 68).
3. At the gate check, run the regression suites again.

New gate date: the S2 end date, 2026-11-10, or earlier when items 1 and 3 are done.
