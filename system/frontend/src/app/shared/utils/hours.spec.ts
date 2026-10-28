import {
  PunchInput,
  buildSessions,
  effectivePunches,
  localDate,
  minutesByDate,
  minutesByWeek,
  weekStart,
} from './hours';

// All test times are Asia/Manila time (UTC+08:00). 2026-10-26 is a Monday.
const at = (local: string): string => `${local}+08:00`;
let seq = 0;
const punch = (type: 'in' | 'out', local: string, correctsPunchId: string | null = null): PunchInput => ({
  id: `p${++seq}`,
  type,
  time: at(local),
  correctsPunchId,
});

describe('hours (layer 0)', () => {
  it('TC-U-UTIL-01 gives 540 minutes for one work session from 08:00 to 17:00', () => {
    const sessions = buildSessions([punch('in', '2026-10-26T08:00:00'), punch('out', '2026-10-26T17:00:00')]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].minutes).toBe(540);
    expect(minutesByDate(sessions).get('2026-10-26')).toBe(540);
  });

  it('TC-U-UTIL-02 gives 480 minutes for two work sessions in one day', () => {
    const sessions = buildSessions([
      // The input order is not the time order. The calculation must sort.
      punch('in', '2026-10-26T13:00:00'),
      punch('out', '2026-10-26T12:00:00'),
      punch('in', '2026-10-26T08:00:00'),
      punch('out', '2026-10-26T17:00:00'),
    ]);
    expect(sessions.map((s) => s.minutes)).toEqual([240, 240]);
    expect(minutesByDate(sessions).get('2026-10-26')).toBe(480);
  });

  it('TC-U-UTIL-03 gives 240 minutes for a work session across midnight, on the date of the time-in', () => {
    const sessions = buildSessions([punch('in', '2026-10-26T22:00:00'), punch('out', '2026-10-27T02:00:00')]);
    expect(sessions[0].minutes).toBe(240);
    const byDate = minutesByDate(sessions);
    expect(byDate.get('2026-10-26')).toBe(240);
    expect(byDate.has('2026-10-27')).toBe(false);
  });

  it('TC-U-UTIL-04 uses the Asia/Manila week limits (Monday to Sunday)', () => {
    // Sunday 23:30 Manila is Sunday 15:30 UTC. Monday 00:10 Manila is Sunday 16:10 UTC.
    expect(weekStart(at('2026-11-01T23:30:00'))).toBe('2026-10-26');
    expect(weekStart(at('2026-11-02T00:10:00'))).toBe('2026-11-02');
    expect(localDate('2026-11-01T16:10:00Z')).toBe('2026-11-02');

    const sessions = buildSessions([
      punch('in', '2026-11-01T20:00:00'),
      punch('out', '2026-11-01T23:30:00'),
      punch('in', '2026-11-02T00:10:00'),
      punch('out', '2026-11-02T01:10:00'),
    ]);
    const byWeek = minutesByWeek(sessions);
    expect(byWeek.get('2026-10-26')).toBe(210);
    expect(byWeek.get('2026-11-02')).toBe(60);
  });

  it('TC-U-UTIL-05 uses the new punch and ignores the punch that it corrects', () => {
    const wrongOut = punch('out', '2026-10-26T12:00:00');
    const fixedOut = punch('out', '2026-10-26T17:00:00', wrongOut.id);
    const all = [punch('in', '2026-10-26T08:00:00'), wrongOut, fixedOut];

    expect(effectivePunches(all).map((p) => p.id)).not.toContain(wrongOut.id);
    // The input list keeps the original punch (D-05).
    expect(all).toContain(wrongOut);

    const sessions = buildSessions(all);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].minutes).toBe(540);
  });

  it('counts only closed work sessions in the totals (FR-DTR-06)', () => {
    const sessions = buildSessions([punch('in', '2026-10-26T08:00:00')]);
    expect(sessions[0].timeOut).toBeNull();
    expect(minutesByDate(sessions).size).toBe(0);
  });

  it('ignores a time-out that has no open time-in', () => {
    const sessions = buildSessions([punch('out', '2026-10-26T08:00:00')]);
    expect(sessions).toHaveLength(0);
  });

  it('rejects a punch time that is not valid', () => {
    expect(() => localDate('not a time')).toThrow();
  });
});
