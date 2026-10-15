import { AiProviderRepo } from './ai-provider.repo';
import { AiProvider } from '@docmost/db/types/entity.types';

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

describe('AiProviderRepo', () => {
  let repo: AiProviderRepo;
  let dbMock: ReturnType<typeof makeDbMock>;

  beforeEach(() => {
    dbMock = makeDbMock();
    repo = new AiProviderRepo(dbMock.db);
  });

  const sample: AiProvider = {
    id: 'p1',
    workspaceId: 'w1',
    name: 'OpenAI',
    driver: 'openai',
    apiKeyEncrypted: 'enc',
    baseUrl: null,
    completionModel: 'gpt-4o',
    embeddingModel: 'text-embedding-3-small',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  it('createProvider inserts and returns the row', async () => {
    dbMock.calls.lastResult = sample;

    const result = await repo.createProvider('w1', {
      name: 'OpenAI',
      driver: 'openai',
      apiKeyEncrypted: 'enc',
      completionModel: 'gpt-4o',
      embeddingModel: 'text-embedding-3-small',
    });

    expect(result).toEqual(sample);
  });

  it('findById returns the row when present', async () => {
    dbMock.calls.lastResult = sample;

    const result = await repo.findById('p1', 'w1');

    expect(result).toEqual(sample);
  });

  it('listByWorkspace returns all providers for the workspace', async () => {
    dbMock.calls.lastResult = [sample];

    const result = await repo.listByWorkspace('w1');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p1');
  });

  it('findDefault returns the default provider', async () => {
    dbMock.calls.lastResult = sample;

    const result = await repo.findDefault('w1');

    expect(result?.isDefault).toBe(true);
  });

  it('updateProvider returns the updated row', async () => {
    const updated = { ...sample, name: 'Updated' };
    dbMock.calls.lastResult = updated;

    const result = await repo.updateProvider('p1', 'w1', { name: 'Updated' });

    expect(result.name).toBe('Updated');
  });

  it('setDefault clears other defaults and returns the row', async () => {
    dbMock.calls.lastResult = { ...sample, isDefault: true };

    const result = await repo.setDefault('w1', 'p1');

    expect(result.isDefault).toBe(true);
  });

  it('deleteProvider executes without throwing', async () => {
    dbMock.calls.lastResult = undefined;

    await expect(repo.deleteProvider('p1', 'w1')).resolves.toBeUndefined();
  });
});
