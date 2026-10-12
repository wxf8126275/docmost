import { ApiKeyRepo } from './api-key.repo';

function makeDbMock() {
  const calls: { lastResult: unknown } = { lastResult: [] };
  const chain: any = new Proxy(
    {},
    {
      get(_target, prop: string) {
        switch (prop) {
          case 'executeTakeFirst':
          case 'execute':
            return async () => calls.lastResult;
          case 'executeTakeFirstOrThrow':
            return async () => {
              if (calls.lastResult === undefined || calls.lastResult === null) {
                throw new Error('not found');
              }
              return calls.lastResult;
            };
          default:
            return () => chain;
        }
      },
    },
  );
  return { db: chain, calls };
}

describe('ApiKeyRepo', () => {
  let repo: ApiKeyRepo;
  let dbMock: ReturnType<typeof makeDbMock>;

  beforeEach(() => {
    dbMock = makeDbMock();
    repo = new ApiKeyRepo(dbMock.db);
  });

  it('createApiKey inserts keyHash/keyPrefix and returns the row', async () => {
    const row = {
      id: 'k1',
      workspaceId: 'w1',
      creatorId: 'u1',
      name: 'ci',
      keyHash: 'h',
      keyPrefix: 'pre',
    };
    dbMock.calls.lastResult = row;

    const result = await repo.createApiKey('w1', 'u1', 'ci', 'h', 'pre', null);

    expect(result).toEqual(row);
  });

  it('findById returns the row when present', async () => {
    const row = { id: 'k1' };
    dbMock.calls.lastResult = row;

    const result = await repo.findById('k1', 'w1');

    expect(result).toEqual(row);
  });

  it('listApiKeys returns paginated keys with creator', async () => {
    dbMock.calls.lastResult = [
      { id: 'k1', creatorName: 'Wu', creatorAvatarUrl: null },
    ];

    const result = await repo.listApiKeys('w1', { limit: 20 } as any);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].creatorName).toBe('Wu');
    expect(result.meta).toBeDefined();
  });

  it('updateName returns the updated row', async () => {
    const row = { id: 'k1', name: 'new' };
    dbMock.calls.lastResult = row;

    const result = await repo.updateName('k1', 'w1', 'new');

    expect(result).toEqual(row);
  });

  it('revoke sets deletedAt and returns the row', async () => {
    const row = { id: 'k1', deletedAt: new Date() };
    dbMock.calls.lastResult = row;

    const result = await repo.revoke('k1', 'w1');

    expect(result).toEqual(row);
  });
});
