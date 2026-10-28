import { AuthStorage, DeviceClockExpiry, withDeviceExpiry } from './token-storage';

class MemoryStorage implements AuthStorage {
  readonly items = new Map<string, string>();
  async getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  async setItem(key: string, value: string) {
    this.items.set(key, value);
  }
  async removeItem(key: string) {
    this.items.delete(key);
  }
}

describe('Session expiry in device time (DEF-012, QR-RE-08)', () => {
  // The device clock is 2 hours ahead of the server.
  const serverNowS = Date.parse('2026-10-26T09:00:00Z') / 1000;
  const deviceNowMs = Date.parse('2026-10-26T11:00:00Z');
  const session = { access_token: 'a', refresh_token: 'r', expires_in: 900, expires_at: serverNowS + 900, user: { id: 'u1' } };

  it('TC-SI-SYNC-05 (unit part): a new session expires 900 s after its arrival in device time', async () => {
    const inner = new MemoryStorage();
    const storage = new DeviceClockExpiry(inner, () => deviceNowMs);
    await storage.setItem('sb-key', JSON.stringify(session));
    const saved = JSON.parse((await storage.getItem('sb-key'))!);
    expect(saved.expires_at).toBe(deviceNowMs / 1000 + 900);
    expect(saved).toMatchObject({ access_token: 'a', refresh_token: 'r', user: { id: 'u1' } });
  });

  it('TC-SI-SYNC-05 (unit part): values that are not a session do not change', () => {
    for (const value of ['plain-code-verifier', '42', 'null', JSON.stringify({ expires_in: 900 }), '{bad json']) {
      expect(withDeviceExpiry(value, deviceNowMs)).toBe(value);
    }
  });

  it('TC-SI-SYNC-05 (unit part): remove and get go to the inner storage', async () => {
    const inner = new MemoryStorage();
    const storage = new DeviceClockExpiry(inner, () => deviceNowMs);
    await inner.setItem('k', 'v');
    expect(await storage.getItem('k')).toBe('v');
    await storage.removeItem('k');
    expect(inner.items.size).toBe(0);
  });
});
