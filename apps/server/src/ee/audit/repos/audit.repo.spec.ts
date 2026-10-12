import { AuditRepo, AuditLogWithActor } from './audit.repo';

function makeDbMock() {
  const calls: { method: string; args: any[] }[] = [];
  const chain: any = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === 'executeTakeFirst') return async () => ({ id: 'a1' });
        if (prop === 'executeTakeFirstOrThrow') return async () => ({ id: 'a1' });
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

describe('AuditRepo', () => {
  let repo: AuditRepo;
  let dbMock: ReturnType<typeof makeDbMock>;

  beforeEach(() => {
    dbMock = makeDbMock();
    repo = new AuditRepo(dbMock.db);
  });

  it('insertAuditLog persists a row into auditLogs', async () => {
    await repo.insertAuditLog({
      workspaceId: 'w1',
      actorId: 'u1',
      actorType: 'user',
      event: 'user.login',
      resourceType: 'user',
      resourceId: 'u1',
    });

    const insert = dbMock.calls.find(
      (c) => c.method === 'insertInto' && c.args[0] === 'audit',
    );
    expect(insert).toBeDefined();
  });

  it('listAuditLogs is workspace-scoped and applies event filter', async () => {
    const result = await repo.listAuditLogs(
      'w1',
      { limit: 50 } as any,
      { event: 'user.login' },
    );

    expect(Array.isArray(result.items)).toBe(true);
    expect(result.meta).toBeDefined();

    const wsWhere = dbMock.calls.find(
      (c) => c.method === 'where' && c.args[0] === 'audit.workspaceId',
    );
    expect(wsWhere).toBeDefined();

    const eventWhere = dbMock.calls.find(
      (c) => c.method === 'where' && c.args[0] === 'audit.event',
    );
    expect(eventWhere).toBeDefined();
  });

  it('updateRetention updates workspaces.auditRetentionDays', async () => {
    await repo.updateRetention('w1', 180);

    const upd = dbMock.calls.find(
      (c) => c.method === 'updateTable' && c.args[0] === 'workspaces',
    );
    expect(upd).toBeDefined();
    const setCall = dbMock.calls.find((c) => c.method === 'set');
    expect(setCall).toBeDefined();
  });
});
