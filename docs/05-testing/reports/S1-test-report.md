# Stage test report: S1 Foundation

This report gives the results of the S1 tests and the status of the S1 gate. It is a draft. Update it at the gate check (S1 end date 2026-11-03).

## 1. Summary

| Item | Value |
|---|---|
| Stage | S1 |
| Dates | 2026-10-25 to 2026-11-03 (work started early, D-39) |
| Build or commit | `e9802e2` and later on `main` |
| Gate result | Not passed yet. Open items are in section 5. |
| Prepared by | Claude Code (desktop), for the developer |

## 2. Test execution

| Test case | Level | Title | Result |
|---|---|---|---|
| TC-U-UTIL-01 to TC-U-UTIL-05 | L1 | Hours utilities | Pass |
| TC-U-AUTH-01 | L1 | Password rules | Pass |
| TC-U-AUTH-02 | L1 | Token settings | Pass |
| TC-U-AUTH-03 | L1 | Client route guards | Pass |
| TC-U-AUTH-04 | L1 | Login rate limit | Pass. Separate suite, run by hand (D-43). The wait message has a unit test. |
| TC-CI-DB-01 | L2 | Local migrations | Pass |
| TC-CI-DB-02 | L2 | Repository with the SQLite adapter | Pass |
| TC-CI-AUTH-01 | L2 | Tokens and refresh token reuse | Pass, after DEF-007 (test design fault, D-41) |
| TC-CI-AUTH-02 | L2 | Platform restriction | Pass (fake client, D-38) |
| TC-CI-AUTH-03 | L2 | Logout, password change, password reset | Part pass. Logout and password change pass. The admin reset (FR-AUTH-07, Should) needs the `admin-users` Edge Function (S3). |
| TC-CI-ACL-03 | L2 | Admin access matrix | Pass. The Edge Function part waits for S3. |
| TC-SI-AUTH-01 | L3 | Login for each role on the device and the web | Pass (Android emulator and web) |
| TC-SI-PLUG-01 | L3 | Plugin smoke test | Pass on the emulator: 13 of 13 calls. Run again on a real phone. |
| TC-ST-Q-RE-05 | L4 | Keep-alive check | Fail now. Source B does not exist (D-45). Source A passes: the first scheduled run was on 2026-10-26 at 06:10 UTC (heartbeat `github` on `dev`). The backup part passes: the newest backup is from 2026-10-26. |

| Level | Planned | Run | Pass | Part pass | Fail |
|---|---|---|---|---|---|
| L1 Unit | 9 | 9 | 9 | 0 | 0 |
| L2 Component integration | 6 | 6 | 5 | 1 | 0 |
| L3 Subsystem integration | 2 | 2 | 2 | 0 | 0 |
| L4 System | 1 | 1 | 0 | 0 | 1 |

Automated test totals on 2026-10-26: frontend 90 of 90 pass, backend L2 24 of 24 pass. CI runs lint, L1, and L2 on each push.

## 3. Static quality and coverage

| Item | Target | Result |
|---|---|---|
| Lint errors | 0 | 0 |
| Feature import rule (QR-MA-01) and complexity rule (QR-MA-04) | Present and active | Present. A probe file showed that both rules report errors. |
| Coverage, auth (QR-MA-05) | 80% | 89.7% lines (`core/auth`) |
| Coverage, `data/sync` | 80% | 100% lines |
| Coverage, DTR calculation | 80% | 100% lines (`hours.ts`) |
| Coverage, frontend | 60% | 83.3% lines |
| Coverage, backend | 70% | 88.2% of the rule items (60 of 68), with the measure D-52 (accepted 2026-10-26). First value 66.2%; 13 L2 tests were added. |
| Android debug build | Builds | Builds. 19.5 MB (QR-PE-06 release target: 25 MB). |
| Web build | Builds | Builds in CI |

NOTE: `data/local-db` has 68% line coverage. The SQLite plugin adapter runs on a device only. TC-SI-PLUG-01 examined it on the emulator.

## 4. Defects

| ID | Severity | Status |
|---|---|---|
| DEF-007 | S3 | Closed. Test design fault (D-41). |

No open S1 or S2 defects.

## 5. Gate status

| Criterion | Status |
|---|---|
| G1: all S1 test cases run | Yes |
| G2: "Must" test cases pass | No. TC-ST-Q-RE-05 (QR-RE-06) fails. |
| G3: zero open S1 and S2 defects | Yes |
| G4: lint, type check, builds | Yes |
| G5: regression suites | Yes (CI) |
| G6: coverage | Yes. Backend 88.2% of the rule items (D-52), target 70%. |
| G7: this report | Draft |
| G8: `PROGRESS.md` shows the result | At the gate check |
| G9: keep-alive check | No |
| CI on each push | Yes |
| Login for each role on Android and the web | Yes |
| Keep-alive sources A, B, and C | A runs (first scheduled run 2026-10-26). B is deferred (D-45). C is not set up. |
| First own backup | Yes. `backup-ojt-dtr-dev-20261026-0657`, decrypt test passed. |

Open items before the gate:

1. Done 2026-10-26: source A had a scheduled run (06:10 UTC, about 5 hours after the cron time).
2. Source B: set up (runbook, section 3.4).
3. Source C: calendar reminders on Monday and Thursday.
4. Done 2026-10-26: the backend coverage. The user accepted D-52. The L2 tests cover 88.2% of the items (60 of 68).
5. Run TC-ST-Q-RE-05 again.
