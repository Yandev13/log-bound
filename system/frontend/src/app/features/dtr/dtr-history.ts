// FR-DTR-06 and FR-DTR-07: the DTR history by week and by day, newest first. Each session keeps its punches,
// so that the page can show the sync status of each entry. Pure functions (no Angular, no storage).
import { Punch } from '../../data/repositories/punch.repository';
import { buildSessions, isMissingTimeOut, weekStart } from '../../shared/utils/hours';

export interface HistorySession {
  timeIn: Punch;
  timeOut: Punch | null;
  minutes: number;
  missingTimeOut: boolean;
}

export interface HistoryDay {
  date: string;
  /** Minutes of the closed sessions of the day. */
  minutes: number;
  sessions: HistorySession[];
}

export interface HistoryWeek {
  weekStart: string;
  minutes: number;
  days: HistoryDay[];
}

/** The facts of one OJT that the facilitator list shows (FR-DTR-10, FR-DTR-11). */
export interface DtrSummary {
  /** Minutes of the closed sessions of the week that contains `now`. */
  weekMinutes: number;
  doubtfulPunches: number;
  missingTimeOuts: number;
}

export function summarize(punches: readonly Punch[], now: Date, missingTimeOutHours: number): DtrSummary {
  const thisWeek = weekStart(now);
  const weeks = buildHistory(punches, now, missingTimeOutHours);
  const sessions = weeks.flatMap((w) => w.days.flatMap((d) => d.sessions));
  return {
    weekMinutes: weeks.find((w) => w.weekStart === thisWeek)?.minutes ?? 0,
    doubtfulPunches: punches.filter((p) => p.doubtfulTime).length,
    missingTimeOuts: sessions.filter((s) => s.missingTimeOut).length,
  };
}

export function buildHistory(punches: readonly Punch[], now: Date, missingTimeOutHours: number): HistoryWeek[] {
  const byId = new Map(punches.map((p) => [p.id, p]));
  const sessions = buildSessions(
    punches.map((p) => ({ id: p.id, type: p.type, time: p.deviceTime, correctsPunchId: p.correctsPunchId })),
  );

  const weeks = new Map<string, HistoryWeek>();
  for (const s of [...sessions].reverse()) {
    const week = weekStart(s.timeIn.time);
    let w = weeks.get(week);
    if (!w) {
      w = { weekStart: week, minutes: 0, days: [] };
      weeks.set(week, w);
    }
    let day = w.days.find((d) => d.date === s.date);
    if (!day) {
      day = { date: s.date, minutes: 0, sessions: [] };
      w.days.push(day);
    }
    const closedMinutes = s.timeOut ? s.minutes : 0;
    day.sessions.push({
      timeIn: byId.get(s.timeIn.id) as Punch,
      timeOut: s.timeOut ? (byId.get(s.timeOut.id) as Punch) : null,
      minutes: closedMinutes,
      missingTimeOut: isMissingTimeOut(s, now, missingTimeOutHours),
    });
    day.minutes += closedMinutes;
    w.minutes += closedMinutes;
  }
  return [...weeks.values()];
}
