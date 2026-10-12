import { AiChatService } from './ai-chat.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

function asyncGenerator<T>(items: T[]): AsyncGenerator<T> {
  return (async function* () {
    for (const item of items) yield item;
  })();
}

describe('AiChatService', () => {
  let service: AiChatService;
  let repo: any;
  let llm: any;

  beforeEach(() => {
    repo = {
      createChat: jest.fn(),
      findById: jest.fn(),
      listChats: jest.fn(),
      getChatMessages: jest.fn(),
      insertMessage: jest.fn(),
      updateChatTitle: jest.fn(),
      softDeleteChat: jest.fn(),
      searchChats: jest.fn(),
    };
    llm = { streamChat: jest.fn() };
    service = new AiChatService(repo, llm);
  });

  it('createChat delegates to repo', async () => {
    repo.createChat.mockResolvedValue({ id: 'c1' });
    const result = await service.createChat('w1', 'u1');
    expect(repo.createChat).toHaveBeenCalledWith('w1', 'u1');
    expect(result).toEqual({ id: 'c1' });
  });

  it('getChatInfo throws NotFound when chat missing', async () => {
    repo.findById.mockResolvedValue(undefined);
    await expect(service.getChatInfo('cX', 'w1', 'u1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('getChatInfo throws Forbidden for another user', async () => {
    repo.findById.mockResolvedValue({ id: 'c1', creatorId: 'other' });
    await expect(service.getChatInfo('c1', 'w1', 'u1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('getChatInfo returns chat and messages for owner', async () => {
    repo.findById.mockResolvedValue({ id: 'c1', creatorId: 'u1' });
    repo.getChatMessages.mockResolvedValue([{ id: 'm1' }]);
    const result = await service.getChatInfo('c1', 'w1', 'u1');
    expect(result).toEqual({ chat: { id: 'c1', creatorId: 'u1' }, messages: [{ id: 'm1' }] });
  });

  it('deleteChat throws NotFound when missing', async () => {
    repo.findById.mockResolvedValue(undefined);
    await expect(service.deleteChat('cX', 'w1', 'u1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('renameChat updates title for owner', async () => {
    repo.findById.mockResolvedValue({ id: 'c1', creatorId: 'u1' });
    repo.updateChatTitle.mockResolvedValue(undefined);
    await service.renameChat('c1', 'w1', 'u1', 'My chat');
    expect(repo.updateChatTitle).toHaveBeenCalledWith('c1', 'My chat');
  });

  it('searchChats delegates to repo', async () => {
    repo.searchChats.mockResolvedValue([{ id: 'c1' }]);
    const result = await service.searchChats('hi', 'w1', 'u1');
    expect(repo.searchChats).toHaveBeenCalledWith('hi', 'w1', 'u1');
    expect(result).toHaveLength(1);
  });

  it('sendMessage creates chat, streams, persists and emits done', async () => {
    repo.createChat.mockResolvedValue({ id: 'c1', creatorId: 'u1' });
    repo.updateChatTitle.mockResolvedValue(undefined);
    repo.insertMessage
      .mockResolvedValueOnce({ id: 'm-user' })
      .mockResolvedValueOnce({ id: 'm-asst' });
    repo.getChatMessages.mockResolvedValue([]);
    llm.streamChat.mockReturnValue(asyncGenerator([{ type: 'content', text: 'Hi' }]));

    const events: any[] = [];
    await service.sendMessage(
      { workspaceId: 'w1', userId: 'u1', content: 'hello' },
      (e) => events.push(e),
    );

    expect(repo.createChat).toHaveBeenCalled();
    expect(repo.insertMessage).toHaveBeenCalledTimes(2);
    expect(llm.streamChat).toHaveBeenCalled();
    expect(events.map((e) => e.type)).toEqual(['chat_created', 'content', 'done']);
    expect(events[0].chatId).toBe('c1');
    expect(events[1].text).toBe('Hi');
    expect(events[2].messageId).toBe('m-asst');
  });

  it('sendMessage emits error and returns when chat missing', async () => {
    repo.findById.mockResolvedValue(undefined);

    const events: any[] = [];
    await service.sendMessage(
      { chatId: 'cX', workspaceId: 'w1', userId: 'u1', content: 'hi' },
      (e) => events.push(e),
    );

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('error');
  });

  it('sendMessage emits error when the model fails', async () => {
    repo.createChat.mockResolvedValue({ id: 'c1', creatorId: 'u1' });
    repo.updateChatTitle.mockResolvedValue(undefined);
    repo.insertMessage.mockResolvedValue({ id: 'm-user' });
    repo.getChatMessages.mockResolvedValue([]);
    llm.streamChat.mockReturnValue(
      asyncGenerator([{ type: 'error', message: 'boom' }]),
    );

    const events: any[] = [];
    await service.sendMessage(
      { workspaceId: 'w1', userId: 'u1', content: 'hello' },
      (e) => events.push(e),
    );

    expect(events.map((e) => e.type)).toEqual(['chat_created', 'error']);
  });
});
