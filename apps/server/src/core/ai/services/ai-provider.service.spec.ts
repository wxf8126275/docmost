import { AiProviderService } from './ai-provider.service';
import {
  CreateAiProviderDto,
  UpdateAiProviderDto,
} from '../dto/ai-provider.dto';

function makeMocks() {
  const repo = {
    createProvider: jest.fn(),
    updateProvider: jest.fn(),
    findById: jest.fn(),
    listByWorkspace: jest.fn(),
    findDefault: jest.fn(),
    deleteProvider: jest.fn(),
    setDefault: jest.fn(),
  };
  const encryptionService = {
    encrypt: jest.fn((plain: string) => `enc:${plain}`),
    decrypt: jest.fn((cipher: string) => cipher.replace('enc:', '')),
  };
  const environmentService = {
    getAiDriver: jest.fn(() => 'openai'),
    getOpenAiApiKey: jest.fn(() => 'env-key'),
    getOpenAiApiUrl: jest.fn(() => undefined),
    getAiChatModel: jest.fn(() => 'gpt-4o-mini'),
    getAiEmbeddingModel: jest.fn(() => 'text-embedding-3-small'),
  };
  return { repo, encryptionService, environmentService };
}

describe('AiProviderService', () => {
  let service: AiProviderService;
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
    service = new AiProviderService(
      mocks.repo as any,
      mocks.encryptionService as any,
      mocks.environmentService as any,
    );
  });

  it('createProvider encrypts the api key and stores the row', async () => {
    const created = {
      id: 'p1',
      workspaceId: 'w1',
      name: 'OpenAI',
      driver: 'openai',
      apiKeyEncrypted: 'enc:secret',
      baseUrl: null,
      completionModel: 'gpt-4o',
      embeddingModel: 'text-embedding-3-small',
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    mocks.repo.createProvider.mockResolvedValue(created);

    const dto: CreateAiProviderDto = {
      name: 'OpenAI',
      driver: 'openai',
      apiKey: 'secret',
      completionModel: 'gpt-4o',
      embeddingModel: 'text-embedding-3-small',
      isDefault: false,
    };

    await service.createProvider('w1', dto);

    expect(mocks.encryptionService.encrypt).toHaveBeenCalledWith('secret');
    expect(mocks.repo.createProvider).toHaveBeenCalledWith(
      'w1',
      expect.objectContaining({ apiKeyEncrypted: 'enc:secret', name: 'OpenAI' }),
    );
  });

  it('createProvider sets the default when isDefault is true', async () => {
    mocks.repo.createProvider.mockResolvedValue({ id: 'p1' });
    mocks.repo.setDefault.mockResolvedValue({ id: 'p1', isDefault: true });

    const dto: CreateAiProviderDto = {
      name: 'OpenAI',
      driver: 'openai',
      apiKey: 'secret',
      completionModel: 'gpt-4o',
      isDefault: true,
    };

    await service.createProvider('w1', dto);

    expect(mocks.repo.setDefault).toHaveBeenCalledWith('w1', 'p1');
  });

  it('createProvider response never contains the plaintext api key', async () => {
    mocks.repo.createProvider.mockResolvedValue({
      id: 'p1',
      apiKeyEncrypted: 'enc:secret',
      name: 'OpenAI',
      driver: 'openai',
      baseUrl: null,
      completionModel: 'gpt-4o',
      embeddingModel: null,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    const dto: CreateAiProviderDto = {
      name: 'OpenAI',
      driver: 'openai',
      apiKey: 'secret',
      completionModel: 'gpt-4o',
    };

    const result = await service.createProvider('w1', dto);

    expect((result as any).apiKey).toBeUndefined();
    expect(result.hasApiKey).toBe(true);
  });

  it('updateProvider re-encrypts the api key when provided', async () => {
    mocks.repo.updateProvider.mockResolvedValue({ id: 'p1' });

    const dto: UpdateAiProviderDto = { apiKey: 'new-secret' };
    await service.updateProvider('w1', 'p1', dto);

    expect(mocks.encryptionService.encrypt).toHaveBeenCalledWith('new-secret');
    expect(mocks.repo.updateProvider).toHaveBeenCalledWith(
      'p1',
      'w1',
      expect.objectContaining({ apiKeyEncrypted: 'enc:new-secret' }),
    );
  });

  it('updateProvider does not overwrite the api key when omitted', async () => {
    mocks.repo.updateProvider.mockResolvedValue({ id: 'p1' });

    const dto: UpdateAiProviderDto = { name: 'Renamed' };
    await service.updateProvider('w1', 'p1', dto);

    const patch = mocks.repo.updateProvider.mock.calls[0][2];
    expect(patch).not.toHaveProperty('apiKeyEncrypted');
    expect(patch.name).toBe('Renamed');
  });

  it('updateProvider sets the default when isDefault is true', async () => {
    mocks.repo.updateProvider.mockResolvedValue({ id: 'p1' });
    mocks.repo.setDefault.mockResolvedValue({ id: 'p1', isDefault: true });

    const dto: UpdateAiProviderDto = { isDefault: true };
    await service.updateProvider('w1', 'p1', dto);

    expect(mocks.repo.setDefault).toHaveBeenCalledWith('w1', 'p1');
  });

  it('listProviders maps rows without exposing the plaintext key', async () => {
    mocks.repo.listByWorkspace.mockResolvedValue([
      {
        id: 'p1',
        apiKeyEncrypted: 'enc:secret',
        name: 'OpenAI',
        driver: 'openai',
        baseUrl: null,
        completionModel: 'gpt-4o',
        embeddingModel: null,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ]);

    const result = await service.listProviders('w1');

    expect(result).toHaveLength(1);
    expect((result[0] as any).apiKey).toBeUndefined();
    expect((result[0] as any).apiKeyEncrypted).toBeUndefined();
    expect(result[0].hasApiKey).toBe(true);
    expect(result[0].isDefault).toBe(true);
  });

  it('getActiveProviderConfig returns the decrypted default provider config', async () => {
    mocks.repo.findDefault.mockResolvedValue({
      driver: 'openai-compatible',
      apiKeyEncrypted: 'enc:topsecret',
      baseUrl: 'https://example.com/v1',
      completionModel: 'my-model',
      embeddingModel: 'my-embed',
    });

    const config = await service.getActiveProviderConfig('w1');

    expect(mocks.encryptionService.decrypt).toHaveBeenCalledWith('enc:topsecret');
    expect(config).toEqual({
      driver: 'openai-compatible',
      apiKey: 'topsecret',
      baseUrl: 'https://example.com/v1',
      completionModel: 'my-model',
      embeddingModel: 'my-embed',
    });
  });

  it('getActiveProviderConfig falls back to environment variables when no default', async () => {
    mocks.repo.findDefault.mockResolvedValue(undefined);

    const config = await service.getActiveProviderConfig('w1');

    expect(config).toEqual({
      driver: 'openai',
      apiKey: 'env-key',
      baseUrl: undefined,
      completionModel: 'gpt-4o-mini',
      embeddingModel: 'text-embedding-3-small',
    });
  });

  it('deleteProvider delegates to the repo', async () => {
    mocks.repo.deleteProvider.mockResolvedValue(undefined);

    await service.deleteProvider('w1', 'p1');

    expect(mocks.repo.deleteProvider).toHaveBeenCalledWith('p1', 'w1');
  });
});
