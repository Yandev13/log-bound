// The text of one sync issue card (FR-SYNC-06). A rejected change often has invalid data, so no function
// here may throw on bad data (DEF-009).
import { SyncIssue } from '../../data/repositories/sync-issue.repository';
import { STRINGS } from '../../shared/strings';
import { timeOfDay } from '../../shared/utils/format';
import { localDate } from '../../shared/utils/hours';

const text = STRINGS.issues;

/** For example "Punch: Time in". */
export function issueTitle(issue: SyncIssue): string {
  const entity = text.entity[issue.entity] ?? issue.entity;
  const type = issue.payload['type'];
  const kind = type === 'in' ? STRINGS.dtr.timeIn : type === 'out' ? STRINGS.dtr.timeOut : '';
  return kind ? `${entity}: ${kind}` : entity;
}

/** The time of the change (Asia/Manila). If the change has no valid time, the time when it was saved on the device. */
export function issueTime(issue: SyncIssue): string {
  for (const candidate of [issue.payload['device_time'], issue.createdAt]) {
    if (typeof candidate === 'string' && !Number.isNaN(Date.parse(candidate))) {
      return `${localDate(candidate)} ${timeOfDay(candidate)}`;
    }
  }
  return '';
}

export function issueCause(issue: SyncIssue): string {
  return text.cause[issue.cause] ?? text.unknownCause;
}
