# Presentation plan: S0 review (5 minutes)

This plan gives the slides, the time, and the talking points for the S0 presentation. One presenter speaks. The total time is 5 minutes or less. The presentation covers three parts:

1. The system (what and why), from the TL;DR tab.
2. The technical plan (modules, network, requirements, tests), from the System Documents tab.
3. The UI/UX design, from the UI/UX Mood Board tab and the Figma file.

## 1. Time budget

| # | Slide | Part | Time | Running total |
|---|---|---|---|---|
| 1 | Title and problem | 1 | 0:25 | 0:25 |
| 2 | Users and what each user does | 1 | 0:35 | 1:00 |
| 3 | Works without internet | 1 | 0:30 | 1:30 |
| 4 | Modules and technology | 2 | 0:35 | 2:05 |
| 5 | Network and free-tier plan | 2 | 0:30 | 2:35 |
| 6 | Requirements and tests | 2 | 0:35 | 3:10 |
| 7 | Mood board | 3 | 0:30 | 3:40 |
| 8 | Screens (mobile and web) | 3 | 0:45 | 4:25 |
| 9 | Timeline and next steps | All | 0:20 | 4:45 |
| - | Spare time | - | 0:15 | 5:00 |

Rule: about 75 words for each 30 seconds. Do not read the slide. Each slide has one main message.

## 2. Slides and talking points

### Slide 1. Title and problem (0:25)

- On the slide: "OJTTrack: OJT Weekly Report and DTR Monitoring System". Team names. One line: "Paper time sheets are slow, easy to lose, and hard to check."
- Say: "OJTs record hours on paper and send weekly reports by chat or email. Facilitators check them by hand. We make one app for all of this."

### Slide 2. Users (0:35)

- On the slide: three icons with one line each. OJT: log time, write reports. Facilitator: check and approve. Admin: manage users and see the dashboard.
- Say: "OJTs and facilitators use the same phone app. Admins use a website."

### Slide 3. Works without internet (0:30)

- On the slide: a simple flow. Phone saves the record, then the record waits in a queue, then the record goes to the server when online. Text: "Zero lost records."
- Say: "Many OJT sites have a bad signal. The app saves first and sends later. The screen always shows online or offline."

### Slide 4. Modules and technology (0:35)

- On the slide: the module map (Figure 1 of the System Documents tab). Logos or names: Ionic, Angular, Capacitor, Supabase.
- Say: "Eleven modules. One code base makes the Android app and the admin website. Capacitor plugins give offline storage, location, camera, reminders, and PDF sharing."

### Slide 5. Network and free tier (0:30)

- On the slide: the production topology (Figure 2). Text: "All free tiers. HTTPS only."
- Say: "The free server pauses after seven days without use. Daily scheduled calls keep it active, weekly backups protect the data, and the app keeps working if the server is down."

### Slide 6. Requirements and tests (0:35)

- On the slide: "59 functional requirements (40 Must)", "9 ISO/IEC 25010 quality characteristics", "98 test cases, bottom-up, 5 levels".
- Say: "We test from the bottom up, because the risk is in the offline database and the sync. We also test with no network, slow network, and server down."

### Slide 7. Mood board (0:30)

- On the slide: the mood board image (UI/UX Mood Board tab).
- Say: "Orange for actions, blue for headings and charts, teal for approved and synced, and crimson for errors. Poppins, Inter, and Roboto."
- Give credit to the UI/UX team by name.

### Slide 8. Screens (0:45)

- On the slide: Mobile Home, DTR log, and Weekly reports side by side. Then the web Dashboard.
- Say: "The OJT sees progress and sync status on Home. The admin sees totals and a review queue." Say one sentence: "Facilitator and login screens come next."
- Optional: show the Figma prototype live only if it opens fast. A screenshot is safer.

### Slide 9. Timeline and next steps (0:20)

- On the slide: the six stages, S0 to S5, with "We are here" at S0. Release: Nov 28.
- Say: "Next week we build login and the database. Thank you."

## 3. Preparation checklist

1. Make the slides from the three tabs of the Google Doc. Use the mood board colors and fonts for the slides.
2. Put the diagrams and screens as images. Do not use live links during the 5 minutes.
3. Do two practice runs with a timer. If a run is longer than 4:45, cut the spare words on slides 4 to 6 first.
4. Prepare short answers for likely questions: "What if the phone is offline for a week?", "Why Supabase?", "Can an OJT fake the time?"
