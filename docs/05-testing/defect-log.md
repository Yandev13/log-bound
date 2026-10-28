# Defect log

This document records each defect. The severity rules and the procedure are in `test-plan.md`, section 11.

## Status values

`Open`, `In work`, `Fixed` (fix done, test not run again), `Closed` (test passed), `Deferred` (accepted for a later release, needs a decision).

## Defects

| ID | Date | Test case | Severity | Module | Summary | Device and network | Status | Fix commit |
|---|---|---|---|---|---|---|---|---|
| DEF-001 | 2026-10-25 | TC-ST-REV-01 | S3 | DTR | FR-DTR-09 and TC-U-DTR-03 marked a correct session across midnight (TC-U-UTIL-03) as "Missing time-out". Fixed by D-37. | Document review | Closed | Not in git yet |
| DEF-002 | 2026-10-25 | TC-ST-REV-01 | S3 | AUTH | QR-SE-03 said "sign-out revokes the session", but FR-AUTH-05 permits an offline sign-out. Fixed: an offline sign-out removes the tokens from the device. | Document review | Closed | Not in git yet |
| DEF-003 | 2026-10-25 | TC-ST-REV-02 | S3 | AUTH | The design did not say where FR-AUTH-03 is enforced. The server cannot know the client platform. Fixed by D-38 and system modules, section 6.1. | Document review | Closed | Not in git yet |
| DEF-004 | 2026-10-25 | TC-ST-REV-02 | S3 | COR, RPT | QR-SE-06 needs the device ID on each decision. `correction_requests` and `report_events` had no device ID. Fixed in the data model. | Document review | Closed | Not in git yet |
| DEF-005 | 2026-10-25 | TC-ST-REV-02 | S4 | ADM | The network document named a table `company_settings`. The data model keeps the settings in `companies`. Fixed in the network document. | Document review | Closed | Not in git yet |
| DEF-016 | 2026-10-26 | TC-SI-AUTH-02 | S3 | AUTH | An offline app start showed a white screen for about 7.5 s (first paint at 8.7 s). Cause: the session restore asked the server for the profile first, and supabase-js tried the failed request again after 1 s, 2 s, and 4 s. The local profile was used only after that. Fix: the restore uses the local profile at once and checks the server profile after the start; an inactive account still ends the session. Two unit tests added. Run again on the emulator: first paint at 1.6 s offline. | Android 15 emulator, N2 | Closed | `3bbe97a` |
| DEF-015 | 2026-10-26 | TC-ST-OJT-04 | S4 | SYNC | Airplane mode turned on during a sync showed "Server not reachable" and not "No network". Cause: the failed sync set the state after the network event. Fix: a failed sync does not replace the "No network" state. Unit test added (it fails without the fix). | Android 15 emulator, N4 | Closed | `3bbe97a` |
| DEF-014 | 2026-10-26 | TC-ST-OJT-04 | S2 | AUTH | An offline logout took 15 s. During that time the page still took taps, after the local data was removed. A punch in that time would stay on the device under a user who logged out. Cause: supabase-js calls the server before it removes the session, and offline the request waited for the 15 s time limit. Fix: with no network, a request fails at once (fetch wrapper), and the page shows a blocking "Logging out..." indicator. Unit test added. Run again on the emulator: the login screen shows in less than 3 s offline. | Android 15 emulator, N2 | Closed | `3bbe97a` |
| DEF-013 | 2026-10-26 | TC-SI-SYNC-05 | S2 | DTR | After punches made with the device clock 2 hours ahead, each tap made a time-in and the page showed "No open work session" for 2 hours. Cause: the open session came from the newest punch by device time, and the punches with the wrong clock were "newest". Fix (D-51): the open session comes from the punch that was recorded last. Unit test added (it fails without the fix). Run again on the emulator: the open session and the time-out are correct. | Android 15 emulator, N2, N3 | Closed | `3bbe97a` |
| DEF-012 | 2026-10-26 | TC-SI-SYNC-05 | S2 | AUTH | With the device clock 2 hours ahead, the sync failed with "permission denied" and the app showed the login screen. The refresh token was valid (QR-RE-08). Cause: supabase-js compares the server expiry time of the token with the device clock, so each new token looked expired, and a failed refresh removed the session. Also, the sync transport ended the session at the first 401 and did not refresh first (offline sync design, section 13). Fix: the token storage keeps the expiry in device time, and the transport refreshes once after a 401 and sends again; only a refresh that Auth rejects ends the session. 8 unit tests added. Run again on the emulator: the punch synced with the doubtful-time flag, and the session stayed. | Android 15 emulator, N2, N3 | Closed | `3bbe97a` |
| DEF-011 | 2026-10-26 | TC-ST-OJT-03 | S2 | SYNC | The idle app synced about every 3 s (12 syncs in 60 s) and not every 5 minutes. With the server down, each sync also reset the retry delay. Cause: the Android network plugin sends "connected" again every few seconds with no change, and each event started a sync. Fix: only a change from offline to online starts a sync. Unit test added (it fails without the fix). Run again on the emulator: 0 syncs in 60 idle seconds. | Android 15 emulator, N1 | Closed | `3bbe97a` |
| DEF-010 | 2026-10-26 | TC-CI-FILE-01 | S4 | SYNC | In CI, the unit test "a photo that cannot be made small enough" stopped after 5 s. Cause: not a product defect. The fake encoder of the test made real Blobs of up to about 1 GB. The test passed on the PC, but slowly. Fix: the fake gives an object with only a size (the compression logic reads only the size). The assertions did not change. | GitHub Actions, `ubuntu-latest` | Closed | Corrected test (`f0f7831`, CI passes) |
| DEF-009 | 2026-10-26 | TC-ST-OJT-03 | S2 | SYNC | On the "Sync issues" screen, the card of a change with an invalid time showed no time, no cause, and no button labels. Cause: the time text function threw an error on the invalid time, and the card stopped. Fix: `sync-issue-text.ts` never throws; it uses the local save time if the change time is not valid. Unit test added. Run again on the emulator: the card shows all text, and both actions work. | Android 15 emulator, N1 | Closed | `86e2e14` |
| DEF-008 | 2026-10-26 | TC-CI-SYNC-04 | S2 | SYNC | `sync_push` accepted a punch with the device time `yesterday`. Cause: a PostgreSQL text-to-time cast accepts time words (`now`, `yesterday`, `infinity`). Fix: migration `strict_time_format` accepts only ISO 8601 times with a time zone and ISO dates. Four more invalid-time tests added. Backend L2: 61 of 61 pass. | Vitest on PC, `dev`, N1 | Closed | `fc2b427` |
| DEF-007 | 2026-10-25 | TC-CI-AUTH-01 | S2 | AUTH | A used refresh token still gives a new session 11 s after use. Cause: not a product defect. The test reused the parent of the active token, and Supabase Auth accepts that token on purpose. An older token is rejected. The test was corrected (D-41). The Auth settings were also pushed to `dev`. | Vitest on PC, `dev`, N1 | Closed | Corrected test |
| DEF-006 | 2026-10-25 | TC-ST-REV-02 | S4 | All | The traceability table did not show the module-wide references of TC-UAT-OJT-01 and TC-UAT-ADM-01. Fixed with a NOTE in the table. | Document review | Closed | Not in git yet |

## Defect detail template

Copy this block for each S1 or S2 defect.

```
### DEF-NNN: <summary>
- Test case:
- Severity:
- Device, OS, app version:
- Network condition (N1 to N7):
- Steps:
  1.
- Expected result:
- Actual result:
- Cause (after analysis):
- Fix:
- Regression tests run:
```
