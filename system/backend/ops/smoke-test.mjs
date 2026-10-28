// Smoke test (runbook, procedure A, step 5): heartbeat, one test login, server epoch.
// The sync_pull step comes in S2, when the function exists.
// Usage, in system/backend/:  npm run smoke   (reads .env)
// Exit code 0 = pass, 1 = fail.
import { createClient } from '@supabase/supabase-js';

const need = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
};

const client = createClient(need('SUPABASE_URL'), need('SUPABASE_ANON_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const source = process.env.HEARTBEAT_SOURCE ?? 'smoke';
let failed = false;
const step = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failed = true;
};

const hb = await client.rpc('heartbeat', { source, secret: need('KEEPALIVE_SECRET') });
step('heartbeat', !hb.error, hb.error?.message ?? String(hb.data));

if (process.env.SEED_PASSWORD) {
  const login = await client.auth.signInWithPassword({
    email: process.env.SMOKE_EMAIL ?? 'ojt1@test.local',
    password: process.env.SEED_PASSWORD,
  });
  step('test login', !login.error, login.error?.message ?? '');
  if (!login.error) {
    const epoch = await client.rpc('server_epoch');
    step('server epoch', !epoch.error && !!epoch.data, epoch.error?.message ?? '');
    await client.auth.signOut();
  }
} else {
  console.log('SKIP  test login (no SEED_PASSWORD, for example on prod)');
}

process.exit(failed ? 1 : 0);
