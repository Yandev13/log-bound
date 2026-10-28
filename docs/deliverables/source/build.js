const fs = require('fs');
const path = require('path');
const D = __dirname;
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  HeadingLevel, AlignmentType, WidthType, ShadingType, BorderStyle, PageBreak,
  LevelFormat, PageOrientation, Footer, PageNumber, TableOfContents, Header,
} = require('docx');

// VARIANT=core3 builds only the three S0 plans (DL-01, DL-02, DL-05) and numbers them 1 to 3.
const VARIANT = process.env.VARIANT || 'full';
const RENUM = VARIANT === 'core3' ? { '2': '1', '3': '2', '5': '3' } : null;
const renum = (t) => RENUM ? t.replace(/^(\d)(?=[.\s])/, d => RENUM[d] || d) : t;

const FONT = 'Arial';
const ACCENT = '1F4E79';
const HEAD_FILL = 'D9E2F3';
const PORTRAIT_W = 9360;   // Letter, 1" margins
const LAND_W = 12960;      // Letter landscape, 1" margins

const p = (text, opts = {}) => new Paragraph({
  spacing: { after: 120 }, ...opts,
  children: Array.isArray(text) ? text : [new TextRun({ text, font: FONT, size: 21, ...(opts.run || {}) })],
});
const h1 = (t, pageBreak = true) => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: pageBreak, children: [new TextRun({ text: renum(t) })] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: renum(t) })] });
const bullet = (t) => new Paragraph({ numbering: { reference: 'bul', level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text: t, font: FONT, size: 21 })] });
let numRef = 0;
const steps = (items) => { const ref = 'num' + (numRef++); numberingConfigs.push(numCfg(ref)); return items.map(t => new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text: t, font: FONT, size: 21 })] })); };
const numberingConfigs = [{ reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] }];
function numCfg(ref) { return { reference: ref, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] }; }

const border = { style: BorderStyle.SINGLE, size: 4, color: 'A6A6A6' };
const borders = { top: border, bottom: border, left: border, right: border };
function table(headers, rows, widths, total) {
  const sum = widths.reduce((a, b) => a + b, 0);
  const w = widths.map(x => Math.round(x * total / sum));
  w[w.length - 1] += total - w.reduce((a, b) => a + b, 0);
  const cell = (t, i, head) => new TableCell({
    borders, width: { size: w[i], type: WidthType.DXA },
    shading: head ? { fill: HEAD_FILL, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 50, bottom: 50, left: 90, right: 90 },
    children: String(t).replace(/`/g, '').split('\n').map(line => new Paragraph({ children: [new TextRun({ text: line, font: FONT, size: 18, bold: !!head })] })),
  });
  return new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: w,
    rows: [new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, i, true)) }),
      ...rows.map(r => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, i, false)) }))],
  });
}
const T = (h, r, w) => [table(h, r, w, PORTRAIT_W), p('')];
function img(file, widthPx) {
  const buf = fs.readFileSync(path.join(D, file));
  const W = buf.readUInt32BE(16), H = buf.readUInt32BE(20);
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new ImageRun({ type: 'png', data: buf, transformation: { width: widthPx, height: Math.round(widthPx * H / W) }, altText: { title: file, description: file, name: file } })] });
}
const caption = (t) => p([new TextRun({ text: t, font: FONT, size: 18, italics: true, color: '595959' })], { alignment: AlignmentType.CENTER });

// ---------- Content ----------
const cover = [
  new Paragraph({ spacing: { before: 2400, after: 200 }, children: [new TextRun({ text: 'OJT Weekly Report and DTR Monitoring System', font: FONT, size: 44, bold: true, color: ACCENT })] }),
  new Paragraph({ spacing: { after: 600 }, children: [new TextRun({ text: 'System Documents', font: FONT, size: 30, color: '404040' })] }),
  ...T(['Item', 'Value'], [
    ['Revision', 'Rev 1'], ['Date', '2026-10-21'], ['Course', 'SOFTDEV'],
    ['Contents', '1 System Overview\n2 Modules and Features\n3 Network Infrastructure\n4 Requirements Summary\n5 Test Plan\n6 Test Cases'],
  ], [1, 3]),
  p('Each numbered part is one tab of this document.'),
  h2('Revision history'),
  ...T(['Rev', 'Date', 'Change'], [['1', '2026-10-21', 'First issue: modules, network infrastructure, requirements summary, test plan, test cases.']], [1, 2, 7]),
];

const overview = [
  h1('1. System Overview'),
  p('The system lets OJTs record their daily time record (DTR) and submit weekly reports with a mobile app. Facilitators monitor and approve these records with the same app. Admins manage the system with a web app. The mobile app operates when the network is not available.'),
  h2('1.1 Users and platforms'),
  ...T(['Role', 'Main tasks', 'Platform', 'Network'], [
    ['OJT', 'Record time-in and time-out. Write weekly reports. Request corrections.', 'Mobile app', 'Online and offline'],
    ['Facilitator', 'Monitor assigned OJTs. Approve or return reports. Decide corrections.', 'Mobile app (same app)', 'Online and offline'],
    ['Admin', 'Manage users, host companies, batches, and assignments. Monitor all data.', 'Web app', 'Online only'],
  ], [1.2, 4, 1.8, 1.6]),
  h2('1.2 Technology'),
  ...T(['Part', 'Choice'], [
    ['Frontend', 'Ionic + Angular (standalone components) + Capacitor. One codebase for Android, iOS (optional), and the admin web app.'],
    ['Local storage', 'SQLite on the device (Capacitor SQLite plugin) with an outbox for unsynced changes'],
    ['Backend', 'Supabase, Free plan: PostgreSQL with Row Level Security (RLS), Auth, Storage, database functions, Edge Functions'],
    ['Push notifications', 'Firebase Cloud Messaging (FCM)'],
    ['Admin web hosting', 'Free static host (Netlify, Vercel, or Firebase Hosting)'],
  ], [1.5, 6]),
  h2('1.3 Main design rules'),
  bullet('Local first: the mobile app saves each change on the device, then sends it to the server.'),
  bullet('The server is the source of truth. RLS rules in the database control who can see and change data.'),
  bullet('Punches are append-only. A correction makes a new punch. The original stays.'),
  bullet('The admin web app is online only.'),
  bullet('All cloud services use free tiers only.'),
];

const modules = [
  h1('2. Modules and Features'),
  h2('2.1 Module map'),
  img('modmap.png', 620),
  caption('Figure 1. Modules for each role and platform'),
  h2('2.2 Module list'),
  ...T(['Code', 'Module', 'Main features', 'OJT', 'Facilitator', 'Admin', 'Offline'], [
    ['AUTH', 'Login and session', 'Login, routes for each role, token refresh, offline open, logout', 'Yes', 'Yes', 'Yes', 'Yes, after first login'],
    ['PROF', 'Profile', 'Own profile, host company, facilitator, required hours', 'Yes', 'Yes', '-', 'Yes'],
    ['DTR', 'Daily time record', 'Time-in, time-out, location stamp, optional selfie, hours, history', 'Records', 'Reviews', 'Views', 'Yes'],
    ['COR', 'Correction request', 'Request to add or change a punch. Approve or reject.', 'Requests', 'Decides', 'Audits', 'Queued'],
    ['RPT', 'Weekly report', 'Draft, attach photos, submit, approve, return with remarks', 'Writes', 'Reviews', 'Views', 'Draft yes, submit queued'],
    ['MON', 'Progress monitoring', 'Logged, approved, and remaining hours. Late reports.', 'Own', 'Assigned OJTs', 'All', 'Cached'],
    ['NOTI', 'Notifications', 'Local reminders, push notifications, notification list', 'Yes', 'Yes', '-', 'Reminders yes'],
    ['EXP', 'Export', 'DTR and report PDF (mobile), CSV summaries (web)', 'Own', '-', 'All', 'PDF yes'],
    ['ADM', 'Administration', 'Users, host companies, batches, assignments, company settings', '-', '-', 'Yes', 'No'],
    ['AUD', 'Audit log', 'Record of approvals, corrections, user and assignment changes', '-', '-', 'Yes', 'N/A'],
    ['SYNC', 'Offline sync', 'Local database, outbox, sync push and pull, sync issues screen, network status', 'Yes', 'Yes', '-', 'Core offline function'],
  ], [0.8, 1.4, 3.4, 0.9, 1.1, 0.8, 1.3]),
  h2('2.3 Main flows'),
  p([new TextRun({ text: 'Time-in without network', font: FONT, size: 21, bold: true })]),
  ...steps([
    'The OJT taps "Time in". The app makes sure that no work session is open.',
    'The app saves the punch in SQLite with status "pending" and adds an operation to the outbox.',
    'The app shows the confirmation at once.',
    'When the network is available, the sync engine sends the outbox to the server (sync_push).',
    'The server applies each operation one time only. The app sets the punch to "synced".',
  ]),
  p([new TextRun({ text: 'Weekly report cycle', font: FONT, size: 21, bold: true })]),
  ...steps([
    'The OJT writes the report (offline is permitted). The app shows the hours of the week from the DTR.',
    'The OJT submits the report. The facilitator gets it at the next sync and a push notification.',
    'The facilitator approves the report, or returns it with remarks.',
    'An approval also approves the DTR entries of that week. The server writes an audit entry.',
    'The OJT gets the decision. A returned report can be changed and submitted again.',
  ]),
  p([new TextRun({ text: 'Correction request', font: FONT, size: 21, bold: true })]),
  ...steps([
    'The OJT sends a request with a reason to add or change a punch.',
    'The facilitator approves or rejects it with a remark.',
    'An approval makes a new punch that refers to the original punch. The hours change.',
  ]),
  h2('2.4 Capacitor plugins'),
  ...T(['Plugin', 'Use'], [
    ['@capacitor-community/sqlite', 'Local database and outbox (offline functions)'],
    ['@capacitor/network', 'Network status, start of sync when the network returns'],
    ['@capacitor/app', 'Sync when the app opens again'],
    ['@capacitor/geolocation', 'Location stamp on each punch'],
    ['@capacitor/camera', 'Selfie on punch (optional), report photos'],
    ['@capacitor/local-notifications', 'Time-out and report reminders (offline)'],
    ['@capacitor/push-notifications', 'Approval and return messages'],
    ['@capacitor/filesystem + @capacitor/share', 'Save and share PDF exports'],
    ['Secure storage plugin', 'Safe storage of session tokens'],
  ], [3, 5]),
];

const network = [
  h1('3. Network Infrastructure'),
  p('The system uses cloud services on free tiers only. The backend is one Supabase project for development and one for production.'),
  h2('3.1 Production topology'),
  img('network.png', 620),
  caption('Figure 2. Production topology'),
  h2('3.2 Environments'),
  ...T(['Environment', 'Purpose', 'Backend', 'Clients'], [
    ['Dev', 'Development and tests', 'Supabase project ojt-dtr-dev', 'Browser, debug APK, emulator'],
    ['Prod', 'Demonstration and user acceptance test', 'Supabase project ojt-dtr-prod', 'Release APK, admin web URL'],
    ['Local (optional)', 'Clean tests and rebuild drill', 'Supabase CLI + Docker on a laptop', 'Browser, emulator'],
  ], [1.4, 2.6, 2.6, 2.4]),
  h2('3.3 Components'),
  ...T(['Component', 'Function', 'Service'], [
    ['Admin web app', 'Static files of the Angular web build', 'Netlify, Vercel, or Firebase Hosting'],
    ['Auth', 'Login, sessions, token refresh', 'Supabase Auth'],
    ['Data API', 'Table access and RPC calls (sync_push, sync_pull, heartbeat)', 'Supabase Data API'],
    ['Database', 'PostgreSQL with RLS, functions, triggers', 'Supabase PostgreSQL'],
    ['Storage', 'Photos and attachments (private buckets)', 'Supabase Storage'],
    ['Edge Functions', 'Push messages, admin account actions, CSV export', 'Supabase Edge Functions'],
    ['Push service', 'Push messages to phones', 'Firebase Cloud Messaging'],
    ['Keep-alive and backups', 'Daily heartbeat calls, weekly backup', 'GitHub Actions, external cron service'],
  ], [1.8, 3.8, 2.8]),
  h2('3.4 Network flows'),
  ...T(['#', 'From', 'To', 'Protocol and port', 'Purpose'], [
    ['F1', 'Mobile app', 'Supabase gateway', 'HTTPS 443', 'Login, sync, photo upload'],
    ['F2', 'Admin browser', 'Static host', 'HTTPS 443', 'Load the admin web app'],
    ['F3', 'Admin browser', 'Supabase gateway', 'HTTPS 443', 'Admin data, Edge Functions'],
    ['F4', 'Edge Functions', 'FCM', 'HTTPS 443', 'Send push messages'],
    ['F5', 'FCM', 'Mobile device', 'OS push channel', 'Deliver push messages'],
    ['F6', 'GitHub Actions, cron service', 'Supabase gateway', 'HTTPS 443', 'Heartbeat (keep-alive)'],
    ['F7', 'GitHub Actions', 'Supabase session pooler', 'PostgreSQL/TLS 5432', 'Weekly backup'],
    ['F8', 'Developer laptop', 'Supabase', 'HTTPS 443, 5432', 'Migrations and deploys'],
  ], [0.5, 1.8, 1.8, 1.6, 2.4]),
  h2('3.5 Security controls'),
  ...T(['Control', 'Implementation'], [
    ['Encryption in transit', 'HTTPS (TLS 1.2 or later) for all traffic'],
    ['Authentication', 'Supabase Auth. Token life 15 minutes. Refresh token rotation. Public sign-up off.'],
    ['Authorization', 'RLS rules on each table. OJT sees own data. Facilitator sees assigned OJTs only.'],
    ['Login attempts', 'Supabase Auth sign-in rate limit'],
    ['Secrets', 'Service role key and other secrets only in Edge Function secrets and GitHub secrets. Never in the apps.'],
    ['Backups', 'Weekly encrypted own backup'],
  ], [2, 6]),
  h2('3.6 Free plan limits and protection'),
  ...T(['Limit', 'Value', 'Control'], [
    ['Pause for low activity', 'After 7 days', 'Three protection layers (below)'],
    ['Automatic backups', 'Not included', 'Weekly encrypted own backup'],
    ['Database', '500 MB', 'Enough for one term. Weekly size check.'],
    ['File storage / egress', '1 GB / 5 GB', 'Photos 500 KB or less, thumbnails, selfie off by default'],
    ['Active projects', '2', 'dev and prod only'],
  ], [2.2, 1.6, 4.2]),
  ...T(['Layer', 'Measures'], [
    ['1. Prevention', 'Daily heartbeat from GitHub Actions and from a cron service. Developer opens the apps two times each week. Supabase warning email goes to a read inbox.'],
    ['2. Tolerance', 'Apps keep working offline. "Server not reachable" message. No forced sign-out. No data loss.'],
    ['3. Recovery', 'Resume a paused project in 30 minutes or less. Rebuild from git and the newest backup in 2 hours or less. Phones send their last 30 days of records again.'],
  ], [1.6, 6.4]),
  h2('3.7 Development network'),
  p('Phones, the emulator, and the laptop connect to the dev project over HTTPS. A LAN connection between the phone and the laptop is not necessary.'),
];

const reqs = [
  h1('4. Requirements Summary'),
  h2('4.1 Functional requirements'),
  ...T(['Module', 'Must', 'Should', 'Could', 'Total'], [
    ['AUTH', 5, 2, 0, 7], ['PROF', 1, 0, 1, 2], ['DTR', 8, 3, 0, 11], ['COR', 3, 0, 0, 3], ['RPT', 6, 2, 0, 8],
    ['MON', 3, 1, 0, 4], ['NOTI', 0, 4, 1, 5], ['EXP', 1, 2, 0, 3], ['ADM', 4, 0, 2, 6], ['AUD', 1, 1, 0, 2],
    ['SYNC', 8, 0, 0, 8], ['Total', 40, 15, 4, 59],
  ].map(r => r.map(String)), [2, 1, 1, 1, 1]),
  h2('4.2 Quality requirements (ISO/IEC 25010:2023)'),
  ...T(['Characteristic', 'Main targets'], [
    ['Functional suitability', 'All "Must" functions pass. Hours are correct to the minute.'],
    ['Performance efficiency', 'Time-in confirmation in 1 s or less. 100 queued changes sync in 30 s or less. Photos 500 KB or less.'],
    ['Compatibility', 'Android 11 or later, current browsers for admin. PDF and CSV open in common tools.'],
    ['Interaction capability (usability)', 'Time-in in two taps or fewer. SUS score 70 or more. WCAG 2.1 AA contrast. Network and sync status always visible.'],
    ['Reliability', 'Zero data loss in network fault tests. Offline functions work after first login. Backend stays active and recovers from a pause.'],
    ['Security', 'Users see only permitted data (RLS). HTTPS only. Short tokens. Audit log cannot be changed.'],
    ['Maintainability', 'Zero lint errors. Strict TypeScript. Test coverage 80% for sync and hours logic.'],
    ['Flexibility (portability)', 'One codebase for Android, web, and iOS. Easy install and setup.'],
    ['Safety', 'Warning before removal of unsynced data. Denied permissions do not stop a punch.'],
  ], [2.4, 6]),
];

const testplan = [
  h1('5. Test Plan'),
  h2('5.1 Approach: bottom-up'),
  p('The team tests the lowest layers first, then adds one layer at a time up to the full system.'),
  bullet('The highest risk is in the low layers: the local database, the outbox, and the sync engine.'),
  bullet('All mobile modules depend on the sync engine and the DTR module. Faults there must be found early.'),
  bullet('The test order agrees with the build order. A UI prototype walkthrough in stage S0 covers the early UI check.'),
  ...T(['Layer', 'Contents', 'Test level'], [
    ['0', 'Utilities: hours calculation, validation, IDs', 'Unit'],
    ['1', 'Data access: PostgreSQL tables and RLS; SQLite adapter', 'Unit, component integration'],
    ['2', 'Services: database functions, outbox, sync engine, repositories', 'Unit, component integration'],
    ['3', 'Interfaces: Data API, RPC, Edge Functions, route guards', 'Component integration'],
    ['4', 'UI pages for each feature', 'Component, subsystem integration'],
    ['5', 'Full system on devices, web, and cloud', 'System, acceptance'],
  ], [0.8, 5, 2.6]),
  h2('5.2 Test levels'),
  ...T(['Level', 'Purpose', 'Tools'], [
    ['L1 Unit (U)', 'Each function is correct alone', 'Vitest, Angular test runner'],
    ['L2 Component integration (CI)', 'Units work together. RLS and functions obey the access rules.', 'Vitest + supabase-js, SQLite test adapter'],
    ['L3 Subsystem integration (SI)', 'App and backend work together on a real device and network', 'Android phone and emulator, fault injector'],
    ['L4 System (ST)', 'Full system meets functional and quality requirements', 'Playwright, devices, load test, security advisor, accessibility tools'],
    ['L5 Acceptance (UAT)', 'Real users can do their work', 'User scripts, SUS form'],
  ], [2.2, 3.6, 3]),
  h2('5.3 Network conditions for offline tests'),
  ...T(['Code', 'Condition'], [
    ['N1', 'Online, stable'], ['N2', 'Offline (airplane mode)'], ['N3', 'Offline to online during work'],
    ['N4', 'Online to offline during a sync'], ['N5', 'Slow network'], ['N6', 'Network up, backend down or paused'], ['N7', 'Session expired while offline'],
  ], [1, 7]),
  h2('5.4 Stage gates'),
  ...T(['Stage', 'Dates', 'Main tests', 'Exit criteria'], [
    ['S0 Plan and design', 'Oct 21 to 27', 'Requirement review, design review, UI walkthrough', 'Reviews closed. Test plan accepted.'],
    ['S1 Foundation', 'Oct 28 to Nov 3', 'Auth, RLS access, local database, plugin smoke test', 'Login works for each role. Keep-alive and backups active.'],
    ['S2 Offline core', 'Nov 4 to 10', 'DTR, sync, network fault, app stop, backend down', 'Zero data loss. No forced sign-out.'],
    ['S3 Reports and admin', 'Nov 11 to 17', 'Report and correction cycles on two devices, admin functions', 'Access rules pass 100%.'],
    ['S4 Completion and quality', 'Nov 18 to 24', 'All system tests, ISO/IEC 25010 tests, pause and rebuild drills', 'Each quality target measured.'],
    ['S5 Release', 'Nov 25 to 28', 'Full regression, user acceptance, production smoke test', 'All "Must" functions pass. Zero open S1 and S2 defects.'],
  ], [1.8, 1.4, 3.2, 2.6]),
  p('Each gate also needs: all planned tests run, zero lint errors, regression suites pass, and a stage test report.'),
  h2('5.5 Defect severity'),
  ...T(['Severity', 'Meaning'], [
    ['S1 Critical', 'Data loss, security breach, or crash in a core flow. No workaround.'],
    ['S2 Major', 'A "Must" requirement fails. Workaround is difficult.'],
    ['S3 Minor', 'A function fails. An easy workaround exists.'],
    ['S4 Trivial', 'Text, layout, or color problem'],
  ], [1.6, 6.4]),
];

// Test cases (landscape)
const groups = JSON.parse(fs.readFileSync(path.join(D, 'tc.json')));
const levelName = {
  'Reviews (static tests)': 'Level 4: System tests (reviews)',
  'Functional system tests': 'Level 4: System tests (functional)',
  'Quality tests (ISO/IEC 25010)': 'Level 4: System tests (ISO/IEC 25010 quality)',
};
const tcs = [h1('6. Test Cases', false)];
tcs.push(p('98 test cases. IDs: TC-<level>-<module>-<number>. Levels: U unit, CI component integration, SI subsystem integration, ST system, UAT acceptance. Requirement IDs refer to the requirements documents.'));
tcs.push(table(['Level', 'Count'], groups.map(g => [levelName[g.title] || g.title, String(g.rows.length)]).concat([['Total', String(groups.reduce((a, g) => a + g.rows.length, 0))]]), [5, 1], 6000), p(''));
for (const g of groups) {
  tcs.push(h2(levelName[g.title] || g.title));
  tcs.push(table(['ID', 'Stage', 'Requirements', 'Title', 'Expected result'],
    g.rows.map(r => [r.id, r.stage, r.req, r.title, r.id === 'TC-SI-SYNC-02' ? 'With random network faults, 200 punches give exactly 200 server records and zero duplicates.' : r.exp]),
    [1.7, 0.8, 2.0, 2.0, 6.2], LAND_W), p(''));
}

const cover3 = [
  new Paragraph({ spacing: { before: 2400, after: 200 }, children: [new TextRun({ text: 'OJT Weekly Report and DTR Monitoring System', font: FONT, size: 44, bold: true, color: ACCENT })] }),
  new Paragraph({ spacing: { after: 600 }, children: [new TextRun({ text: 'Module Plan, Network Infrastructure Plan, and Test Plan', font: FONT, size: 30, color: '404040' })] }),
  ...T(['Item', 'Value'], [
    ['Revision', 'Rev 1'], ['Date', '2026-10-21'], ['Course', 'SOFTDEV'],
    ['Contents', '1 Modules and Features (DL-01 Module plan)\n2 Network Infrastructure (DL-02 Network infrastructure plan)\n3 Test Plan (DL-05 Test plan)'],
  ], [1, 3]),
  p('This file contains only the three S0 plans. The full document set, with the requirements and the 98 test cases, is the Google Doc "OJT-DTR - System Documents - Rev 1".'),
  h2('Revision history'),
  ...T(['Rev', 'Date', 'Change'], [['1', '2026-10-21', 'First issue: module plan, network infrastructure plan, test plan.']], [1, 2, 7]),
];

const docName = VARIANT === 'core3' ? 'Module, Network, and Test Plans' : 'System Documents';
const footer = new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `OJT-DTR ${docName}, Rev 1   |   Page `, font: FONT, size: 16, color: '7F7F7F' }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: '7F7F7F' })] })] });
const portrait = { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } };
const landscape = { page: { size: { width: 12240, height: 15840, orientation: PageOrientation.LANDSCAPE }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } };

const sections = VARIANT === 'core3'
  ? [{ properties: portrait, footers: { default: footer }, children: [...cover3, ...modules, ...network, ...testplan] }]
  : [
    { properties: portrait, footers: { default: footer }, children: [...cover, ...overview, ...modules, ...network, ...reqs, ...testplan] },
    { properties: landscape, footers: { default: footer }, children: tcs },
  ];

const doc = new Document({
  creator: 'OJT-DTR team', title: `OJT-DTR ${docName} Rev 1`,
  styles: {
    default: { document: { run: { font: FONT, size: 21 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 32, bold: true, font: FONT, color: ACCENT }, paragraph: { keepNext: true, spacing: { before: 120, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 25, bold: true, font: FONT, color: ACCENT }, paragraph: { keepNext: true, spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
    ],
  },
  numbering: { config: numberingConfigs },
  sections,
});
Packer.toBuffer(doc).then(b => { fs.writeFileSync(path.join(D, `OJT-DTR - ${docName} - Rev 1.docx`), b); console.log('ok'); });
