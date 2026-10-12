import { Test, TestingModule } from '@nestjs/testing';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './services/ai-chat.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

describe('AiChatController', () => {
  let controller: AiChatController;
  let service: any;

  const user = { id: 'u1' } as any;
  const workspace = { id: 'w1' } as any;

  beforeEach(async () => {
    service = {
      createChat: jest.fn().mockResolvedValue({ id: 'c1' }),
      listChats: jest.fn().mockResolvedValue({ items: [], meta: {} }),
      getChatInfo: jest.fn().mockResolvedValue({ chat: {}, messages: [] }),
      renameChat: jest.fn().mockResolvedValue(undefined),
      deleteChat: jest.fn().mockResolvedValue(undefined),
      searchChats: jest.fn().mockResolvedValue([]),
      sendMessage: jest.fn().mockImplementation(async (_input, emit) => {
        emit({ type: 'chat_created', chatId: 'c1' });
        emit({ type: 'content', text: 'Hi' });
        emit({ type: 'done', messageId: 'm1' });
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiChatController],
      providers: [{ provide: AiChatService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AiChatController>(AiChatController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('createChat returns a new chat', async () => {
    const result = await controller.createChat(user, workspace);
    expect(service.createChat).toHaveBeenCalledWith('w1', 'u1');
    expect(result).toEqual({ id: 'c1' });
  });

  it('listChats delegates to service', async () => {
    await controller.listChats({ limit: 20 } as any, user, workspace);
    expect(service.listChats).toHaveBeenCalled();
  });

  it('getChatInfo delegates to service', async () => {
    await controller.getChatInfo({ chatId: 'c1' } as any, user, workspace);
    expect(service.getChatInfo).toHaveBeenCalledWith('c1', 'w1', 'u1');
  });

  it('renameChat delegates to service', async () => {
    await controller.renameChat(
      { chatId: 'c1', title: 'T' } as any,
      user,
      workspace,
    );
    expect(service.renameChat).toHaveBeenCalledWith('c1', 'w1', 'u1', 'T');
  });

  it('deleteChat delegates to service', async () => {
    await controller.deleteChat({ chatId: 'c1' } as any, user, workspace);
    expect(service.deleteChat).toHaveBeenCalledWith('c1', 'w1', 'u1');
  });

  it('searchChats delegates to service', async () => {
    await controller.searchChats({ query: 'hi' } as any, user, workspace);
    expect(service.searchChats).toHaveBeenCalledWith('hi', 'w1', 'u1');
  });

  it('sendMessage streams SSE events to the response', async () => {
    const writes: string[] = [];
    const reply: any = {
      header: jest.fn(),
      raw: {
        write: (chunk: string) => writes.push(chunk),
        end: jest.fn(),
      },
    };

    await controller.sendMessage(
      { content: 'hello' } as any,
      user,
      workspace,
      reply,
    );

    expect(service.sendMessage).toHaveBeenCalled();
    expect(reply.raw.end).toHaveBeenCalled();
    expect(writes).toContain('data: {"type":"chat_created","chatId":"c1"}\n\n');
    expect(writes.some((w) => w.includes('"type":"content"'))).toBe(true);
    expect(writes.some((w) => w.includes('"type":"done"'))).toBe(true);
  });
});
