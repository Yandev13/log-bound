// Shared test helpers for the L2 tests against the dev project (test plan, section 4.2).
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Put it in system/backend/.env or in the CI secrets.`);
  }
  return value;
}

/** A new client with no stored session, so that two clients do not share tokens. */
export function newClient(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Seed accounts (test plan, section 10.2, and supabase/seed.sql). */
export const SEED = {
  admin: { email: 'admin@test.local', id: '00000000-0000-4000-a000-000000000001' },
  fac1: { email: 'fac1@test.local', id: '00000000-0000-4000-a000-000000000011' },
  fac2: { email: 'fac2@test.local', id: '00000000-0000-4000-a000-000000000012' },
  ojt1: { email: 'ojt1@test.local', id: '00000000-0000-4000-a000-000000000021' },
  ojt4: { email: 'ojt4@test.local', id: '00000000-0000-4000-a000-000000000024' },
  ojt6: { email: 'ojt6@test.local', id: '00000000-0000-4000-a000-000000000026' },
  companyA: '10000000-0000-4000-a000-000000000001',
  batch1: '20000000-0000-4000-a000-000000000001',
} as const;

/** Signs in a seed account and returns its client. */
export async function signedIn(email: string): Promise<SupabaseClient> {
  const client = newClient();
  const { error } = await client.auth.signInWithPassword({ email, password: env('SEED_PASSWORD') });
  if (error) {
    throw new Error(`Sign-in failed for ${email}: ${error.message}`);
  }
  return client;
}
