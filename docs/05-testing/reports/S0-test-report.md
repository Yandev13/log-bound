# Stage test report: S0 Plan and design

This report gives the results of the S0 static tests and the S0 gate decision.

## 1. Summary

| Item | Value |
|---|---|
| Stage | S0 |
| Dates | 2026-10-21 to 2026-10-25 |
| Build or commit | No code. Documents of 2026-10-25 (first git commit). |
| Gate result | Pass |
| Prepared by | Claude Code (desktop), for the developer |

## 2. Test execution

S0 has static tests only.

| Test case | Title | Result |
|---|---|---|
| TC-ST-REV-01 | Requirement review | Pass, after the fix of DEF-001 and DEF-002 |
| TC-ST-REV-02 | Design review | Pass, after the fix of DEF-003 to DEF-006 |
| TC-ST-REV-03 | UI prototype walkthrough | Not run. Waiver D-33. |

| Level | Planned | Run | Pass | Fail | Blocked | Not run |
|---|---|---|---|---|---|---|
| L4 System (reviews) | 3 | 2 | 2 | 0 | 0 | 1 (waiver) |

## 3. Method

1. A script examined the requirement and test case documents. It examined these items:
   - Each FR and QR has an ID, a priority (Must, Should, or Could), and the matching modal verb ("must", "should", "can").
   - The summary tables agree with the requirement rows (59 FR, 54 QR).
   - The test case counts agree with the register (98 test cases).
   - Each test case refers only to known requirements.
   - The traceability table agrees with the register in the two directions. Each requirement has one or more test cases.
2. A person-style review of the text found conflicts and design gaps. The reviewer compared the requirements with the architecture, the data model, the offline sync design, and the network document.
3. After the fixes, the script found zero problems.

## 4. Requirement review (TC-ST-REV-01)

| Check | Result |
|---|---|
| Each requirement has an ID and a priority | Yes. 113 requirements. |
| Modal verb agrees with the priority | Yes |
| Summary tables are correct | Yes |
| Each requirement has a measurable statement | Yes. Each QR has a measure and a target. |
| No two requirements conflict | Two conflicts found and fixed (DEF-001, DEF-002) |

## 5. Design review (TC-ST-REV-02)

Each "Must" FR maps to a module, to an element of the architecture, and to one or more test cases.

| FR | Module | Architecture element | Test cases |
|---|---|---|---|
| FR-AUTH-01 | AUTH | System modules 5.4 (login), section 7 (Auth) | TC-CI-AUTH-01, TC-SI-AUTH-01 |
| FR-AUTH-02 | AUTH | System modules 6 (route groups) | TC-SI-AUTH-01, TC-U-AUTH-03 |
| FR-AUTH-03 | AUTH | System modules 6.1 (platform restriction, D-38) | TC-CI-AUTH-02, TC-ST-ACC-01, TC-U-AUTH-03 |
| FR-AUTH-04 | AUTH | System modules 5.4, steps 2 and 4. Offline sync design 9. | TC-CI-DB-02, TC-SI-AUTH-02 |
| FR-AUTH-05 | AUTH | Offline sync design 9 (CAUTION) | TC-CI-AUTH-03, TC-ST-OJT-04 |
| FR-PROF-01 | PROF | Local table `user_profile`. Pull scope (offline sync design 5). | TC-SI-AUTH-02, TC-ST-OJT-05 |
| FR-DTR-01 | DTR | System modules 5.1 (time-in flow) | TC-ST-OJT-01, TC-U-DTR-01 |
| FR-DTR-02 | DTR | System modules 5.1 (same path). Data model `punches.type`. | TC-ST-OJT-01, TC-U-DTR-02 |
| FR-DTR-03 | DTR | Offline sync design 8. Data model `punches`. | TC-CI-SYNC-01, TC-U-DTR-04 |
| FR-DTR-04 | DTR | Data model `punches.lat`, `lng`, `accuracy_m`. Plugin `@capacitor/geolocation`. | TC-U-DTR-04 |
| FR-DTR-06 | DTR | Data model rules 5 and 6 (sessions from punches) | TC-ST-OJT-01, TC-U-UTIL-01 to TC-U-UTIL-05 |
| FR-DTR-07 | DTR | Offline sync design 3 (sync status) | TC-ST-OJT-01 |
| FR-DTR-08 | DTR | System modules 5.1 (rule check) | TC-U-DTR-01 |
| FR-DTR-10 | DTR | Pull scope of the facilitator (offline sync design 5) | TC-CI-ACL-02, TC-ST-FAC-01, TC-UAT-FAC-01 |
| FR-COR-01 | COR | System modules 5.3, step 1 | TC-SI-COR-01 |
| FR-COR-02 | COR | System modules 5.3, step 3. Conflict rules (offline sync design 7). | TC-CI-RPT-02, TC-SI-COR-01, TC-ST-FAC-01 |
| FR-COR-03 | COR | System modules 5.3, step 4. D-05. `punches.corrects_punch_id`. | TC-SI-COR-01, TC-U-COR-01, TC-U-UTIL-05 |
| FR-RPT-01 | RPT | System modules 5.2. Data model `weekly_reports`. | TC-SI-RPT-01, TC-ST-OJT-02 |
| FR-RPT-02 | RPT | Data model rule 5 (hours from punches) | TC-SI-RPT-01, TC-U-RPT-02, TC-U-UTIL-04 |
| FR-RPT-04 | RPT | System modules 5.2. Outbox (offline sync design 4). | TC-SI-RPT-01, TC-ST-OJT-02, TC-U-RPT-01 |
| FR-RPT-05 | RPT | System modules 5.2. Conflict rules (offline sync design 7). | TC-CI-RPT-02, TC-SI-RPT-01, TC-ST-FAC-01 |
| FR-RPT-06 | RPT | Conflict rules (offline sync design 7, report content) | TC-SI-RPT-01, TC-U-RPT-01 |
| FR-RPT-07 | RPT | System modules 5.2 (server approves the week). `punches.approved`. | TC-CI-RPT-01, TC-SI-RPT-01 |
| FR-MON-01 | MON | Module catalogue (MON). `punches.approved`, A-06. | TC-ST-OJT-05, TC-U-MON-01 |
| FR-MON-02 | MON | Pull scope of the facilitator (offline sync design 5) | TC-ST-FAC-01, TC-UAT-FAC-01 |
| FR-MON-03 | MON | Data API with RLS (system modules 7). See observation O-1. | TC-ST-ADM-01, TC-UAT-ADM-01 |
| FR-EXP-01 | EXP | Module catalogue (EXP). Plugins `@capacitor/filesystem`, `@capacitor/share`. Q-08 layout. | TC-CI-EXP-01, TC-ST-OJT-02 |
| FR-ADM-01 | ADM | Edge Function `admin-users`. Sign-up control (network 5). | TC-CI-ADM-01, TC-ST-ADM-01 |
| FR-ADM-02 | ADM | Table `companies`, Data API (system modules 7) | TC-CI-ADM-01, TC-ST-ADM-01 |
| FR-ADM-03 | ADM | Table `batches`, Data API (system modules 7) | TC-CI-ADM-01, TC-ST-ADM-01 |
| FR-ADM-04 | ADM | Table `ojt_assignments`. Data model rule 3. | TC-CI-ADM-01, TC-ST-ADM-01 |
| FR-AUD-01 | AUD | Audit triggers (system modules 7). Data model rule 4. | TC-CI-AUD-01, TC-CI-RPT-01 |
| FR-SYNC-01 | SYNC | Offline sync design 1 and 4 | TC-CI-DB-01, TC-CI-DB-02, TC-SI-SYNC-01, TC-U-SYNC-01, TC-U-SYNC-02 |
| FR-SYNC-02 | SYNC | Offline sync design 6 (triggers) | TC-SI-SYNC-01, TC-U-SYNC-03, TC-U-SYNC-04 |
| FR-SYNC-03 | SYNC | Offline sync design 6 (pull-to-refresh) | TC-ST-OJT-01 |
| FR-SYNC-04 | SYNC | QR-IC-08. Shared offline banner (QR-MA-02). Plugin `@capacitor/network`. | TC-ST-OJT-01 |
| FR-SYNC-05 | SYNC | Offline sync design 4, step 4.1. Table `processed_ops`. | TC-CI-SYNC-01, TC-SI-SYNC-02 |
| FR-SYNC-06 | SYNC | Offline sync design 4, step 6 | TC-CI-SYNC-02, TC-CI-SYNC-04, TC-ST-OJT-03, TC-U-SYNC-02 |
| FR-SYNC-07 | SYNC | Offline sync design 5 (pull) | TC-CI-SYNC-03, TC-SI-SYNC-01, TC-U-SYNC-05 |
| FR-SYNC-08 | SYNC | Offline sync design 13. Network 4. | TC-SI-SYNC-06 |

Result: 40 of 40 "Must" FRs map to a module, an architecture element, and one or more test cases.

### 5.1 Observations (not defects)

| ID | Observation | Action |
|---|---|---|
| O-1 | The design does not name the query for the admin dashboard (FR-MON-03). | Define a view or an RPC function in `api-contract.md` in S3. |
| O-2 | The secure storage plugin for tokens (QR-SE-03) is not selected. | Select it in S1. Include it in TC-SI-PLUG-01. |
| O-3 | `ops.heartbeat` is in the `ops` schema. The Data API shows only exposed schemas. | In S1, add a `public.heartbeat` wrapper function, or expose only this function. Record it in `api-contract.md`. |

## 6. Defects

All six review defects are in `defect-log.md`.

| Severity | Found | Closed | Open |
|---|---|---|---|
| S1 | 0 | 0 | 0 |
| S2 | 0 | 0 | 0 |
| S3 | 4 | 4 | 0 |
| S4 | 2 | 2 | 0 |

## 7. Stage exit criteria (test plan, section 8)

| Criterion | Result | Evidence |
|---|---|---|
| All review defects closed | Yes | DEF-001 to DEF-006 are closed |
| Each "Must" FR maps to a module and to one or more test cases | Yes | Section 5 |
| The user accepts the default answers or gives answers to Q-01 to Q-08 | Yes | Charter, section 7 |
| The user accepts the test plan | Yes, 2026-10-25 | D-33 |

## 8. Skipped tests and limits

1. TC-ST-REV-03 did not run. No UI prototype that agrees with the requirements exists. Waiver D-33.
2. The review used one reviewer (an agent). The test plan, section 16, gives this risk.

## 9. Decision

The S0 gate passes. S1 can start.

The S1 entry criteria are not all met: the two Supabase projects do not exist yet (D-35). S1 starts with the tasks that do not need the backend (D-39).
