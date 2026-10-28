// Layer 4: the DTR rules of the OJT (FR-DTR-01 to FR-DTR-04, FR-DTR-08, FR-DTR-09; system modules 5.1).
// A punch goes to the local database and the outbox first (FR-SYNC-01). It does not need the network.
import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { AssignmentRepository } from '../../data/repositories/assignment.repository';
import { AttachmentRepository, LocalPhoto } from '../../data/repositories/attachment.repository';
import { DeviceContext, DeviceRepository } from '../../data/repositories/device.repository';
import { NewPunch, Punch, PunchRepository } from '../../data/repositories/punch.repository';
import { SyncService } from '../../data/sync/sync.service';
import { CAMERA } from '../../plugins/camera.plugin';
import { GEOLOCATION, Location } from '../../plugins/geolocation.plugin';
import { DTR_SETTINGS } from '../../shared/config/dtr-settings';
import { WorkSession, buildSessions, isMissingTimeOut, openSession } from '../../shared/utils/hours';
import { newId } from '../../shared/utils/uuid';
import { DtrSummary, HistoryWeek, buildHistory, summarize } from './dtr-history';

/**
 * `session-open`: FR-DTR-08. `no-open-session`: FR-DTR-02. `not-ojt`: only an OJT records punches.
 * `photo-*`: FR-DTR-05. The company requires a photo, and the camera gave none. The punch is not saved.
 */
export type PunchFailure = 'session-open' | 'no-open-session' | 'not-ojt' | 'photo-cancelled' | 'photo-denied' | 'photo-failed';

export type PunchResult = { ok: true; punch: Punch; noLocation: boolean } | { ok: false; reason: PunchFailure };

export interface DtrSession extends WorkSession {
  /** FR-DTR-09 (D-37). */
  missingTimeOut: boolean;
}

@Injectable({ providedIn: 'root' })
export class DtrService {
  private readonly auth = inject(AuthService);
  private readonly punches = inject(PunchRepository);
  private readonly device = inject(DeviceRepository);
  private readonly geolocation = inject(GEOLOCATION);
  private readonly camera = inject(CAMERA);
  private readonly assignments = inject(AssignmentRepository);
  private readonly attachments = inject(AttachmentRepository);
  private readonly sync = inject(SyncService);

  /** FR-DTR-01. Rejected when a work session is open (FR-DTR-08, TC-U-DTR-01). */
  timeIn(now: Date = new Date()): Promise<PunchResult> {
    return this.record('in', now);
  }

  /** FR-DTR-02. Rejected when no work session is open (TC-U-DTR-02). */
  timeOut(now: Date = new Date()): Promise<PunchResult> {
    return this.record('out', now);
  }

  /** The work sessions of the OJT with the "Missing time-out" mark (FR-DTR-06, FR-DTR-09). */
  async sessions(ojtId: string, now: Date = new Date()): Promise<DtrSession[]> {
    const list = await this.punches.listByOjt(ojtId);
    const sessions = buildSessions(list.map((p) => ({ id: p.id, type: p.type, time: p.deviceTime, correctsPunchId: p.correctsPunchId })));
    return sessions.map((s) => ({ ...s, missingTimeOut: isMissingTimeOut(s, now, DTR_SETTINGS.missingTimeOutHours) }));
  }

  /** The open work session now, or null. The DTR page shows "Time in" or "Time out" from it. */
  async currentOpenSession(ojtId: string, now: Date = new Date()): Promise<WorkSession | null> {
    return this.openSessionOf(ojtId, now);
  }

  /** FR-DTR-07 and FR-DTR-10: the history by week and by day, with the sync status of each punch. */
  async history(ojtId: string, now: Date = new Date()): Promise<HistoryWeek[]> {
    return buildHistory(await this.punches.listByOjt(ojtId), now, DTR_SETTINGS.missingTimeOutHours);
  }

  /** FR-DTR-10 and FR-DTR-11: the hours of this week and the marks to examine, for the facilitator list. */
  async summary(ojtId: string, now: Date = new Date()): Promise<DtrSummary> {
    return summarize(await this.punches.listByOjt(ojtId), now, DTR_SETTINGS.missingTimeOutHours);
  }

  /**
   * D-51 (DEF-013): the session is open if the punch that was recorded last is a time-in without the
   * "Missing time-out" mark. The device time does not decide, so a punch made with a wrong device clock
   * cannot block the next time-out.
   */
  private async openSessionOf(ojtId: string, now: Date): Promise<WorkSession | null> {
    const last = await this.punches.lastRecorded(ojtId);
    if (!last || last.type !== 'in') {
      return null;
    }
    const sessions = buildSessions([{ id: last.id, type: 'in', time: last.deviceTime, correctsPunchId: null }]);
    return openSession(sessions, now, DTR_SETTINGS.missingTimeOutHours);
  }

  private async record(type: 'in' | 'out', now: Date): Promise<PunchResult> {
    const profile = this.auth.profile();
    if (!profile || profile.role !== 'ojt') {
      return { ok: false, reason: 'not-ojt' };
    }
    const failure = ruleFailure(type, await this.openSessionOf(profile.id, now));
    if (failure) {
      return { ok: false, reason: failure };
    }
    // The location search runs while the camera is open.
    const locating = this.geolocation.currentLocation(DTR_SETTINGS.locationWaitMs, DTR_SETTINGS.locationMaxAgeMs);
    const photo = await this.selfieIfRequired(profile.id);
    if (photo === 'cancelled' || photo === 'denied' || photo === 'failed') {
      return { ok: false, reason: `photo-${photo}` };
    }
    const [context, location] = await Promise.all([this.device.context(), locating]);
    const punch = await this.punches.saveNew(newPunch(profile.id, type, now, context, location, photo), profile.id, photo);
    this.sync.changed();
    return { ok: true, punch, noLocation: location === null };
  }

  /** FR-DTR-05: null if the company does not require a photo. Else the stored photo, or the camera failure. */
  private async selfieIfRequired(ojtId: string): Promise<LocalPhoto | null | 'cancelled' | 'denied' | 'failed'> {
    if (!(await this.assignments.photoRequired(ojtId))) {
      return null;
    }
    const selfie = await this.camera.takeSelfie();
    if (!selfie.ok) {
      return selfie.reason;
    }
    return this.attachments.storePhoto(ojtId, selfie.jpeg);
  }
}

/** FR-DTR-08 and FR-DTR-02. */
function ruleFailure(type: 'in' | 'out', open: WorkSession | null): PunchFailure | null {
  if (type === 'in' && open) {
    return 'session-open';
  }
  if (type === 'out' && !open) {
    return 'no-open-session';
  }
  return null;
}

/** FR-DTR-03 and FR-DTR-04. A null location gives the "no location" flag (QR-SF-05). */
function newPunch(
  ojtId: string,
  type: 'in' | 'out',
  now: Date,
  context: DeviceContext,
  location: Location | null,
  photo: LocalPhoto | null,
): NewPunch {
  return {
    id: newId(),
    ojtId,
    type,
    deviceTime: now.toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    clockOffsetS: context.clockOffsetS,
    lat: location?.lat ?? null,
    lng: location?.lng ?? null,
    accuracyM: location?.accuracyM ?? null,
    photoId: photo?.id ?? null,
    deviceId: context.deviceId,
    correctsPunchId: null,
  };
}
