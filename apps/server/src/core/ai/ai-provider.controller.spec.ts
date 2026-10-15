import { AiProviderController } from './ai-provider.controller';
import { ForbiddenException } from '@nestjs/common';
import { AiProviderService } from './services/ai-provider.service';
import { CreateAiProviderDto } from './dto/ai-provider.dto';

function makeMocks() {
  const service = {
    listProviders: jest.fn(),
    createProvider: jest.fn(),
    updateProvider: jest.fn(),
    deleteProvider: jest.fn(),
  };
  const ability = { cannot: jest.fn() };
  const workspaceAbility = {
    createForUser: jest.fn(() => ability),
  };
  return { service, ability, workspaceAbility };
}

describe('AiProviderController', () => {
  let controller: AiProviderController;
  let mocks: ReturnType<typeof makeMocks>;

  const user = { id: 'u1', role: 'admin' } as any;
  const workspace = { id: 'w1' } as any;

  beforeEach(() => {
    mocks = makeMocks();
    controller = new AiProviderController(
      mocks.service as any,
      mocks.workspaceAbility as any,
    );
    mocks.ability.cannot.mockReturnValue(false);
  });

  it('list allows admins and returns providers without plaintext key', async () => {
    mocks.service.listProviders.mockResolvedValue([
      { id: 'p1', name: 'OpenAI', hasApiKey: true, isDefault: false },
    ]);

    const result = await controller.listProviders(user, workspace);

    expect(mocks.service.listProviders).toHaveBeenCalledWith('w1');
    expect((result[0] as any).apiKey).toBeUndefined();
  });

  it('create delegates to the service', async () => {
    const dto: CreateAiProviderDto = {
      name: 'OpenAI',
      driver: 'openai',
      apiKey: 'secret',
      completionModel: 'gpt-4o',
    };
    mocks.service.createProvider.mockResolvedValue({ id: 'p1', hasApiKey: true });

    const result = await controller.createProvider(dto, user, workspace);

    expect(mocks.service.createProvider).toHaveBeenCalledWith('w1', dto);
    expect((result as any).apiKey).toBeUndefined();
  });

  it('update delegates to the service with the id', async () => {
    mocks.service.updateProvider.mockResolvedValue({ id: 'p1' });

    await controller.updateProvider(
      { id: 'p1', name: 'Renamed' },
      user,
      workspace,
    );

    expect(mocks.service.updateProvider).toHaveBeenCalledWith('w1', 'p1', {
      name: 'Renamed',
    });
  });

  it('delete delegates to the service', async () => {
    mocks.service.deleteProvider.mockResolvedValue(undefined);

    await controller.deleteProvider({ id: 'p1' }, user, workspace);

    expect(mocks.service.deleteProvider).toHaveBeenCalledWith('w1', 'p1');
  });

  it('setDefault delegates to updateProvider with isDefault true', async () => {
    mocks.service.updateProvider.mockResolvedValue({ id: 'p1', isDefault: true });

    await controller.setDefault({ id: 'p1' }, user, workspace);

    expect(mocks.service.updateProvider).toHaveBeenCalledWith('w1', 'p1', {
      isDefault: true,
    });
  });

  it('rejects non-admins with ForbiddenException', async () => {
    mocks.ability.cannot.mockReturnValue(true);

    await expect(
      controller.listProviders(user, workspace),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(mocks.service.listProviders).not.toHaveBeenCalled();
  });
});
