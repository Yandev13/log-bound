// UI prototype: fake data for the screens that have no server part yet (reports, corrections, monitoring,
// notifications, profile). The data does not sync. Replace this file with the real repositories later.
import { localDate, weekStart } from '../../shared/utils/hours';

export type ReportStatus = 'draft' | 'submitted' | 'approved' | 'returned';
export type CorrectionStatus = 'pending' | 'approved' | 'rejected';
export type CorrectionKind = 'add' | 'change';
export type NotificationAudience = 'ojt' | 'facilitator';

/** One status change of a weekly report, with the remark (FR-RPT-08). */
export interface ReportHistoryEntry {
  at: string;
  status: ReportStatus;
  by: string;
  remark?: string;
}

export interface WeeklyReport {
  id: string;
  ojtId: string;
  /** The Monday of the week (YYYY-MM-DD). The week is Monday to Sunday (FR-RPT-01). */
  weekStart: string;
  tasksDone: string;
  skillsLearned: string;
  problems: string;
  plansNextWeek: string;
  /** Photo data URLs. A maximum of five (FR-RPT-03). */
  photos: string[];
  status: ReportStatus;
  history: ReportHistoryEntry[];
  updatedAt: string;
}

export interface CorrectionRequest {
  id: string;
  ojtId: string;
  kind: CorrectionKind;
  punchType: 'in' | 'out';
  /** The day of the punch (YYYY-MM-DD). */
  date: string;
  /** The time of the original punch ("HH:mm"). Only for kind "change". */
  originalTime?: string;
  requestedTime: string;
  reason: string;
  status: CorrectionStatus;
  remark?: string;
  createdAt: string;
  decidedAt?: string;
}

export interface MockOjt {
  id: string;
  fullName: string;
  email: string;
  contactNumber: string;
  companyName: string;
  facilitatorName: string;
  batchName: string;
  requiredHours: number;
  startDate: string;
  /** Closed work-session minutes for each day (YYYY-MM-DD). */
  dailyMinutes: Record<string, number>;
  /** The ISO time of the last time-in, or null. */
  lastTimeIn: string | null;
}

export interface AppNotification {
  id: string;
  audience: NotificationAudience;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  /** The app URL that the notification opens. */
  link: string;
}

export interface MockState {
  ojts: MockOjt[];
  reports: WeeklyReport[];
  corrections: CorrectionRequest[];
  notifications: AppNotification[];
}

/** The ID of the OJT of this device in the prototype. */
export const ME = 'ojt-me';
export const FACILITATOR_NAME = 'Engr. Maria Santos';

const DAY_MS = 86_400_000;

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** A small deterministic random function, so that the fake data is the same at each start. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1_103_515_245 + 12_345) % 2_147_483_648;
    return s / 2_147_483_648;
  };
}

function dailyMinutes(seed: number, from: string, to: string, absentRate: number): Record<string, number> {
  const rnd = seeded(seed);
  const out: Record<string, number> = {};
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const weekday = new Date(`${d}T00:00:00Z`).getUTCDay();
    if (weekday === 0 || weekday === 6 || rnd() < absentRate) {
      continue;
    }
    out[d] = 420 + Math.round(rnd() * 12) * 10;
  }
  return out;
}

function at(date: string, time: string): string {
  // Asia/Manila is UTC+8 (no daylight saving time).
  return new Date(`${date}T${time}:00+08:00`).toISOString();
}

const OJT_SEEDS = [
  { id: ME, fullName: 'Juan Dela Cruz', company: 'Acme Software Inc.', weeksAgo: 6, absent: 0.05 },
  { id: 'ojt-2', fullName: 'Ana Reyes', company: 'Acme Software Inc.', weeksAgo: 6, absent: 0.1 },
  { id: 'ojt-3', fullName: 'Mark Villanueva', company: 'Northwind Data Corp.', weeksAgo: 5, absent: 0.25 },
  { id: 'ojt-4', fullName: 'Liza Bautista', company: 'Northwind Data Corp.', weeksAgo: 8, absent: 0 },
  { id: 'ojt-5', fullName: 'Paolo Garcia', company: 'Acme Software Inc.', weeksAgo: 4, absent: 0.15 },
];

const SAMPLE = {
  tasks: 'Fixed three bugs in the inventory module. Wrote unit tests for the login service. Joined the daily stand-up.',
  skills: 'Angular signals, writing unit tests with Vitest, and Git branches.',
  problems: 'The test database was slow on Tuesday. I asked the team lead for help.',
  plans: 'Start the report export function. Learn the PDF library.',
};

function report(ojtId: string, week: string, status: ReportStatus, remark?: string): WeeklyReport {
  const submitted = at(addDays(week, 4), '17:30');
  const history: ReportHistoryEntry[] = [{ at: at(addDays(week, 4), '16:00'), status: 'draft', by: 'OJT' }];
  if (status !== 'draft') {
    history.push({ at: submitted, status: 'submitted', by: 'OJT' });
  }
  if (status === 'approved' || status === 'returned') {
    history.push({ at: at(addDays(week, 7), '10:15'), status, by: FACILITATOR_NAME, remark });
  }
  return {
    id: `rpt-${ojtId}-${week}`,
    ojtId,
    weekStart: week,
    tasksDone: SAMPLE.tasks,
    skillsLearned: SAMPLE.skills,
    problems: SAMPLE.problems,
    plansNextWeek: SAMPLE.plans,
    photos: [],
    status,
    history,
    updatedAt: history[history.length - 1].at,
  };
}

/** Status of the report N weeks before this week, for each OJT. */
function statusOf(index: number, weeksBack: number): ReportStatus | null {
  if (weeksBack === 0) {
    return null;
  }
  if (weeksBack === 1) {
    return (['submitted', 'submitted', 'returned', 'approved', 'draft'] as const)[index];
  }
  if (weeksBack === 2 && index === 2) {
    return 'submitted';
  }
  return 'approved';
}

/** Makes the first fake data. `now` is the time of the first app start. */
export function seedState(now: Date = new Date()): MockState {
  const today = localDate(now);
  const yesterday = addDays(today, -1);
  const thisWeek = weekStart(now);

  const ojts: MockOjt[] = OJT_SEEDS.map((s, i) => {
    const startDate = addDays(thisWeek, -7 * s.weeksAgo);
    const days = dailyMinutes(101 + i * 17, startDate, yesterday, s.absent);
    const lastDay = Object.keys(days).sort().pop() ?? null;
    return {
      id: s.id,
      fullName: s.fullName,
      email: `${s.fullName.split(' ')[0].toLowerCase()}@school.edu.ph`,
      contactNumber: `0917 555 01${i}${i}`,
      companyName: s.company,
      facilitatorName: FACILITATOR_NAME,
      batchName: 'BSIT 4 - 2026 1st Sem',
      requiredHours: 486,
      startDate,
      dailyMinutes: days,
      lastTimeIn: lastDay ? at(lastDay, '08:0' + i) : null,
    };
  });

  const reports: WeeklyReport[] = [];
  ojts.forEach((o, i) => {
    for (let w = 1; ; w++) {
      const week = addDays(thisWeek, -7 * w);
      if (week < o.startDate) {
        break;
      }
      const status = statusOf(i, w);
      if (status) {
        const remark = status === 'returned' ? 'Add more detail to the tasks. Give the names of the modules.' : status === 'approved' ? 'Good work.' : undefined;
        reports.push(report(o.id, week, status, remark));
      }
    }
  });

  const lastMonday = addDays(thisWeek, -7);
  const corrections: CorrectionRequest[] = [
    {
      id: 'cor-1',
      ojtId: ME,
      kind: 'add',
      punchType: 'out',
      date: addDays(lastMonday, 2),
      requestedTime: '17:00',
      reason: 'I forgot to record the time-out. The phone battery was empty.',
      status: 'approved',
      remark: 'Approved. The team lead confirmed the time.',
      createdAt: at(addDays(lastMonday, 3), '08:10'),
      decidedAt: at(addDays(lastMonday, 3), '13:00'),
    },
    {
      id: 'cor-2',
      ojtId: 'ojt-2',
      kind: 'change',
      punchType: 'in',
      date: addDays(lastMonday, 1),
      originalTime: '09:42',
      requestedTime: '08:02',
      reason: 'The app did not open at the gate. I recorded the time-in late.',
      status: 'pending',
      createdAt: at(addDays(lastMonday, 1), '10:00'),
    },
    {
      id: 'cor-3',
      ojtId: 'ojt-3',
      kind: 'add',
      punchType: 'in',
      date: addDays(lastMonday, 3),
      requestedTime: '08:00',
      reason: 'No network at the site. The punch did not save.',
      status: 'pending',
      createdAt: at(addDays(lastMonday, 3), '18:20'),
    },
  ];

  const notifications: AppNotification[] = [
    {
      id: 'n-1',
      audience: 'ojt',
      title: 'Correction approved',
      body: `Your time-out request for ${addDays(lastMonday, 2)} is approved.`,
      createdAt: corrections[0].decidedAt!,
      read: false,
      link: '/ojt/corrections',
    },
    {
      id: 'n-2',
      audience: 'ojt',
      title: 'Weekly report approved',
      body: `Your report for the week of ${addDays(thisWeek, -14)} is approved.`,
      createdAt: at(addDays(thisWeek, -7), '10:15'),
      read: true,
      link: `/ojt/reports/${addDays(thisWeek, -14)}`,
    },
    {
      id: 'n-3',
      audience: 'facilitator',
      title: 'Report submitted',
      body: `Ana Reyes submitted the report for the week of ${lastMonday}.`,
      createdAt: at(addDays(lastMonday, 4), '17:30'),
      read: false,
      link: `/facilitator/reviews/report/rpt-ojt-2-${lastMonday}`,
    },
    {
      id: 'n-4',
      audience: 'facilitator',
      title: 'New correction request',
      body: 'Mark Villanueva sent a correction request.',
      createdAt: corrections[2].createdAt,
      read: false,
      link: '/facilitator/reviews/correction/cor-3',
    },
  ];

  return { ojts, reports, corrections, notifications };
}
