import { NO_FAULTS, withFaults, withTimeout } from './fetch-wrapper';

/** A fetch that answers only when the signal aborts, as a server that does not answer. */
const hangingFetch: typeof fetch = (_input, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
  });

describe('fetch wrapper', () => {
  afterEach(() => vi.useRealTimers());

  it('TC-SI-SYNC-06 (unit part): a request with no answer fails after the time limit', async () => {
    vi.useFakeTimers();
    const request = withTimeout(hangingFetch, 1000)('https://example.test');
    const check = expect(request).rejects.toMatchObject({ name: 'TimeoutError' });
    await vi.advanceTimersByTimeAsync(1000);
    await check;
  });

  it('TC-SI-SYNC-06 (unit part): a fast answer is given and the timer stops', async () => {
    vi.useFakeTimers();
    const ok = vi.fn<typeof fetch>().mockResolvedValue(new Response('ok'));
    const res = await withTimeout(ok, 1000)('https://example.test');
    expect(await res.text()).toBe('ok');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('TC-ST-OJT-04 (unit part): with no network, a request fails at once, not after the time limit (DEF-014)', async () => {
    const base = vi.fn<typeof fetch>();
    await expect(withTimeout(base, 15_000, () => true)('https://example.test')).rejects.toBeInstanceOf(TypeError);
    expect(base).not.toHaveBeenCalled();
  });

  it("TC-SI-SYNC-06 (unit part): the caller's own abort still stops the request", async () => {
    const outer = new AbortController();
    const request = withTimeout(hangingFetch, 60_000)('https://example.test', { signal: outer.signal });
    outer.abort(new Error('caller abort'));
    await expect(request).rejects.toThrow('caller abort');
  });

  it('TC-SI-SYNC-02 (unit part): the fault injector drops requests, gives 500, or passes them', async () => {
    const base = vi.fn<typeof fetch>().mockImplementation(async () => new Response('real'));
    const rolls = [0.05, 0.35, 0.9];
    const faulty = withFaults(base, () => ({ drop: 0.3, serverError: 0.1 }), () => rolls.shift() ?? 1);

    await expect(faulty('https://example.test')).rejects.toBeInstanceOf(TypeError);
    expect((await faulty('https://example.test')).status).toBe(500);
    expect(await (await faulty('https://example.test')).text()).toBe('real');
    expect(base).toHaveBeenCalledTimes(1);
  });

  it('TC-SI-SYNC-02 (unit part): with no faults, each request goes to the real fetch', async () => {
    const base = vi.fn<typeof fetch>().mockResolvedValue(new Response('real'));
    const faulty = withFaults(base, () => NO_FAULTS, () => 0);
    await faulty('https://example.test');
    expect(base).toHaveBeenCalledTimes(1);
  });
});
