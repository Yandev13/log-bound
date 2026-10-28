import { Punch } from '../../data/repositories/punch.repository';
import { dateLabel, duration, timeOfDay } from '../../shared/utils/format';
import { buildHistory, summarize } from './dtr-history';

/** Last week: one open session (Missing time-out). This week: 2 hours, with one doubtful punch. */
function buildHistoryInput(): Punch[] {
  return [
    punch('x', 'in', '2026-10-27T00:00:00Z'),
    punch('g', 'in', '2026-11-02T00:00:00Z', { doubtfulTime: true }),
    punch('h', 'out', '2026-11-02T02:00:00Z'),
  ];
}

const punch = (id: string, type: 'in' | 'out', deviceTime: string, over: Partial<Punch> = {}): Punch => ({
  id,
  ojtId: 'o1',
  type,
  deviceTime,
  timeZone: 'Asia/Manila',
  clockOffsetS: 0,
  lat: null,
  lng: null,
  accuracyM: null,
  photoId: null,
  deviceId: 'd1',
  correctsPunchId: null,
  serverReceivedAt: null,
  doubtfulTime: false,
  approved: false,
  version: 0,
  syncStatus: 'pending',
  ...over,
});

describe('DTR history (FR-DTR-06, FR-DTR-07)', () => {
  const now = new Date('2026-11-04T00:00:00Z');

  it('TC-ST-OJT-01 (unit part): groups sessions by week and day, newest first, with the totals', () => {
    // Manila times: Mon 26 Oct 08:00-12:00 and 13:00-17:30, Tue 27 Oct 08:00-17:00, Mon 2 Nov 08:00-10:00.
    const weeks = buildHistory(
      [
        punch('a', 'in', '2026-10-26T00:00:00Z'),
        punch('b', 'out', '2026-10-26T04:00:00Z', { syncStatus: 'synced' }),
        punch('c', 'in', '2026-10-26T05:00:00Z'),
        punch('d', 'out', '2026-10-26T09:30:00Z'),
        punch('e', 'in', '2026-10-27T00:00:00Z'),
        punch('f', 'out', '2026-10-27T09:00:00Z'),
        punch('g', 'in', '2026-11-02T00:00:00Z'),
        punch('h', 'out', '2026-11-02T02:00:00Z'),
      ],
      now,
      16,
    );
    expect(weeks.map((w) => [w.weekStart, w.minutes])).toEqual([
      ['2026-11-02', 120],
      ['2026-10-26', 240 + 270 + 540],
    ]);
    expect(weeks[1].days.map((d) => [d.date, d.minutes])).toEqual([
      ['2026-10-27', 540],
      ['2026-10-26', 510],
    ]);
    const [late, early] = weeks[1].days[1].sessions;
    expect([late.timeIn.id, early.timeIn.id]).toEqual(['c', 'a']);
    expect(early.timeOut?.syncStatus).toBe('synced');
  });

  it('TC-ST-OJT-01 (unit part): an open session counts 0 minutes and gets the mark after 16 hours', () => {
    const [week] = buildHistory([punch('a', 'in', '2026-11-02T00:00:00Z')], new Date('2026-11-02T17:00:00Z'), 16);
    const [s] = week.days[0].sessions;
    expect(s).toMatchObject({ timeOut: null, minutes: 0, missingTimeOut: true });
    expect(week.minutes).toBe(0);
  });

  it('TC-SI-SYNC-05 (unit part): the summary gives the hours of this week and the marks to examine (FR-DTR-11)', () => {
    const summary = buildHistoryInput();
    expect(summarize(summary, new Date('2026-11-04T00:00:00Z'), 16)).toEqual({
      weekMinutes: 120,
      doubtfulPunches: 1,
      missingTimeOuts: 1,
    });
  });

  it('TC-ST-OJT-01 (unit part): no punches give an empty history', () => {
    expect(buildHistory([], now, 16)).toEqual([]);
  });

  it('TC-ST-OJT-01 (unit part): times show in Asia/Manila, durations in hours and minutes', () => {
    expect(timeOfDay('2026-10-26T00:05:00Z')).toBe('08:05');
    expect(dateLabel('2026-10-26')).toContain('26');
    expect(duration(450)).toBe('7 h 30 min');
    expect(duration(45)).toBe('45 min');
  });
});
