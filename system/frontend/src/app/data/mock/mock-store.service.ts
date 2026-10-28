// UI prototype: one in-memory store of the fake data, with the actions of the screens.
// The rules follow the requirements (FR-RPT-04 to 08, FR-COR-01 to 03, FR-MON-01, FR-MON-02, FR-NOTI-05),
// so that the screens behave as in the real app. The data stays on this device and does not sync.
import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { localDate, weekStart } from '../../shared/utils/hours';
import { newId, nowIso } from '../../shared/utils/uuid';
import {
  AppNotification,
  CorrectionRequest,
  FACILITATOR_NAME,
  ME,
  MockOjt,
  MockState,
  NotificationAudience,
  ReportStatus,
  WeeklyReport,
  addDays,
  seedState,
} from './mock-data';

const STORAGE_KEY = 'ojt-dtr-ui-prototype-v1';

export interface HoursProgress {
  requiredMinutes: number;
  loggedMinutes: number;
  approvedMinutes: number;
  remainingMinutes: number;
  /** Approved hours as a percent of the required hours (0 to 100). */
  percent: number;
  /** Logged hours as a percent of the required hours (0 to 100). */
  loggedPercent: number;
  /** The expected last day at the mean hours of a work day, or null. */
  projectedEnd: string | null;
}

export interface DayMinutes {
  date: string;
  minutes: number;
}

export type ReportContent = Pick<WeeklyReport, 'tasksDone' | 'skillsLearned' | 'problems' | 'plansNextWeek' | 'photos'>;

export type ReportActionResult = { ok: true; report: WeeklyReport } | { ok: false; reason: 'not-editable' | 'incomplete' | 'remark-required' | 'not-found' };

export const MAX_REPORT_PHOTOS = 5;

function load(): MockState {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (text) {
      return JSON.parse(text) as MockState;
    }
  } catch {
    // No storage or bad data: use the seed.
  }
  return seedState();
}

function emptyReport(ojtId: string, week: string): WeeklyReport {
  return {
    id: `rpt-${ojtId}-${week}`,
    ojtId,
    weekStart: week,
    tasksDone: '',
    skillsLearned: '',
    problems: '',
    plansNextWeek: '',
    photos: [],
    status: 'draft',
    history: [],
    updatedAt: nowIso(),
  };
}

@Injectable({ providedIn: 'root' })
export class MockStore {
  private readonly auth = inject(AuthService);
  private readonly state = signal<MockState>(load());

  readonly ojts = computed(() => this.state().ojts);
  readonly reports = computed(() => this.state().reports);
  readonly corrections = computed(() => this.state().corrections);

  /** The OJT of this device. The name comes from the login when it is an OJT account. */
  readonly me = computed<MockOjt>(() => {
    const base = this.state().ojts.find((o) => o.id === ME)!;
    const profile = this.auth.profile();
    return profile?.role === 'ojt' ? { ...base, fullName: profile.fullName } : base;
  });

  /** The facilitator view: all assigned OJTs (FR-MON-02). */
  readonly assignedOjts = computed(() => this.state().ojts.map((o) => (o.id === ME ? this.me() : o)));

  readonly pendingReports = computed(() => this.state().reports.filter((r) => r.status === 'submitted'));
  readonly pendingCorrections = computed(() => this.state().corrections.filter((c) => c.status === 'pending'));

  private readonly audience = computed<NotificationAudience>(() => (this.auth.role() === 'facilitator' ? 'facilitator' : 'ojt'));
  readonly notifications = computed(() =>
    this.state()
      .notifications.filter((n) => n.audience === this.audience())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
  readonly unreadCount = computed(() => this.notifications().filter((n) => !n.read).length);

  // ---------- Reads ----------

  ojt(id: string): MockOjt | undefined {
    return this.assignedOjts().find((o) => o.id === id);
  }

  /** The minutes of each day of one week (Monday to Sunday), from the DTR (FR-RPT-02). */
  weekDays(ojtId: string, week: string): DayMinutes[] {
    const days = this.ojt(ojtId)?.dailyMinutes ?? {};
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(week, i);
      return { date, minutes: days[date] ?? 0 };
    });
  }

  weekMinutes(ojtId: string, week: string): number {
    return this.weekDays(ojtId, week).reduce((sum, d) => sum + d.minutes, 0);
  }

  /** The Mondays from the start date of the OJT to this week, newest first. */
  weeksOf(ojtId: string): string[] {
    const o = this.ojt(ojtId);
    if (!o) {
      return [];
    }
    const out: string[] = [];
    for (let w = weekStart(new Date()); w >= weekStart(`${o.startDate}T12:00:00+08:00`); w = addDays(w, -7)) {
      out.push(w);
    }
    return out;
  }

  reportsOf(ojtId: string): WeeklyReport[] {
    return this.state()
      .reports.filter((r) => r.ojtId === ojtId)
      .sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  }

  report(ojtId: string, week: string): WeeklyReport | undefined {
    return this.state().reports.find((r) => r.ojtId === ojtId && r.weekStart === week);
  }

  reportById(id: string): WeeklyReport | undefined {
    return this.state().reports.find((r) => r.id === id);
  }

  correctionsOf(ojtId: string): CorrectionRequest[] {
    return this.state()
      .corrections.filter((c) => c.ojtId === ojtId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  correction(id: string): CorrectionRequest | undefined {
    return this.state().corrections.find((c) => c.id === id);
  }

  /** Logged, approved, and remaining hours (FR-MON-01). Approved hours come from the approved weeks (FR-RPT-07). */
  progress(ojtId: string): HoursProgress {
    const o = this.ojt(ojtId);
    const requiredMinutes = (o?.requiredHours ?? 0) * 60;
    const minutes = Object.values(o?.dailyMinutes ?? {});
    const loggedMinutes = minutes.reduce((a, b) => a + b, 0);
    const approvedMinutes = this.state()
      .reports.filter((r) => r.ojtId === ojtId && r.status === 'approved')
      .reduce((sum, r) => sum + this.weekMinutes(ojtId, r.weekStart), 0);
    const remainingMinutes = Math.max(0, requiredMinutes - approvedMinutes);
    const pct = (m: number) => (requiredMinutes ? Math.min(100, Math.round((m / requiredMinutes) * 100)) : 0);
    return {
      requiredMinutes,
      loggedMinutes,
      approvedMinutes,
      remainingMinutes,
      percent: pct(approvedMinutes),
      loggedPercent: pct(loggedMinutes),
      projectedEnd: this.projectedEnd(requiredMinutes - loggedMinutes, minutes),
    };
  }

  /** The last day of the OJT at the mean minutes of a work day (Monday to Friday). */
  private projectedEnd(remaining: number, workDays: number[]): string | null {
    if (workDays.length === 0) {
      return null;
    }
    const mean = workDays.reduce((a, b) => a + b, 0) / workDays.length;
    let left = Math.ceil(Math.max(0, remaining) / mean);
    let day = localDate(new Date());
    while (left > 0) {
      day = addDays(day, 1);
      const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
      if (weekday !== 0 && weekday !== 6) {
        left--;
      }
    }
    return day;
  }

  // ---------- OJT actions: weekly reports ----------

  /** Gives the report of the week. If none exists, it gives a new draft that is not saved yet. */
  reportOrDraft(ojtId: string, week: string): WeeklyReport {
    return this.report(ojtId, week) ?? emptyReport(ojtId, week);
  }

  /** FR-RPT-06: the OJT can change a report only when the status is draft or returned. */
  canEdit(report: WeeklyReport): boolean {
    return report.status === 'draft' || report.status === 'returned';
  }

  saveDraft(ojtId: string, week: string, content: ReportContent): ReportActionResult {
    const current = this.reportOrDraft(ojtId, week);
    if (!this.canEdit(current)) {
      return { ok: false, reason: 'not-editable' };
    }
    const next: WeeklyReport = {
      ...current,
      ...content,
      photos: content.photos.slice(0, MAX_REPORT_PHOTOS),
      history: current.history.length ? current.history : [{ at: nowIso(), status: 'draft', by: 'OJT' }],
      updatedAt: nowIso(),
    };
    this.putReport(next);
    return { ok: true, report: next };
  }

  /** FR-RPT-04: submit. In the real app the submission waits in the outbox when there is no network. */
  submit(ojtId: string, week: string, content: ReportContent): ReportActionResult {
    if (!content.tasksDone.trim() || !content.skillsLearned.trim()) {
      return { ok: false, reason: 'incomplete' };
    }
    const saved = this.saveDraft(ojtId, week, content);
    if (!saved.ok) {
      return saved;
    }
    const next = this.withStatus(saved.report, 'submitted', 'OJT');
    this.putReport(next);
    this.notify('facilitator', 'Report submitted', `${this.ojt(ojtId)?.fullName} submitted the report for the week of ${week}.`, `/facilitator/reviews/report/${next.id}`);
    return { ok: true, report: next };
  }

  // ---------- Facilitator actions ----------

  /** FR-RPT-05: approve, or return with a remark. FR-RPT-07: approval approves the hours of the week. */
  reviewReport(id: string, decision: 'approved' | 'returned', remark: string): ReportActionResult {
    const current = this.reportById(id);
    if (!current || current.status !== 'submitted') {
      return { ok: false, reason: current ? 'not-editable' : 'not-found' };
    }
    if (decision === 'returned' && !remark.trim()) {
      return { ok: false, reason: 'remark-required' };
    }
    const next = this.withStatus(current, decision, FACILITATOR_NAME, remark.trim() || undefined);
    this.putReport(next);
    const title = decision === 'approved' ? 'Weekly report approved' : 'Weekly report returned';
    this.notify('ojt', title, `Your report for the week of ${current.weekStart} is ${decision}.`, `/ojt/reports/${current.weekStart}`);
    return { ok: true, report: next };
  }

  /** FR-COR-02: approve or reject with a remark. A rejection needs a remark. */
  decideCorrection(id: string, decision: 'approved' | 'rejected', remark: string): { ok: boolean; reason?: 'remark-required' | 'not-pending' } {
    const current = this.correction(id);
    if (!current || current.status !== 'pending') {
      return { ok: false, reason: 'not-pending' };
    }
    if (decision === 'rejected' && !remark.trim()) {
      return { ok: false, reason: 'remark-required' };
    }
    this.update((s) => ({
      ...s,
      corrections: s.corrections.map((c) => (c.id === id ? { ...c, status: decision, remark: remark.trim() || undefined, decidedAt: nowIso() } : c)),
    }));
    // FR-COR-03: the original punch stays. An approved request makes a new punch (in the real app, on the server).
    this.notify('ojt', `Correction ${decision}`, `Your ${current.punchType === 'in' ? 'time-in' : 'time-out'} request for ${current.date} is ${decision}.`, '/ojt/corrections');
    return { ok: true };
  }

  // ---------- OJT actions: corrections ----------

  /** FR-COR-01: a request to add a punch or change the time of a punch. The reason is necessary. */
  addCorrection(input: Omit<CorrectionRequest, 'id' | 'ojtId' | 'status' | 'createdAt'>): { ok: boolean; reason?: 'reason-required' | 'future-date' } {
    if (!input.reason.trim()) {
      return { ok: false, reason: 'reason-required' };
    }
    if (input.date > localDate(new Date())) {
      return { ok: false, reason: 'future-date' };
    }
    const request: CorrectionRequest = { ...input, reason: input.reason.trim(), id: newId(), ojtId: ME, status: 'pending', createdAt: nowIso() };
    this.update((s) => ({ ...s, corrections: [request, ...s.corrections] }));
    this.notify('facilitator', 'New correction request', `${this.me().fullName} sent a correction request.`, `/facilitator/reviews/correction/${request.id}`);
    return { ok: true };
  }

  // ---------- Notifications and profile ----------

  markRead(id: string): void {
    this.update((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
  }

  markAllRead(): void {
    const audience = this.audience();
    this.update((s) => ({ ...s, notifications: s.notifications.map((n) => (n.audience === audience ? { ...n, read: true } : n)) }));
  }

  /** FR-PROF-02: change the contact number. */
  updateContact(contactNumber: string): void {
    this.update((s) => ({ ...s, ojts: s.ojts.map((o) => (o.id === ME ? { ...o, contactNumber } : o)) }));
  }

  /** Removes all changes and starts again with the seed data. */
  reset(): void {
    this.state.set(seedState());
    this.persist();
  }

  // ---------- Internal ----------

  private withStatus(report: WeeklyReport, status: ReportStatus, by: string, remark?: string): WeeklyReport {
    const time = nowIso();
    return { ...report, status, updatedAt: time, history: [...report.history, { at: time, status, by, remark }] };
  }

  private putReport(report: WeeklyReport): void {
    this.update((s) => ({ ...s, reports: [report, ...s.reports.filter((r) => r.id !== report.id)] }));
  }

  private notify(audience: NotificationAudience, title: string, body: string, link: string): void {
    const n: AppNotification = { id: newId(), audience, title, body, link, createdAt: nowIso(), read: false };
    this.update((s) => ({ ...s, notifications: [n, ...s.notifications] }));
  }

  private update(change: (s: MockState) => MockState): void {
    this.state.update(change);
    this.persist();
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state()));
    } catch {
      // The prototype works without storage.
    }
  }
}
