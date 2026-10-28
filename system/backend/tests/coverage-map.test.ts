// QR-MA-05 backend coverage (D-52): the share of backend rule items that the L2 tests cover.
// The items come from the migrations: each function, each RLS or Storage policy, and each `sync_push` cause code.
// This test fails if the map does not list an item, so that a new item cannot be left out of the measure.
// The 70% target is checked at each gate (TC-ST-Q-MA-01), not on each push.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const MIGRATIONS = join(__dirname, '..', 'supabase', 'migrations');
const MAP = JSON.parse(readFileSync(join(__dirname, 'coverage-map.json'), 'utf8')) as Record<
  'functions' | 'policies' | 'causes',
  Record<string, string[]>
>;

function itemsInMigrations(): Record<'functions' | 'policies' | 'causes', Set<string>> {
  const sql = readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => readFileSync(join(MIGRATIONS, f), 'utf8'))
    .join('\n');
  const all = (re: RegExp, pick: (m: RegExpMatchArray) => string) => new Set([...sql.matchAll(re)].map(pick));
  return {
    functions: all(/create\s+(?:or\s+replace\s+)?function\s+([a-z_]+\.[a-z_]+)/gi, (m) => m[1].toLowerCase()),
    policies: all(/create\s+policy\s+([a-z_]+)\s+on\s+([a-z_]+\.[a-z_]+)/gi, (m) => `${m[2]}:${m[1]}`),
    causes: new Set([
      ...all(/reject\('([a-z_]+)'\)/g, (m) => m[1]),
      ...all(/'cause',\s*'([a-z_]+)'/g, (m) => m[1]),
    ]),
  };
}

describe('TC-ST-Q-MA-01 backend coverage map (QR-MA-05, D-52)', () => {
  const found = itemsInMigrations();

  for (const kind of ['functions', 'policies', 'causes'] as const) {
    it(`TC-ST-Q-MA-01: the map lists each ${kind.slice(0, -1)} of the migrations, and no other`, () => {
      expect(Object.keys(MAP[kind]).sort()).toEqual([...found[kind]].sort());
    });
  }

  it('TC-ST-Q-MA-01: reports the backend coverage', () => {
    const lists = (['functions', 'policies', 'causes'] as const).flatMap((k) => Object.values(MAP[k]));
    const covered = lists.filter((tests) => tests.length > 0).length;
    const percent = Math.round((covered / lists.length) * 1000) / 10;
    console.log(`Backend coverage (D-52): ${covered} of ${lists.length} items, ${percent}%`);
    expect(lists.length).toBeGreaterThan(0);
  });
});
