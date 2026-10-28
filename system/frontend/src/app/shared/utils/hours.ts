// Layer 0: hours calculation from punches (FR-DTR-06, FR-RPT-02, QR-FS-02).
// These functions are pure. They do not use Angular, the network, or storage.

/** The project time zone (A-04). Change it only here. */
export const PROJECT_TIME_ZONE = 'Asia/Manila';

export type PunchType = 'in' | 'out';

/** The data of a punch that the hours calculation needs. */
export interface PunchInput {
  id: string;
  type: PunchType;
  /** The time of the punch as an instant (ISO 8601 text or Date). */
  time: string | Date;
  /** The ID of the punch that this punch corrects (D-05), or null. */
  correctsPunchId?: string | null;
}

/** One time-in and its time-out. `timeOut` is null for an open work session. */
export interface WorkSession {
  timeIn: PunchInput;
  timeOut: PunchInput | null;
  /** The date of the time-in in the project time zone, as YYYY-MM-DD (data model, rule 6). */
  date: string;
  /** Whole minutes from time-in to time-out. Zero for an open work session. */
  minutes: number;
}

const MS_PER_MINUTE = 60_000;

function toMs(time: string | Date): number {
  const ms = time instanceof Date ? time.getTime() : Date.parse(time);
  if (Number.isNaN(ms)) {
    throw new Error(`Invalid punch time: ${String(time)}`);
  }
  return ms;
}

/** Gives the calendar date (YYYY-MM-DD) of an instant in a time zone. */
export function localDate(time: string | Date, timeZone: string = PROJECT_TIME_ZONE): string {
  // The en-CA locale gives the date in the YYYY-MM-DD format.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(toMs(time)));
}

/** Gives the Monday (YYYY-MM-DD) of the week (Monday to Sunday, A-04) that contains the instant. */
export function weekStart(time: string | Date, timeZone: string = PROJECT_TIME_ZONE): string {
  const [y, m, d] = localDate(time, timeZone).split('-').map(Number);
  // Use UTC arithmetic on the local calendar date. Then no time zone offset can change the day.
  const day = new Date(Date.UTC(y, m - 1, d));
  const daysAfterMonday = (day.getUTCDay() + 6) % 7;
  day.setUTCDate(day.getUTCDate() - daysAfterMonday);
  return day.toISOString().slice(0, 10);
}

/**
 * Removes each punch that a different punch corrects (FR-COR-03, TC-U-UTIL-05).
 * The original punch stays in the database. Only the calculation ignores it.
 */
export function effectivePunches(punches: readonly PunchInput[]): PunchInput[] {
  const corrected = new Set(
    punches.map((p) => p.correctsPunchId).filter((id): id is string => !!id),
  );
  return punches.filter((p) => !corrected.has(p.id));
}

/**
 * Makes the work sessions from the punches in time order.
 * A time-out without an open time-in is ignored. A second time-in while a session is open
 * starts a new session and leaves the first session open (the DTR service rejects this case, FR-DTR-08).
 */
export function buildSessions(
  punches: readonly PunchInput[],
  timeZone: string = PROJECT_TIME_ZONE,
): WorkSession[] {
  const sorted = [...effectivePunches(punches)].sort((a, b) => toMs(a.time) - toMs(b.time));
  const sessions: WorkSession[] = [];
  let open: WorkSession | null = null;

  for (const punch of sorted) {
    if (punch.type === 'in') {
      open = { timeIn: punch, timeOut: null, date: localDate(punch.time, timeZone), minutes: 0 };
      sessions.push(open);
    } else if (open) {
      open.timeOut = punch;
      open.minutes = Math.floor((toMs(punch.time) - toMs(open.timeIn.time)) / MS_PER_MINUTE);
      open = null;
    }
  }
  return sessions;
}

/**
 * FR-DTR-09, D-37: true if the session has no time-out `limitHours` or more after its time-in.
 * A session across midnight with a time-out does not get the mark (TC-U-DTR-03).
 */
export function isMissingTimeOut(session: WorkSession, now: string | Date, limitHours: number): boolean {
  return session.timeOut === null && toMs(now) - toMs(session.timeIn.time) >= limitHours * 3_600_000;
}

/**
 * The open work session for FR-DTR-02 and FR-DTR-08: the newest session with no time-out and without the
 * "Missing time-out" mark (D-47). Null if there is none.
 */
export function openSession(sessions: readonly WorkSession[], now: string | Date, limitHours: number): WorkSession | null {
  const last = sessions[sessions.length - 1];
  return last && last.timeOut === null && !isMissingTimeOut(last, now, limitHours) ? last : null;
}

function sumBy(sessions: readonly WorkSession[], key: (s: WorkSession) => string): Map<string, number> {
  const totals = new Map<string, number>();
  for (const s of sessions) {
    if (s.timeOut) {
      totals.set(key(s), (totals.get(key(s)) ?? 0) + s.minutes);
    }
  }
  return totals;
}

/** Minutes of the closed work sessions for each date of time-in. */
export function minutesByDate(sessions: readonly WorkSession[]): Map<string, number> {
  return sumBy(sessions, (s) => s.date);
}

/** Minutes of the closed work sessions for each week (key: the Monday, YYYY-MM-DD). */
export function minutesByWeek(
  sessions: readonly WorkSession[],
  timeZone: string = PROJECT_TIME_ZONE,
): Map<string, number> {
  return sumBy(sessions, (s) => weekStart(s.timeIn.time, timeZone));
}
