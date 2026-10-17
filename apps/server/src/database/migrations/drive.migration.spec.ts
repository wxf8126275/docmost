import { up, down } from './20261016T090000-drive';

/**
 * Behavioural test for the drive migration. We mock Kysely's fluent schema
 * builder (no live Postgres needed) and assert the two tables and their
 * columns are declared. Fails before the migration file exists / is wrong,
 * passes once `20261016T090000-drive.ts` declares the expected schema.
 */
function makeDbMock() {
  const tables: Record<string, string[]> = {};

  function makeTableChain(tableName: string) {
    const chain: any = new Proxy(
      {},
      {
        get(_t, prop: string) {
          if (prop === 'addColumn') {
            return (col: string, type: string) => {
              (tables[tableName] ||= []).push(`${col}:${type}`);
              return chain;
            };
          }
          if (prop === 'execute') {
            return async () => undefined;
          }
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
        if (prop === 'createTable') {
          return (name: string) => makeTableChain(name);
        }
        if (prop === 'dropTable') {
          return () => ({ execute: async () => undefined });
        }
        return () => undefined;
      },
    },
  );

  return { db: { schema } as any, tables };
}

describe('drive migration', () => {
  it('creates drive_folders and drive_files with the expected columns', async () => {
    const { db, tables } = makeDbMock();

    await up(db);

    expect(Object.keys(tables).sort()).toEqual([
      'drive_files',
      'drive_folders',
    ]);

    expect(tables['drive_folders']).toEqual(
      expect.arrayContaining([
        'id:uuid',
        'workspace_id:uuid',
        'drive_type:varchar',
        'owner_id:uuid',
        'parent_id:uuid',
        'name:varchar',
        'creator_id:uuid',
        'created_at:timestamptz',
        'updated_at:timestamptz',
        'deleted_at:timestamptz',
      ]),
    );

    expect(tables['drive_files']).toEqual(
      expect.arrayContaining([
        'id:uuid',
        'workspace_id:uuid',
        'drive_type:varchar',
        'owner_id:uuid',
        'folder_id:uuid',
        'file_name:varchar',
        'file_path:varchar',
        'file_size:int8',
        'file_ext:varchar',
        'mime_type:varchar',
        'type:varchar',
        'creator_id:uuid',
        'created_at:timestamptz',
        'updated_at:timestamptz',
        'deleted_at:timestamptz',
      ]),
    );
  });

  it('down drops both tables without throwing', async () => {
    const { db } = makeDbMock();
    await expect(down(db)).resolves.toBeUndefined();
  });
});
