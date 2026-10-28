# UI/UX mood board summary

This document records the current UI/UX mood board of the UI/UX team (D-26). The team owns the design. This file is a summary for the document set only. Do not change the design here.

- Source: [Figma file "OJT Weekly Report and DTR Monitoring"](https://www.figma.com/design/bMKurAvFxJW1rP2lVEMBx4/OJT-Weekly-Report-and-DTR-Monitoring)
- Image: `docs/deliverables/source/uiux-moodboard.jpg` (captured 2026-10-21)
- Product name in the design: **OJTTrack**

## 1. Colors

| Name | Hex | Role |
|---|---|---|
| Orange | `#FF7900` | Primary: actions, selected dates |
| Royal Blue | `#1440A0` | Primary: headings, charts |
| Navy | `#081A44` | Secondary: text, chrome |
| Mist | `#EEF2F8` | Secondary: backgrounds |
| Teal | `#12A38A` | Tertiary: approved, synced |
| Crimson | `#C93A4B` | Tertiary: errors, rejected |

## 2. Typography

| Font | Use |
|---|---|
| Poppins | Headings |
| Inter | Interface text |
| Roboto | Numbers and records (times, hours) |

## 3. Components

Buttons (Save record, Save draft, Preview report), status badges (Approved, Pending sync, Missing time-out, Draft), progress ring, and bar chart.

## 4. Screens in the design (2026-10-21)

| Platform | Screen | Status |
|---|---|---|
| Mobile (OJT) | Home | Done |
| Mobile (OJT) | DTR log | Done |
| Mobile (OJT) | Weekly reports list | Done |
| Mobile (OJT) | History | Done (frame name is "Mobile / Weekly reports") |
| Mobile (OJT) | PDF export | Done |
| Web (admin) | Dashboard | Done |
| Web (admin) | Weekly report review | Done |

## 5. Screens not in the design yet

| Area | Screens | Requirements |
|---|---|---|
| Facilitator (mobile) | Assigned OJT list, OJT DTR view, report approve or return, correction decision | FR-MON-02, FR-DTR-10, FR-RPT-05, FR-COR-02 |
| Shared (mobile) | Login, Profile, change password, logout with unsynced changes, notifications, sync issues, "No network" and "Server not reachable" states | FR-AUTH-01, 05, 06, FR-PROF-01, FR-NOTI-05, FR-SYNC-06, FR-SYNC-08 |
| OJT (mobile) | Weekly report editor (write, photos, submit), correction request | FR-RPT-01 to 04, FR-COR-01 |
| Admin (web) | Login, users, host companies, batches, assignments, audit log, CSV export | FR-ADM-01 to 04, FR-AUTH-07, FR-AUD-02, FR-EXP-03 |

## 6. Differences from the requirements

These items need a decision with the UI/UX team. See `PROGRESS.md`, "Open issues".

1. The DTR log uses typed times. The requirements use live punches with device time, location, and an optional selfie (FR-DTR-01 to 05).
2. The admin web app approves weekly reports. FR-RPT-05 gives this task to the facilitator on mobile.
3. The web menu has Committee Management, Alumni Records, and Reports and Analytics. No requirement covers these items.
4. Home shows rendered hours only. FR-MON-01 needs logged and approved hours. FR-SYNC-04 needs the number of unsynced changes.
