// Layer 2: the two sync RPC calls (API contract, section 5). The sync engine uses only this interface,
// so that unit tests can give a fake server.
import { InjectionToken, inject } from '@angular/core';
import { SUPABASE } from '../../core/supabase.client';

export interface PushOp {
  op_id: string;
  entity: string;
  entity_id: string;
  op_type: string;
  payload: unknown;
  base_version: number | null;
}

export type PushResultCode = 'applied' | 'duplicate' | 'conflict' | 'rejected';

export interface PushResult {
  op_id: string;
  result: PushResultCode;
  cause?: string;
  record?: Record<string, unknown> | null;
}

export interface PushResponse {
  server_time: string;
  results: PushResult[];
}

export interface PullRecord {
  entity: string;
  change_seq: number;
  data: Record<string, unknown>;
}

export interface PullResponse {
  epoch: string;
  epoch_changed: boolean;
  server_time: string;
  records: PullRecord[];
  cursor: number;
  has_more: boolean;
}

/**
 * `unreachable`: no answer, a timeout, or a 5xx error (FR-SYNC-08). Retry later. Keep the session.
 * `session`: the server does not accept the session (401). AUTH shows the login screen. The outbox stays.
 * `refused`: the server refused the call (for example an inactive account).
 */
export type TransportErrorKind = 'unreachable' | 'session' | 'refused';

export class TransportError extends Error {
  constructor(
    readonly kind: TransportErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'TransportError';
  }
}

export interface SyncTransport {
  push(ops: PushOp[], deviceNow: string): Promise<PushResponse>;
  pull(cursor: number, epoch: string | null, limit: number): Promise<PullResponse>;
}

/** Sorts the error of an RPC call (offline sync design, section 13). Status 0 means that fetch failed. */
export function errorKindOf(status: number): TransportErrorKind {
  if (status === 0 || status >= 500) {
    return 'unreachable';
  }
  if (status === 401) {
    return 'session';
  }
  return 'refused';
}

/** The parts of the Supabase client that the transport uses. Tests give a fake. */
export interface TransportClient {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message: string } | null; status: number }>;
  auth: { refreshSession(): Promise<{ error: { message: string; status?: number } | null }> };
}

/**
 * Section 13: "Access token expired: refresh the token, then send again." Throws `session` only if Supabase Auth
 * rejects the refresh. A network failure or a 5xx error during the refresh is `unreachable` (QR-RE-08, DEF-012).
 */
export async function refreshSession(client: Pick<TransportClient, 'auth'>): Promise<void> {
  let result;
  try {
    result = await client.auth.refreshSession();
  } catch (error) {
    throw new TransportError('unreachable', String(error));
  }
  if (result.error) {
    const status = result.error.status ?? 0;
    throw new TransportError(status === 0 || status >= 500 ? 'unreachable' : 'session', result.error.message);
  }
}

export function createSyncTransport(client: TransportClient): SyncTransport {
  const once = async (fn: string, args: Record<string, unknown>) => {
    try {
      return await client.rpc(fn, args);
    } catch (error) {
      throw new TransportError('unreachable', String(error));
    }
  };
  const call = async <T>(fn: string, args: Record<string, unknown>): Promise<T> => {
    let result = await once(fn, args);
    if (result.error && result.status === 401) {
      await refreshSession(client);
      result = await once(fn, args);
    }
    if (result.error) {
      throw new TransportError(errorKindOf(result.status), result.error.message);
    }
    return result.data as T;
  };
  return {
    push: (ops, deviceNow) => call<PushResponse>('sync_push', { p_ops: ops, p_device_now: deviceNow }),
    pull: (cursor, epoch, limit) => call<PullResponse>('sync_pull', { p_cursor: cursor, p_epoch: epoch, p_limit: limit }),
  };
}

export const SYNC_TRANSPORT = new InjectionToken<SyncTransport>('SYNC_TRANSPORT', {
  providedIn: 'root',
  factory: () => createSyncTransport(inject(SUPABASE) as unknown as TransportClient),
});
