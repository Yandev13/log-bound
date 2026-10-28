# Project charter: OJT Weekly Report and DTR Monitoring System

This document gives the purpose, scope, roles, deliverables, assumptions, open questions, and risks of the project.

## 1. Purpose

The system lets OJTs record their daily time record (DTR) and submit weekly reports with a mobile app. Facilitators monitor and approve these records with the same app. Admins manage the system with a web app.

The mobile app must operate when the network is not available. It keeps changes on the device and sends them to the server when the network is available again.

## 2. Scope

### 2.1 In scope

1. Mobile app for Android, for the OJT and facilitator roles. The iOS build is optional (D-15).
2. Web app for the admin role.
3. Supabase backend: PostgreSQL database, Auth, Storage, database functions, and Edge Functions (D-14).
4. Offline operation of all OJT and facilitator functions that have "Offline = Yes" in the requirements.
5. Capacitor plugins: network, SQLite, geolocation, camera, local notifications, push notifications, filesystem, share.
6. PDF and CSV export.
7. Project documents: requirements, architecture, UI/UX design, test plan, test reports, user manuals.

### 2.2 Out of scope

1. Payroll or allowance calculation.
2. Grade calculation for the OJT course.
3. Integration with school systems (for example, a student information system).
4. Face recognition. The app keeps the photo only. A person examines the photo.
5. Desktop apps.

## 3. User roles and platforms

| Role | Description | Platform | Network |
|---|---|---|---|
| OJT | A trainee. Records the DTR and writes weekly reports. | Mobile app | Online and offline |
| Facilitator | Monitors a group of OJTs. Approves reports and corrections. | Mobile app (same app as OJT) | Online and offline |
| Admin | Manages users, host companies, batches, and assignments. Monitors all data. | Web app | Online only |

The OJT and the facilitator use the same mobile app. The app shows different modules for each role after login.

## 4. Deliverables

| ID | Deliverable | Stage |
|---|---|---|
| DL-01 | Module plan and module interactions | S0 |
| DL-02 | Network infrastructure plan | S0 |
| DL-03 | UI/UX design | S0 |
| DL-04 | Requirements and quality requirements | S0 |
| DL-05 | Test plan | S0 |
| DL-06 | Android app (APK) | S4 |
| DL-07 | iOS build (optional, D-15) | S4 |
| DL-08 | Admin web app (deployed) | S4 |
| DL-09 | Supabase backend (deployed) and operations runbook | S4 |
| DL-10 | Stage test reports and final test report | S0 to S5 |
| DL-11 | User manuals, install guide, developer setup, API reference | S5 |

## 5. Constraints

1. The frontend must use Ionic and Angular with standalone components.
2. The mobile app must have offline functions.
3. The system must use one or more Capacitor plugins.
4. The project time is about six weeks: 2026-10-21 to 2026-11-21 (D-29).
5. All cloud services must use free tiers only (D-16).

## 6. Assumptions

| ID | Assumption |
|---|---|
| A-01 | One OJT has one facilitator at a time. One facilitator has many OJTs. |
| A-02 | The admin represents the school OJT office. |
| A-03 | The admin sets the required hours for each batch. |
| A-04 | A week starts on Monday and ends on Sunday. The time zone is Asia/Manila. |
| A-05 | When a facilitator approves a weekly report, the DTR entries of that week also become approved. |
| A-06 | Approved hours count toward the required hours. Logged hours that are not approved do not count. |
| A-07 | An OJT can have more than one work session in a day (for example, a morning session and an afternoon session). |
| A-08 | Each user logs in online one time before the user can use the app offline. |

## 7. Open questions

The plan uses the default answer until the user gives a different answer.

| ID | Question | Default answer | Answer |
|---|---|---|---|
| Q-01 | Must the backend be custom code, or can it be a backend service (Firebase, Supabase)? | Custom Node.js + Express API with PostgreSQL (D-03) | Supabase, Free plan (D-14) |
| Q-02 | Does "network infrastructure" mean the cloud deployment design or a physical network design (routers, switches, LAN)? | Cloud and logical deployment design. A physical diagram is optional. | Cloud deployment, free tiers only (D-16) |
| Q-03 | Is the facilitator a host company supervisor or a school coordinator? Are there many host companies? | Host company supervisor. Many host companies. | Default accepted (2026-10-25). May change later, so design for change (D-30). |
| Q-04 | How must the system verify a time-in? | Location stamp (if permission given). Selfie is a company setting. QR code is optional. | Best practice accepted (2026-10-25). May change later, so design for change (D-30). |
| Q-05 | Is a Mac available for the iOS build? | No. Demonstrate on Android. Document the iOS build procedure. | Testers have iPhones. iOS is optional (D-15). A Mac is still necessary for an iOS build. |
| Q-06 | Is this a solo project or a group project? | Solo | Group project. Plan as solo until the first working draft (D-32). |
| Q-07 | What is the exact due date? | 2026-11-28 | Real date unknown. Use 2026-11-21 (the default minus one week) (D-29). |
| Q-08 | Must the DTR export or the weekly report follow an official form? | DTR export follows the layout of CS Form 48. Weekly report uses a simple layout. | Default accepted (2026-10-25). May change later, so design for change (D-30). |

## 8. Main risks

| ID | Risk | Effect | Mitigation |
|---|---|---|---|
| R-01 | The sync engine is more complex than planned. | All mobile modules are late. | Build and test the sync engine in S2, before other modules. Use the bottom-up test approach. |
| R-02 | The schedule is short. | Some functions are not complete. | Use MoSCoW priority. Complete all "Must" requirements first. |
| R-03 | No Mac is available for iOS. | No iOS build. | iOS is optional (D-15). Borrow a Mac for one build if possible. Else, document the iOS build procedure. |
| R-04 | Supabase pauses a Free plan project after 7 days of low activity. | Sync and login stop. A long pause can make the project impossible to resume. | Three protection layers (D-17). See the operations runbook. |
| R-05 | A user changes the device clock to make false punches. | Wrong hours. | Store the server time and the clock offset. Flag doubtful punches (see offline sync design, section 8). |
| R-06 | A plugin does not support the installed Capacitor version. | Build errors. | Record the versions in S1. Do a test build of each plugin in S1. |
| R-07 | New functions are added during the project. | The schedule slips. | Add a requirement and a decision before work starts (AGENTS.md, rule 11). |
| R-08 | Free plan limits (storage 1 GB, egress 5 GB, database 500 MB) are exceeded. | Uploads or requests fail. | Small photos, thumbnails, selfie off by default, weekly size check (runbook, section 1). |
| R-09 | The Free plan has no automatic backups. | A lost project loses all server data. | Weekly encrypted own backup (D-18). Devices send recent records again after a rebuild (D-19). |
| R-10 | The UI/UX and art team is late. | No final screens or assets. | Build wireframe-style screens with placeholders (D-31). Keep the UI replaceable. |
