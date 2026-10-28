import { SyncIssue } from '../../data/repositories/sync-issue.repository';
import { STRINGS } from '../../shared/strings';
import { issueCause, issueTime, issueTitle } from './sync-issue-text';

const issue = (over: Partial<SyncIssue> = {}): SyncIssue => ({
  opId: 'o1',
  entity: 'punches',
  entityId: 'p1',
  opType: 'create',
  cause: 'invalid_data',
  payload: { type: 'in', device_time: '2026-10-26T00:05:00.000Z' },
  createdAt: '2026-10-26T01:00:00.000Z',
  serverRecord: null,
  ...over,
});

describe('Sync issue card text (FR-SYNC-06)', () => {
  it('TC-ST-OJT-03 (unit part): the card shows the change, its time, and the cause', () => {
    expect(issueTitle(issue())).toBe('Punch: Time in');
    expect(issueTime(issue())).toBe('2026-10-26 08:05');
    expect(issueCause(issue())).toBe(STRINGS.issues.cause['invalid_data']);
  });

  it('TC-ST-OJT-03 (unit part): DEF-009, an invalid time in the change does not stop the card', () => {
    expect(issueTime(issue({ payload: { type: 'in', device_time: 'yesterday' } }))).toBe('2026-10-26 09:00');
    expect(issueTime(issue({ payload: {}, createdAt: 'bad' }))).toBe('');
    expect(issueTitle(issue({ entity: 'x', payload: { type: 42 } }))).toBe('x');
  });

  it('TC-ST-OJT-03 (unit part): an unknown cause code gives the general text', () => {
    expect(issueCause(issue({ cause: 'new_code' }))).toBe(STRINGS.issues.unknownCause);
  });
});
