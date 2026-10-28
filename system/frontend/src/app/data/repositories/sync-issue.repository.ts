// The changes that the server did not accept (FR-SYNC-06; offline sync design, section 3).
// User actions: "Try again" (issue -> pending) and "Discard my change" (issue -> synced with the server copy,
// or removed if the server has no copy).
import { Injectable, inject } from '@angular/core';
import { LocalDbService } from '../local-db/local-db.service';
import { PULLED_ENTITIES, markSynced } from '../sync/local-merge';

export interface SyncIssue {
  opId: string;
  entity: string;
  entityId: string;
  opType: string;
  /** The cause code from the server (API contract, section 5.1), for example `invalid_data`. */
  cause: string;
  payload: Record<string, unknown>;
  createdAt: string;
  /** The current server copy, if the server gave one (conflict). */
  serverRecord: Record<string, unknown> | null;
}

interface IssueRow {
  [key: string]: string | number | null;
  op_id: string;
  entity: string;
  entity_id: string;
  op_type: string;
  last_error: string | null;
  payload: string;
  created_at: string;
  server_record: string | null;
}

@Injectable({ providedIn: 'root' })
export class SyncIssueRepository {
  private readonly local = inject(LocalDbService);

  async list(userId: string): Promise<SyncIssue[]> {
    const db = await this.local.db();
    const rows = await db.query<IssueRow>(
      "select * from outbox where user_id = ? and status = 'issue' order by created_at, rowid",
      [userId],
    );
    return rows.map((r) => ({
      opId: r.op_id,
      entity: r.entity,
      entityId: r.entity_id,
      opType: r.op_type,
      cause: r.last_error ?? 'unknown',
      payload: JSON.parse(r.payload) as Record<string, unknown>,
      createdAt: r.created_at,
      serverRecord: r.server_record ? (JSON.parse(r.server_record) as Record<string, unknown>) : null,
    }));
  }

  /** "Try again": the change goes back to the queue. The record is `pending` again. */
  async retry(issue: SyncIssue): Promise<void> {
    const db = await this.local.db();
    await db.transaction(async (tx) => {
      await tx.run("update outbox set status = 'queued', last_error = null, server_record = null where op_id = ?", [issue.opId]);
      if (isLocalTable(issue.entity)) {
        await tx.run(`update ${issue.entity} set sync_status = 'pending' where id = ?`, [issue.entityId]);
      }
    });
  }

  /**
   * "Discard my change": the operation is removed. The local record takes the server copy. If the server has no
   * copy (a new record that the server rejected), the local record is removed.
   */
  async discard(issue: SyncIssue): Promise<void> {
    const db = await this.local.db();
    await db.transaction(async (tx) => {
      await tx.run('delete from outbox where op_id = ?', [issue.opId]);
      if (!isLocalTable(issue.entity)) {
        return;
      }
      if (issue.serverRecord) {
        await markSynced(tx, issue.entity, issue.entityId, issue.serverRecord);
      } else if (issue.opType === 'create') {
        await tx.run(`delete from ${issue.entity} where id = ?`, [issue.entityId]);
      } else {
        await tx.run(`update ${issue.entity} set sync_status = 'synced' where id = ?`, [issue.entityId]);
      }
    });
  }
}

function isLocalTable(entity: string): boolean {
  return (PULLED_ENTITIES as readonly string[]).includes(entity);
}
