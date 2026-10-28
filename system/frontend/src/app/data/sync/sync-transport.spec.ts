import { TransportClient, TransportError, createSyncTransport } from './sync-transport';

type RpcResult = { data: unknown; error: { message: string } | null; status: number };

/** A fake client. `answers` gives the RPC results in order. `refresh` gives the refresh result. */
function fakeClient(answers: (RpcResult | Error)[], refresh: () => Promise<{ error: { message: string; status?: number } | null }>) {
  const calls: string[] = [];
  const client: TransportClient = {
    rpc: async (fn) => {
      calls.push(fn);
      const next = answers.shift();
      if (!next || next instanceof Error) {
        throw next ?? new Error('no answer');
      }
      return next;
    },
    auth: {
      refreshSession: async () => {
        calls.push('refresh');
        return refresh();
      },
    },
  };
  return { client, calls };
}

const OK: RpcResult = { data: { epoch: 'e1', records: [] }, error: null, status: 200 };
const EXPIRED: RpcResult = { data: null, error: { message: 'JWT expired' }, status: 401 };

async function kindOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return 'ok';
  } catch (error) {
    return error instanceof TransportError ? error.kind : 'other';
  }
}

describe('Sync transport: access token expired (offline sync design 13, DEF-012)', () => {
  it('TC-SI-SYNC-05 (unit part): a 401 refreshes the session, and the call is sent again', async () => {
    const { client, calls } = fakeClient([EXPIRED, OK], async () => ({ error: null }));
    await expect(createSyncTransport(client).pull(0, null, 500)).resolves.toEqual(OK.data);
    expect(calls).toEqual(['sync_pull', 'refresh', 'sync_pull']);
  });

  it('TC-SI-SYNC-05 (unit part): only a refresh that Auth rejects ends the session', async () => {
    const { client } = fakeClient([EXPIRED], async () => ({ error: { message: 'Invalid Refresh Token', status: 400 } }));
    expect(await kindOf(createSyncTransport(client).push([], '2026-10-26T00:00:00Z'))).toBe('session');
  });

  it('TC-SI-SYNC-06 (unit part): a refresh with no network is "unreachable", not a session end (QR-RE-08)', async () => {
    const noNetwork = fakeClient([EXPIRED], async () => ({ error: { message: 'Failed to fetch', status: 0 } }));
    expect(await kindOf(createSyncTransport(noNetwork.client).pull(0, null, 500))).toBe('unreachable');
    const serverError = fakeClient([EXPIRED], async () => ({ error: { message: 'Bad gateway', status: 502 } }));
    expect(await kindOf(createSyncTransport(serverError.client).pull(0, null, 500))).toBe('unreachable');
    const thrown = fakeClient([EXPIRED], () => Promise.reject(new Error('timeout')));
    expect(await kindOf(createSyncTransport(thrown.client).pull(0, null, 500))).toBe('unreachable');
  });

  it('TC-SI-SYNC-05 (unit part): a second 401 after a good refresh ends the session, with one refresh only', async () => {
    const { client, calls } = fakeClient([EXPIRED, EXPIRED], async () => ({ error: null }));
    expect(await kindOf(createSyncTransport(client).pull(0, null, 500))).toBe('session');
    expect(calls.filter((c) => c === 'refresh')).toHaveLength(1);
  });

  it('TC-SI-SYNC-06 (unit part): no answer and 5xx are "unreachable"; other errors are "refused"', async () => {
    expect(await kindOf(createSyncTransport(fakeClient([new Error('Failed to fetch')], async () => ({ error: null })).client).pull(0, null, 1))).toBe('unreachable');
    expect(await kindOf(createSyncTransport(fakeClient([{ data: null, error: { message: 'x' }, status: 503 }], async () => ({ error: null })).client).pull(0, null, 1))).toBe('unreachable');
    expect(await kindOf(createSyncTransport(fakeClient([{ data: null, error: { message: 'x' }, status: 403 }], async () => ({ error: null })).client).pull(0, null, 1))).toBe('refused');
  });
});
