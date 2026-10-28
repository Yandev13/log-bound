# Quality requirements (ISO/IEC 25010:2023)

This document gives the quality requirements (QR) of the OJT-DTR system. The requirements follow the product quality model of ISO/IEC 25010:2023. The system is "polished" when it meets each "Must" quality requirement at the S5 gate.

## 1. The quality model

ISO/IEC 25010:2023 has nine product quality characteristics. The 2011 edition had eight. Some names changed. Use the table below if a teacher uses the 2011 names.

| Code | 2023 characteristic | 2011 name | Sub-characteristics (2023) |
|---|---|---|---|
| FS | Functional suitability | Same | Functional completeness, functional correctness, functional appropriateness |
| PE | Performance efficiency | Same | Time behaviour, resource utilization, capacity |
| CO | Compatibility | Same | Co-existence, interoperability |
| IC | Interaction capability | Usability | Appropriateness recognizability, learnability, operability, user error protection, user engagement, inclusivity, user assistance, self-descriptiveness |
| RE | Reliability | Same | Faultlessness, availability, fault tolerance, recoverability |
| SE | Security | Same | Confidentiality, integrity, non-repudiation, accountability, authenticity, resistance |
| MA | Maintainability | Same | Modularity, reusability, analysability, modifiability, testability |
| FL | Flexibility | Portability | Adaptability, scalability, installability, replaceability |
| SF | Safety | (new) | Operational constraint, risk identification, fail safe, hazard warning, safe integration |

NOTE: The 2023 edition moved the quality-in-use model to ISO/IEC 25019:2023. This project measures quality in use in the user acceptance test (section 12).

## 2. Reference test conditions

These conditions apply to all measures in this document, unless a requirement gives other conditions.

| Item | Condition |
|---|---|
| Reference phone | One mid-range Android phone, Android 11 or later, 4 GB RAM or more. Record the model in the test report. |
| Network | Wi-Fi or 4G. For slow network tests, use the "Slow 3G" profile. |
| Backend | Supabase project `ojt-dtr-dev` on the Free plan, active (not paused). Record the compute size in the test report. |
| Data | Seed data: 500 OJTs, 50 facilitators, 10 host companies, 3 batches, 100 days of punches for 50 OJTs |

## 3. Functional suitability (FS)

| ID | Sub-characteristic | Requirement | Measure and target | Priority |
|---|---|---|---|---|
| QR-FS-01 | Functional completeness | The system must implement all "Must" functional requirements. | 100% of "Must" FRs pass a system test at the S5 gate. | Must |
| QR-FS-02 | Functional correctness | The hours calculation must be correct. | 100% of the hours test data set gives the correct result to the minute. The set includes midnight, multiple sessions, and corrections. | Must |
| QR-FS-03 | Functional appropriateness | The OJT must record a time-in with few actions. | Two taps or fewer from the home screen. | Must |

## 4. Performance efficiency (PE)

| ID | Sub-characteristic | Requirement | Measure and target | Priority |
|---|---|---|---|---|
| QR-PE-01 | Time behaviour | A time-in or time-out must show a confirmation quickly, also offline. | 1 second or less on the reference phone. | Must |
| QR-PE-02 | Time behaviour | The mobile app must open quickly. | Cold start to the home screen in 3 seconds or less on the reference phone. | Should |
| QR-PE-03 | Time behaviour | The API must answer list requests quickly. | 95th percentile 800 ms or less, at 20 concurrent users, warm server. | Should |
| QR-PE-04 | Time behaviour | A sync of a full outbox must be quick. | 100 queued changes sync in 30 seconds or less on Wi-Fi. | Must |
| QR-PE-05 | Resource utilization | Photos must be small. | Each photo is 500 KB or less after compression. | Must |
| QR-PE-06 | Resource utilization | The app must be small. | Release APK is 25 MB or less. | Should |
| QR-PE-07 | Capacity | The system must support the seed data volume. | QR-PE-03 passes with the seed data of section 2. | Should |

## 5. Compatibility (CO)

| ID | Sub-characteristic | Requirement | Measure and target | Priority |
|---|---|---|---|---|
| QR-CO-01 | Co-existence | The app must not run background services when it is closed. The app uses the operating system scheduler for reminders. | No background service in the Android manifest, except the services of the notification plugins. | Should |
| QR-CO-02 | Interoperability | The API must use a documented standard format. | REST with JSON (Supabase Data API). `api-contract.md` describes 100% of the tables, policies, RPC functions, and Edge Functions (D-23). | Must |
| QR-CO-03 | Interoperability | Exports must open in common tools. | PDF opens in a standard PDF reader. CSV (UTF-8) opens in Excel and Google Sheets with correct columns. | Must |

## 6. Interaction capability (IC)

| ID | Sub-characteristic | Requirement | Measure and target | Priority |
|---|---|---|---|---|
| QR-IC-01 | Appropriateness recognizability | The home screen of each role must show the primary action of that role. | All usability test users find the primary action in 10 seconds or less. | Must |
| QR-IC-02 | Learnability | A new OJT must learn the main tasks without help. | 4 of 5 new users complete time-in, time-out, and a report draft in the first session without help. | Must |
| QR-IC-03 | Operability | Controls must be easy to touch. | Each touch target is 44 x 44 points (iOS) or 48 x 48 dp (Android) or larger. | Must |
| QR-IC-04 | User error protection | The app must prevent and explain user errors. | Each irreversible action (submit, approve, return, reject, deactivate) asks for confirmation. Each form error shows at its field with the cause and the correction. | Must |
| QR-IC-05 | User engagement | Users must find the app satisfactory. | Mean System Usability Scale (SUS) score of 70 or more. | Should |
| QR-IC-06 | Inclusivity | The app must be usable by people with low vision. | Text contrast 4.5:1 or more (WCAG 2.1 AA). The layout stays usable at 200% font size. | Must |
| QR-IC-07 | User assistance | Screen readers must read all controls. | 100% of controls have an accessible name (TalkBack and browser screen reader test). Zero "serious" or "critical" axe results on web screens. | Should |
| QR-IC-08 | Self-descriptiveness | The app must always show the network and sync state. | Each mobile screen shows the network status. Each record shows its sync status with an icon and a text label. | Must |

## 7. Reliability (RE)

| ID | Sub-characteristic | Requirement | Measure and target | Priority |
|---|---|---|---|---|
| QR-RE-01 | Faultlessness | The release must not have serious defects. | Zero open S1 and S2 defects at the S5 gate. | Must |
| QR-RE-02 | Availability | The mobile functions marked "Offline = Yes" must operate without network. | 100% of these functions pass the offline system test after the first login. | Must |
| QR-RE-03 | Fault tolerance | Network faults must not cause data loss or duplicates. | Network fault test: 200 operations with random disconnects. The server has exactly 200 records. Zero duplicates. | Must |
| QR-RE-04 | Recoverability | The app must recover if it stops during a sync. | Stop the app during a sync 10 times. After each restart, the sync finishes with zero loss and zero duplicates. | Must |
| QR-RE-05 | Recoverability | The server data must be recoverable. | An encrypted own backup exists that is 8 days old or less. One restore test passes before the S4 gate (D-18). | Must |
| QR-RE-06 | Availability | The backend must stay active on the Free plan. | Two automatic keep-alive sources run each day. At each routine check, the newest heartbeat of each source is less than 48 hours old. Zero unplanned pauses of `prod`. | Must |
| QR-RE-07 | Recoverability | The backend must recover from a pause or a loss. | Resume and smoke test in 30 minutes or less. Rebuild from git and the newest backup in 2 hours or less. After a rebuild, the devices send their records of the last 30 days again (D-19). | Must |
| QR-RE-08 | Fault tolerance | The apps must survive a backend that is not reachable. | With the backend paused or blocked for 24 hours: zero data loss, zero forced sign-outs, and the "Server not reachable" message shows. | Must |

## 8. Security (SE)

| ID | Sub-characteristic | Requirement | Measure and target | Priority |
|---|---|---|---|---|
| QR-SE-01 | Confidentiality | Each user must see only permitted data. An OJT sees only own data. A facilitator sees only assigned OJTs. The server enforces these rules. | 100% of the access matrix tests pass. The tests include forged requests with other IDs. | Must |
| QR-SE-02 | Confidentiality | All traffic must be encrypted. | HTTPS with TLS 1.2 or later for all production traffic. Plain HTTP is only for local development. | Must |
| QR-SE-03 | Confidentiality | Tokens must be short-lived and stored safely. | Access token (JWT) life 15 minutes or less. Refresh tokens rotate on each use. Reuse of an old refresh token is detected. An online sign-out revokes the session. An offline sign-out removes the tokens from the device. Tokens are in secure storage on the device (D-22). | Must |
| QR-SE-04 | Authenticity | Passwords must be stored safely. | Supabase Auth stores bcrypt hashes. The minimum password length is 8 characters. Passwords never appear in project logs. | Must |
| QR-SE-05 | Integrity | The server must validate all input and protect records. | Each database function validates its input. Tables have check constraints. Punches are append-only. Updates use a version check. | Must |
| QR-SE-06 | Non-repudiation | Each punch and each decision must show who did it, on which device, and when. | Each punch and decision record has the user ID, the device ID, and the server time. | Must |
| QR-SE-07 | Accountability | The audit log must be complete and read-only. | 100% of the events in FR-AUD-01 make an audit entry. No RLS policy or function lets a user change or delete an audit entry. | Must |
| QR-SE-08 | Resistance | The login must resist password guess attacks. | The Supabase Auth sign-in rate limit is on. A burst of failed logins from one client gets HTTP 429 (D-22). | Must |
| QR-SE-09 | Resistance | The system must have no known serious vulnerabilities. | Zero "high" or "critical" results in `npm audit` (production dependencies). Zero errors in the Supabase security advisor. Zero tables in `public` without RLS. | Should |
| QR-SE-10 | Confidentiality | The local database should be encrypted. | The SQLite database uses the encryption option of the plugin. | Could |

## 9. Maintainability (MA)

| ID | Sub-characteristic | Requirement | Measure and target | Priority |
|---|---|---|---|---|
| QR-MA-01 | Modularity | Features must be independent. | Zero imports from one feature folder to another feature folder (lint rule). | Must |
| QR-MA-02 | Reusability | Common UI parts must be shared components. | Status chip, hours card, offline banner, and empty state are in `shared/`. | Should |
| QR-MA-03 | Analysability | Faults must be easy to find. | Edge Function logs are JSON with a request ID. The app keeps a sync log of the last 200 sync events. | Must |
| QR-MA-04 | Modifiability | The code must be clean and typed. | Zero lint errors. TypeScript strict mode on. Cyclomatic complexity 10 or less for each function. | Must |
| QR-MA-05 | Testability | The code must have automated tests. | Line coverage: 80% or more for `data/sync`, DTR calculation, and auth guards. 70% or more for the backend. 60% or more for the frontend. | Must |

NOTE: For the backend, QR-MA-05 uses rule-item coverage, not line coverage (D-52). The items are the functions, the RLS and Storage policies, and the `sync_push` cause codes in the migrations. The list is `system/backend/tests/coverage-map.json`.

## 10. Flexibility (FL)

| ID | Sub-characteristic | Requirement | Measure and target | Priority |
|---|---|---|---|---|
| QR-FL-01 | Adaptability | One codebase must run on Android, iOS, and web. | The Android and web builds come from one repository. The iOS build uses the same repository if a Mac is available. Environment files hold the platform settings. | Must |
| QR-FL-02 | Scalability | The backend logic must be stateless. | Database functions and Edge Functions keep no state between calls, except in tables. | Should |
| QR-FL-03 | Installability | The system must be easy to install. | The APK installs in 2 minutes or less. The admin web app needs no installation. A new developer runs the full system in 30 minutes or less with `developer-setup.md`. | Must |
| QR-FL-04 | Replaceability | The storage must be replaceable. | All data access goes through repository interfaces. A test replaces SQLite with an in-memory adapter. | Should |
| QR-FL-05 | Adaptability | The apps must operate on the target platforms. | Android 11 or later. iOS 15 or later, if a build is possible. For admin: the two latest versions of Chrome, Edge, Firefox, and Safari. | Must |

## 11. Safety (SF)

This system does not control equipment. Safety applies to the protection of user data and work records.

| ID | Sub-characteristic | Requirement | Measure and target | Priority |
|---|---|---|---|---|
| QR-SF-01 | Operational constraint | The app must not let a user remove unsynced data without a warning. | Logout and "clear data" show a CAUTION and the count of unsynced changes. The user must confirm. | Must |
| QR-SF-02 | Risk identification | The app must show records that have a risk. | Sync issues and doubtful-time flags are visible to the user and the facilitator. | Must |
| QR-SF-03 | Fail safe | A sync error must not delete local data. | The app never deletes a record with sync status `pending` or `issue`. | Must |
| QR-SF-04 | Hazard warning | The app must warn about old unsynced data. | The app shows a warning when a change is unsynced for 72 hours or more. | Should |
| QR-SF-05 | Safe integration | A denied plugin permission must not stop core functions. | If the user denies location or camera permission, the punch is still saved. The punch gets a flag. | Must |

## 12. Quality in use (measured in the user acceptance test)

| Measure | Target |
|---|---|
| Effectiveness: task completion rate in UAT scripts | 90% or more |
| Efficiency: time to submit a weekly report (after the text is ready) | 2 minutes or less |
| Satisfaction: SUS score | 70 or more (same as QR-IC-05) |
| Freedom from risk: data loss events during UAT | Zero |

## 13. Summary

| Characteristic | Must | Should | Could |
|---|---|---|---|
| FS | 3 | 0 | 0 |
| PE | 3 | 4 | 0 |
| CO | 2 | 1 | 0 |
| IC | 6 | 2 | 0 |
| RE | 8 | 0 | 0 |
| SE | 8 | 1 | 1 |
| MA | 4 | 1 | 0 |
| FL | 3 | 2 | 0 |
| SF | 4 | 1 | 0 |
