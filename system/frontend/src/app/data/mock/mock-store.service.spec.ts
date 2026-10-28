import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/auth/auth.service';
import { weekStart } from '../../shared/utils/hours';
import { ME, addDays } from './mock-data';
import { MockStore } from './mock-store.service';

// UI prototype (D-63): the fake-data store must obey the same rules as the real app.
describe('MockStore (UI prototype, D-63)', () => {
  let role: 'ojt' | 'facilitator' = 'ojt';
  const lastWeek = addDays(weekStart(new Date()), -7);
  const content = { tasksDone: 'Tasks', skillsLearned: 'Skills', problems: '', plansNextWeek: '', photos: [] };

  function setup(): MockStore {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { profile: () => null, role: () => role } }],
    });
    return TestBed.inject(MockStore);
  }

  beforeEach(() => (role = 'ojt'));

  it('gives logged, approved, and remaining hours (FR-MON-01)', () => {
    const p = setup().progress(ME);
    expect(p.requiredMinutes).toBe(486 * 60);
    expect(p.approvedMinutes).toBeLessThanOrEqual(p.loggedMinutes);
    expect(p.remainingMinutes).toBe(p.requiredMinutes - p.approvedMinutes);
    expect(p.percent).toBeGreaterThan(0);
  });

  it('submits a report only with tasks and skills, then locks it (FR-RPT-04, FR-RPT-06)', () => {
    const store = setup();
    const week = addDays(lastWeek, 7);
    expect(store.submit(ME, week, { ...content, tasksDone: ' ' })).toEqual({ ok: false, reason: 'incomplete' });
    expect(store.submit(ME, week, content).ok).toBe(true);
    expect(store.report(ME, week)?.status).toBe('submitted');
    expect(store.saveDraft(ME, week, content)).toEqual({ ok: false, reason: 'not-editable' });
  });

  it('approves the hours of a week when the report is approved (FR-RPT-05, FR-RPT-07)', () => {
    const store = setup();
    const before = store.progress('ojt-2').approvedMinutes;
    const id = store.report('ojt-2', lastWeek)!.id;
    expect(store.reviewReport(id, 'returned', '')).toEqual({ ok: false, reason: 'remark-required' });
    expect(store.reviewReport(id, 'approved', '').ok).toBe(true);
    expect(store.progress('ojt-2').approvedMinutes).toBe(before + store.weekMinutes('ojt-2', lastWeek));
    expect(store.reportById(id)?.history.at(-1)?.status).toBe('approved');
  });

  it('needs a reason for a correction and a remark for a rejection (FR-COR-01, FR-COR-02)', () => {
    const store = setup();
    const base = { kind: 'add' as const, punchType: 'out' as const, date: lastWeek, requestedTime: '17:00' };
    expect(store.addCorrection({ ...base, reason: '' })).toEqual({ ok: false, reason: 'reason-required' });
    expect(store.addCorrection({ ...base, date: '2999-01-01', reason: 'Late' })).toEqual({ ok: false, reason: 'future-date' });
    expect(store.addCorrection({ ...base, reason: 'I forgot the time-out.' }).ok).toBe(true);
    const id = store.correctionsOf(ME)[0].id;
    expect(store.decideCorrection(id, 'rejected', '')).toEqual({ ok: false, reason: 'remark-required' });
    expect(store.decideCorrection(id, 'approved', '').ok).toBe(true);
    expect(store.decideCorrection(id, 'approved', '').ok).toBe(false);
  });

  it('shows only the notifications of the role and marks them read (FR-NOTI-05)', () => {
    role = 'facilitator';
    const store = setup();
    expect(store.notifications().every((n) => n.audience === 'facilitator')).toBe(true);
    expect(store.unreadCount()).toBeGreaterThan(0);
    store.markAllRead();
    expect(store.unreadCount()).toBe(0);
  });
});
