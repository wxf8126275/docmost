import { up as upA, down as downA } from './20261019T090000-space-drive-type';
import { up as upB, down as downB } from './20261019T100000-drive-space-id-notnull';
import { applyBackfill } from '../backfill/drive-to-spaces';

// Shared operation log so we can assert cross-module ordering (backfill must
// run before any schema alteration). `mock`-prefixed so jest hoisting allows it.
const mockOpLog: string[] = [];

jest.mock('../backfill/drive-to-spaces', () => ({
  applyBackfill: jest.fn(async () => {
    mockOpLog.push('backfill');
    return {
      spacesCreated: 0,
      membersAdded: 0,
      foldersAssigned: 0,
      filesAssigned: 0,
      sharesAssigned: 0,
      versionsAssigned: 0,
      dryRun: false,
    };
  }),
}));

/**
 * Behavioural test for the drive -> space schema change. We mock Kysely's fluent
 * schema builder (no live Postgres needed) and assert the expected columns are
 * added / altered / dropped. Fails before the migration files exist / are wrong,
 * passes once they declare the expected schema.
 */
type Col = { name: string; type: string; notNull: boolean; default?: unknown };
type Alter = { adds: Col[]; drops: string[]; notNull: string[]; dropNotNull: string[] };

function makeDbMock() {
  const alters: Record<string, Alter> = {};
  mockOpLog.length = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sqlCalls: any[] = [];

  function makeAlterChain(table: string) {
    const a: Alter = (alters[table] ||= {
      adds: [],
      drops: [],
      notNull: [],
      dropNotNull: [],
    });
    const chain: any = new Proxy(
      {},
      {
        get(_t, prop: string) {
          if (prop === 'addColumn') {
            return (name: string, type: string, buildFn?: (col: any) => any) => {
              const rec: Col = { name, type, notNull: false, default: undefined };
              const col: any = {
                notNull: () => {
                  rec.notNull = true;
                  return col;
                },
                defaultTo: (d: unknown) => {
                  rec.default = d;
                  return col;
                },
                references: () => col,
                onDelete: () => col,
              };
              a.adds.push(rec);
              mockOpLog.push(`add:${table}:${name}`);
              if (buildFn) buildFn(col);
              return chain;
            };
          }
          if (prop === 'dropColumn') {
            return (name: string) => {
              a.drops.push(name);
              mockOpLog.push(`drop:${table}:${name}`);
              return chain;
            };
          }
          if (prop === 'alterColumn') {
            return (name: string, fn?: (c: any) => any) => {
              const c: any = {
                setNotNull: () => {
                  a.notNull.push(name);
                  mockOpLog.push(`notnull:${table}:${name}`);
                  return c;
                },
                dropNotNull: () => {
                  a.dropNotNull.push(name);
                  mockOpLog.push(`dropnotnull:${table}:${name}`);
                  return c;
                },
              };
              if (fn) fn(c);
              return chain;
            };
          }
          if (prop === 'execute') return async () => undefined;
          return () => chain;
        },
      },
    );
    return chain;
  }

  const schema: any = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === 'alterTable') return (name: string) => makeAlterChain(name);
        return () => undefined;
      },
    },
  );

  // Raw `sql` statements go through
  // db.getExecutor().{transformQuery,compileQuery,executeQuery}.
  const sqlTextOf = (node: any): string =>
    (node?.sqlFragments ?? [])
      .map((s: any) => (typeof s === 'string' ? s : (s?.value ?? '')))
      .join(' ');

  const db: any = {
    schema,
    getExecutor: () => ({
      transformQuery: (node: any) => node,
      compileQuery: (node: any) => ({ sql: sqlTextOf(node) }),
      executeQuery: async (compiled: any) => {
        sqlCalls.push(compiled);
        mockOpLog.push('sweep');
        return {};
      },
    }),
  };

  return { db, alters, sqlCalls };
}

const DRIVE_TABLES = [
  'drive_folders',
  'drive_files',
  'drive_shares',
  'drive_file_versions',
];

describe('drive -> space schema migration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('A: adds spaces.type (default page) and spaceId to all drive tables', async () => {
    const { db, alters } = makeDbMock();
    await upA(db);

    expect(alters['spaces'].adds).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'type',
          type: 'varchar',
          notNull: true,
          default: 'page',
        }),
      ]),
    );

    for (const t of DRIVE_TABLES) {
      expect(alters[t].adds).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'spaceId', type: 'uuid' }),
        ]),
      );
    }
  });

  it('A: down drops spaceId from drive tables and type from spaces', async () => {
    const { db, alters } = makeDbMock();
    await downA(db);
    for (const t of DRIVE_TABLES) {
      expect(alters[t].drops).toContain('spaceId');
    }
    expect(alters['spaces'].drops).toContain('type');
  });

  it('B: drops legacy drive_type/owner_id and sets spaceId NOT NULL', async () => {
    const { db, alters } = makeDbMock();
    await upB(db);
    expect(alters['drive_folders'].drops).toEqual(
      expect.arrayContaining(['driveType', 'ownerId']),
    );
    expect(alters['drive_files'].drops).toEqual(
      expect.arrayContaining(['driveType', 'ownerId']),
    );
    for (const t of DRIVE_TABLES) {
      expect(alters[t].notNull).toContain('spaceId');
    }
  });

  it('B: down re-adds legacy columns and drops spaceId NOT NULL', async () => {
    const { db, alters } = makeDbMock();
    await downB(db);
    expect(alters['drive_folders'].adds.map((c) => c.name)).toEqual(
      expect.arrayContaining(['driveType', 'ownerId']),
    );
    expect(alters['drive_files'].adds.map((c) => c.name)).toEqual(
      expect.arrayContaining(['driveType', 'ownerId']),
    );
    expect(alters['drive_folders'].dropNotNull).toContain('spaceId');
  });

  // --- B001 regression: migration must not crash-loop on v1 data ---

  it('B: backfills v1 rows BEFORE any schema alteration', async () => {
    const { db } = makeDbMock();
    await upB(db);

    expect(applyBackfill).toHaveBeenCalledTimes(1);
    expect(applyBackfill).toHaveBeenCalledWith(db);

    // The very first operation must be the backfill; every drop/notnull/add
    // schema operation must come after it (raw-SQL sweeps may sit between).
    expect(mockOpLog[0]).toBe('backfill');
    const firstSchemaOp = mockOpLog.findIndex(
      (e) =>
        e.startsWith('drop:') ||
        e.startsWith('notnull:') ||
        e.startsWith('add:'),
    );
    expect(firstSchemaOp).toBeGreaterThan(0);
    expect(mockOpLog.indexOf('backfill')).toBeLessThan(firstSchemaOp);
  });

  it('B: sweeps residual NULL share/version rows from their files, then constrains', async () => {
    const { db, sqlCalls } = makeDbMock();
    await upB(db);

    const texts = sqlCalls.map((q) => q?.sql ?? JSON.stringify(q));
    expect(texts.some((s) => s.includes('drive_shares'))).toBe(true);
    expect(texts.some((s) => s.includes('drive_file_versions'))).toBe(true);

    // sweep runs after the backfill but before any column is dropped.
    expect(mockOpLog.indexOf('backfill')).toBeLessThan(
      mockOpLog.indexOf('sweep'),
    );
    expect(mockOpLog.lastIndexOf('sweep')).toBeLessThan(
      mockOpLog.findIndex((e) => e.startsWith('drop:')),
    );
  });
});
