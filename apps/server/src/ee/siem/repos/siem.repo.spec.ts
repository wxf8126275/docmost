import { SiemRepo } from './siem.repo';

function makeDbMock() {
  const calls: { method: string; args: any[] }[] = [];
  const chain: any = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === 'executeTakeFirst') return async () => ({ id: 'd1', version: 2 });
        if (prop === 'executeTakeFirstOrThrow') return async () => ({ id: 'd1' });
        if (prop === 'execute') return async () => [];
        return (...args: any[]) => {
          calls.push({ method: prop, args });
          return chain;
        };
      },
    },
  );
  return { db: chain, calls };
}

describe('SiemRepo', () => {
  let repo: SiemRepo;
  let dbMock: ReturnType<typeof makeDbMock>;

  beforeEach(() => {
    dbMock = makeDbMock();
    repo = new SiemRepo(dbMock.db);
  });

  it('create inserts into siemDestinations', async () => {
    await repo.create({
      workspaceId: 'w1',
      name: 'dest',
      type: 'http',
      config: { url: 'x' },
      secrets: 'enc',
      creatorId: 'u1',
    } as any);
    expect(
      dbMock.calls.find(
        (c) => c.method === 'insertInto' && c.args[0] === 'siemDestinations',
      ),
    ).toBeDefined();
  });

  it('listByWorkspace is workspace-scoped', async () => {
    await repo.listByWorkspace('w1');
    const where = dbMock.calls.find(
      (c) => c.method === 'where' && c.args[0] === 'workspaceId',
    );
    expect(where).toBeDefined();
  });

  it('findEnabledByWorkspace filters enabled destinations', async () => {
    await repo.findEnabledByWorkspace('w1');
    const enabled = dbMock.calls.find(
      (c) => c.method === 'where' && c.args[0] === 'enabled',
    );
    expect(enabled?.args[2]).toBe(true);
  });

  it('update applies optimistic-lock version check', async () => {
    await repo.update('d1', 'w1', { name: 'x' } as any, 3);
    const versionWhere = dbMock.calls.find(
      (c) => c.method === 'where' && c.args[0] === 'version',
    );
    expect(versionWhere?.args[2]).toBe(3);
    const setCall = dbMock.calls.find((c) => c.method === 'set');
    expect(setCall?.args[0]).toHaveProperty('version');
  });

  it('remove deletes by id and workspace', async () => {
    await repo.remove('d1', 'w1');
    expect(
      dbMock.calls.find(
        (c) => c.method === 'deleteFrom' && c.args[0] === 'siemDestinations',
      ),
    ).toBeDefined();
  });

  it('markDelivered and markFailed both update siemDestinations', async () => {
    await repo.markDelivered('d1', new Date(), new Date(), 'id', 'snap');
    await repo.markFailed('d1', 'boom', new Date(), new Date());
    const updates = dbMock.calls.filter(
      (c) => c.method === 'updateTable' && c.args[0] === 'siemDestinations',
    );
    expect(updates).toHaveLength(2);
  });
});
