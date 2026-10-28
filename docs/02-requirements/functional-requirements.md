# Functional requirements

This document gives the functional requirements (FR) of the OJT-DTR system. The requirements are in groups. Each group is one module.

## 1. Column meanings

| Column | Meaning |
|---|---|
| Role | O = OJT, F = facilitator, A = admin |
| Platform | M = mobile app, W = web app |
| Offline | Yes = the function operates without network. Queue = the app keeps the change and sends it later. No = the function needs network. |
| Priority | Must, Should, or Could (MoSCoW) |

## 2. AUTH: Authentication and session

| ID | Requirement | Role | Platform | Offline | Priority |
|---|---|---|---|---|---|
| FR-AUTH-01 | The system must let a user log in with an email address and a password. | O, F, A | M, W | No | Must |
| FR-AUTH-02 | After login, the system must show only the modules for the role of the user. | O, F, A | M, W | Yes | Must |
| FR-AUTH-03 | The mobile app must accept only OJT and facilitator accounts. The web app must accept only admin accounts. | O, F, A | M, W | No | Must |
| FR-AUTH-04 | If a user logged in on the device before, the mobile app must open without network. | O, F | M | Yes | Must |
| FR-AUTH-05 | The system must let a user log out. If unsynced changes exist, the app must show a CAUTION and ask for confirmation. | O, F, A | M, W | Yes | Must |
| FR-AUTH-06 | The system should let a user change the password. | O, F, A | M, W | No | Should |
| FR-AUTH-07 | The system should let an admin reset the password of a user. | A | W | No | Should |

## 3. PROF: Profile

| ID | Requirement | Role | Platform | Offline | Priority |
|---|---|---|---|---|---|
| FR-PROF-01 | The app must show the profile and the assignment of the user: host company, facilitator, batch, and required hours. | O, F | M | Yes | Must |
| FR-PROF-02 | The app can let a user change the contact number and the profile photo. | O, F | M | Queue | Could |

## 4. DTR: Daily time record

| ID | Requirement | Role | Platform | Offline | Priority |
|---|---|---|---|---|---|
| FR-DTR-01 | The app must let an OJT record a time-in. | O | M | Yes | Must |
| FR-DTR-02 | The app must let an OJT record a time-out for the open work session. | O | M | Yes | Must |
| FR-DTR-03 | Each punch must store the device time, the time zone, the device ID, and the server receive time. | O | M | Yes | Must |
| FR-DTR-04 | If the user gives location permission, each punch must store the location and its accuracy. | O | M | Yes | Must |
| FR-DTR-05 | If the host company setting requires a photo, the app should take a selfie photo for each punch. | O | M | Yes | Should |
| FR-DTR-06 | The app must calculate the hours of each day and each week from the closed work sessions. | O, F | M | Yes | Must |
| FR-DTR-07 | The app must show the DTR history by day and by week. Each entry must show its sync status. | O | M | Yes | Must |
| FR-DTR-08 | The app must not let an OJT record a time-in when a work session is open. | O | M | Yes | Must |
| FR-DTR-09 | The app should mark a work session as "Missing time-out" when the session has no time-out 16 hours after its time-in. The 16 hours is a setting (D-37). | O, F | M | Yes | Should |
| FR-DTR-10 | The app must let a facilitator see the DTR of each assigned OJT. | F | M | Yes (cached) | Must |
| FR-DTR-11 | The app should show a flag on a punch that has a doubtful device time. | F, A | M, W | Yes | Should |

## 5. COR: Correction requests

| ID | Requirement | Role | Platform | Offline | Priority |
|---|---|---|---|---|---|
| FR-COR-01 | The app must let an OJT send a correction request to add a punch or to change the time of a punch. The request must have a reason. | O | M | Queue | Must |
| FR-COR-02 | The app must let a facilitator approve or reject a correction request with a remark. | F | M | Queue | Must |
| FR-COR-03 | The system must keep the original punch. An approved correction must make a new punch that refers to the original punch. | O, F | M | Yes | Must |

## 6. RPT: Weekly report

| ID | Requirement | Role | Platform | Offline | Priority |
|---|---|---|---|---|---|
| FR-RPT-01 | The app must let an OJT write a weekly report for one week (Monday to Sunday). The report has these sections: tasks done, skills learned, problems, and plans for next week. | O | M | Yes | Must |
| FR-RPT-02 | The weekly report must show the logged hours of that week. The app calculates the hours from the DTR. | O, F | M | Yes | Must |
| FR-RPT-03 | The app should let an OJT attach a maximum of five photos to a weekly report. | O | M | Queue | Should |
| FR-RPT-04 | The app must let an OJT submit a weekly report. If the network is not available, the app must queue the submission. | O | M | Queue | Must |
| FR-RPT-05 | The app must let a facilitator approve a weekly report or return it with remarks. | F | M | Queue | Must |
| FR-RPT-06 | The app must let an OJT change a weekly report only when its status is `draft` or `returned`. | O | M | Yes | Must |
| FR-RPT-07 | When a facilitator approves a weekly report, the system must approve the DTR entries of that week (A-05). | F | M | Queue | Must |
| FR-RPT-08 | The system should keep a history of the status changes and the remarks of each weekly report. | O, F, A | M, W | Yes | Should |

## 7. MON: Progress monitoring

| ID | Requirement | Role | Platform | Offline | Priority |
|---|---|---|---|---|---|
| FR-MON-01 | The app must show the OJT the logged hours, the approved hours, the remaining hours, and the percent complete. | O | M | Yes (cached) | Must |
| FR-MON-02 | The app must show the facilitator a list of assigned OJTs. Each item shows hours, the last time-in, and the report status of the current week. | F | M | Yes (cached) | Must |
| FR-MON-03 | The web app must show the admin a dashboard: OJT count for each batch and company, late reports, and OJTs behind schedule. | A | W | No | Must |
| FR-MON-04 | The web app should let the admin filter OJTs by batch, host company, and facilitator. | A | W | No | Should |

## 8. NOTI: Notifications

| ID | Requirement | Role | Platform | Offline | Priority |
|---|---|---|---|---|---|
| FR-NOTI-01 | The app should show a local reminder for time-out at a set time if a work session is open. | O | M | Yes | Should |
| FR-NOTI-02 | The app should show a local reminder when a weekly report is due. | O | M | Yes | Should |
| FR-NOTI-03 | The system should send a push notification to the OJT when a facilitator approves or returns a report, or decides on a correction request. | O | M | No | Should |
| FR-NOTI-04 | The system can send a push notification to the facilitator when an OJT submits a report. | F | M | No | Could |
| FR-NOTI-05 | The app should show a list of notifications in the app. | O, F | M | Yes (cached) | Should |

## 9. EXP: Export

| ID | Requirement | Role | Platform | Offline | Priority |
|---|---|---|---|---|---|
| FR-EXP-01 | The app must let an OJT export the DTR for a date range as a PDF file. The app saves the file and opens the share sheet. | O | M | Yes | Must |
| FR-EXP-02 | The app should let an OJT export an approved weekly report as a PDF file. | O | M | Yes | Should |
| FR-EXP-03 | The web app should let the admin export a DTR summary and a report summary for a batch as CSV. | A | W | No | Should |

## 10. ADM: Administration

| ID | Requirement | Role | Platform | Offline | Priority |
|---|---|---|---|---|---|
| FR-ADM-01 | The web app must let the admin create, change, and deactivate user accounts of all roles. | A | W | No | Must |
| FR-ADM-02 | The web app must let the admin create and change host companies. | A | W | No | Must |
| FR-ADM-03 | The web app must let the admin create and change batches: name, start date, end date, and required hours. | A | W | No | Must |
| FR-ADM-04 | The web app must let the admin assign an OJT to a host company, a facilitator, and a batch. | A | W | No | Must |
| FR-ADM-05 | The web app can let the admin import user accounts from a CSV file. | A | W | No | Could |
| FR-ADM-06 | The web app can let the admin set host company settings: photo required, location required. | A | W | No | Could |

## 11. AUD: Audit log

| ID | Requirement | Role | Platform | Offline | Priority |
|---|---|---|---|---|---|
| FR-AUD-01 | The system must record an audit entry for each approval, return, rejection, correction, user change, and assignment change. | All | Server | Not applicable | Must |
| FR-AUD-02 | The web app should let the admin see and filter the audit log. | A | W | No | Should |

## 12. SYNC: Offline sync

| ID | Requirement | Role | Platform | Offline | Priority |
|---|---|---|---|---|---|
| FR-SYNC-01 | The app must save each OJT and facilitator change in the local database first. Then the app must send the change to the server. | O, F | M | Yes | Must |
| FR-SYNC-02 | The app must start a sync automatically when the network becomes available, when the app opens, and every 5 minutes while the app is open. | O, F | M | Yes | Must |
| FR-SYNC-03 | The app must let the user start a sync manually with pull-to-refresh. | O, F | M | Yes | Must |
| FR-SYNC-04 | The app must always show the network status and the number of unsynced changes. | O, F | M | Yes | Must |
| FR-SYNC-05 | The server must apply each change one time only, also when the app sends the change again. | O, F | Server | Not applicable | Must |
| FR-SYNC-06 | If the server does not accept a change, the app must show the change on a "Sync issues" screen. The screen shows the change, the cause, and the possible user actions. | O, F | M | Yes | Must |
| FR-SYNC-07 | The app must get the changes that other users made, for example approvals, remarks, and new assignments. | O, F | M | No | Must |
| FR-SYNC-08 | The app must show "Server not reachable" when the network is available but the server does not answer. This message must be different from "No network". | O, F | M | Yes | Must |

## 13. Capacitor plugins and the requirements that use them

| Plugin | Requirements |
|---|---|
| `@capacitor/network` | FR-SYNC-02, FR-SYNC-04, FR-SYNC-08 |
| `@capacitor-community/sqlite` | FR-AUTH-04, FR-SYNC-01, FR-DTR-01 to FR-DTR-10 |
| `@capacitor/geolocation` | FR-DTR-04 |
| `@capacitor/camera` | FR-DTR-05, FR-RPT-03, FR-PROF-02 |
| `@capacitor/local-notifications` | FR-NOTI-01, FR-NOTI-02 |
| `@capacitor/push-notifications` | FR-NOTI-03, FR-NOTI-04 |
| `@capacitor/filesystem` and `@capacitor/share` | FR-EXP-01, FR-EXP-02 |
| `@capacitor/app` | FR-SYNC-02 (app resume event) |
| A secure storage plugin | QR-SE-03 (token storage) |

## 14. Summary

| Module | Must | Should | Could | Total |
|---|---|---|---|---|
| AUTH | 5 | 2 | 0 | 7 |
| PROF | 1 | 0 | 1 | 2 |
| DTR | 8 | 3 | 0 | 11 |
| COR | 3 | 0 | 0 | 3 |
| RPT | 6 | 2 | 0 | 8 |
| MON | 3 | 1 | 0 | 4 |
| NOTI | 0 | 4 | 1 | 5 |
| EXP | 1 | 2 | 0 | 3 |
| ADM | 4 | 0 | 2 | 6 |
| AUD | 1 | 1 | 0 | 2 |
| SYNC | 8 | 0 | 0 | 8 |
| Total | 40 | 15 | 4 | 59 |
