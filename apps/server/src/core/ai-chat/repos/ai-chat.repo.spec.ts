import { AiChatRepo } from './ai-chat.repo';

/**
 * Lightweight chainable Kysely mock. Records the last result returned by any
 * `execute*` call so individual tests can assert behavior without a real DB.
 */
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
          case 'onConflict':
            return () => ({
              doUpdateSet: () => chain,
              doNothing: () => chain,
            });
          default:
            return () => chain;
        }
      },
    },
  );
  return { db: chain, calls };
}

describe('AiChatRepo', () => {
  let repo: AiChatRepo;
  let dbMock: ReturnType<typeof makeDbMock>;

  beforeEach(() => {
    dbMock = makeDbMock();
    repo = new AiChatRepo(dbMock.db);
  });

  it('createChat returns the inserted chat row', async () => {
    const chat = { id: 'c1', workspaceId: 'w1', creatorId: 'u1' };
    dbMock.calls.lastResult = chat;

    const result = await repo.createChat('w1', 'u1');

    expect(result).toEqual(chat);
  });

  it('findById returns the chat row when present', async () => {
    const chat = { id: 'c1', workspaceId: 'w1', creatorId: 'u1' };
    dbMock.calls.lastResult = chat;

    const result = await repo.findById('c1', 'w1');

    expect(result).toEqual(chat);
  });

  it('listChats returns the pagination result', async () => {
    dbMock.calls.lastResult = [{ id: 'c1', title: 'hello' }];

    const result = await repo.listChats('w1', 'u1', {
      limit: 20,
    } as any);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('c1');
    expect(result.meta).toBeDefined();
  });

  it('getChatMessages returns ordered messages', async () => {
    const messages = [
      { id: 'm1', role: 'user' },
      { id: 'm2', role: 'assistant' },
    ];
    dbMock.calls.lastResult = messages;

    const result = await repo.getChatMessages('c1', 'w1');

    expect(result).toHaveLength(2);
  });

  it('insertMessage returns the persisted message', async () => {
    const message = { id: 'm1', chatId: 'c1', role: 'user' };
    dbMock.calls.lastResult = message;

    const result = await repo.insertMessage({
      chatId: 'c1',
      workspaceId: 'w1',
      userId: 'u1',
      role: 'user',
      content: 'hi',
    } as any);

    expect(result).toEqual(message);
  });

  it('searchChats returns matching chats', async () => {
    const chats = [{ id: 'c1', title: 'hello' }];
    dbMock.calls.lastResult = chats;

    const result = await repo.searchChats('hello', 'w1', 'u1');

    expect(result).toHaveLength(1);
    expect((result[0] as any).title).toBe('hello');
  });
});
