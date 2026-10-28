# TL;DR: OJT-DTR in plain words

A short summary of this document for readers who are not technical. Read it in 3 minutes. For the full data, read the numbered tabs.

## What is it?

An app that replaces the paper time sheet and the weekly report of OJT trainees.

- **OJTs** use a phone app. They tap "Time in" and "Time out", and they write a short report each week.
- **Facilitators** use the same phone app. They check the hours and approve or return the reports.
- **Admins** use a website. They add users, companies, and batches, and they see a dashboard.

## The main idea: it works without internet

Many OJTs work at sites with a bad signal. The app saves each record on the phone first. When the internet comes back, the app sends the records to the server automatically. No record is lost.

A badge on the screen always shows "online" or "offline" and how many records wait to be sent.

## What can each user do?

| User | Main tasks |
|---|---|
| OJT | Record time-in and time-out. See the hours done and the hours left. Write and submit weekly reports. Ask for a correction of a wrong time. Export the DTR as a PDF. |
| Facilitator | See the list of OJTs. Check their hours. Approve or return reports. Approve or reject corrections. |
| Admin | Manage users, host companies, and batches. See late reports and OJTs that are behind. Export summaries. |

## How it is built (one line each)

- **App:** one code base (Ionic + Angular + Capacitor) makes the Android app and the admin website.
- **Server:** Supabase, a free online database with login and file storage.
- **Phone features:** offline database, network check, location, camera, reminders, push messages, PDF sharing.
- **Cost:** zero. All services use free plans. Scheduled jobs keep the free server active, and a backup runs each week.

## Is it safe?

- Each user sees only their own data. A facilitator sees only their assigned OJTs.
- All traffic is encrypted (HTTPS).
- A time record is never deleted. A correction adds a new record, and the system keeps a log of each approval.

## How do we know it works?

We test from the bottom up: first the small parts, then the full system.

- **98 test cases** in five levels, from unit tests to user acceptance tests.
- Special tests turn off the internet, slow it down, or stop the server during work. The target is zero lost records.
- Quality targets follow ISO/IEC 25010. Examples: time-in confirms in 1 second or less, and time-in takes two taps or fewer.

## Plan and dates

| Stage | Dates | Result |
|---|---|---|
| S0 Plan and design | Oct 21 to 27 | Documents and UI design (now) |
| S1 Foundation | Oct 28 to Nov 3 | Login and database |
| S2 Offline core | Nov 4 to 10 | Time records and sync |
| S3 Reports and admin | Nov 11 to 17 | Weekly reports and admin website |
| S4 Quality | Nov 18 to 24 | All tests and quality checks |
| S5 Release | Nov 25 to 28 | Final tests and hand-over |

## In one sentence

OJTs log their hours and reports on a phone, also without internet; facilitators approve them; admins manage everything on a website; and all of it runs on free services.
