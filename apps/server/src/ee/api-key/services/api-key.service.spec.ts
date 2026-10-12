import { createHash } from 'crypto';
import { ApiKeyService } from './api-key.service';

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let repo: any;
  let tokenService: any;

  beforeEach(() => {
    repo = {
      createApiKey: jest.fn(),
      listApiKeys: jest.fn(),
      updateName: jest.fn(),
      revoke: jest.fn(),
      findById: jest.fn(),
    };
    tokenService = { generateApiToken: jest.fn() };
    service = new ApiKeyService(repo, tokenService);
  });

  it('createApiKey stores sha256 hash and returns plaintext token once', async () => {
    tokenService.generateApiToken.mockResolvedValue('docmost.tokenabc');
    repo.createApiKey.mockResolvedValue({
      id: 'k1',
      name: 'ci',
      creatorId: 'u1',
      workspaceId: 'w1',
      keyPrefix: 'docmost.tok',
      createdAt: new Date(),
      expiresAt: null,
      lastUsedAt: null,
      deletedAt: null,
    });

    const result = await service.createApiKey('w1', 'u1', 'ci');

    expect(result.token).toBe('docmost.tokenabc');
    const [ws, uid, name, keyHash, keyPrefix, expiresAt] =
      repo.createApiKey.mock.calls[0];
    expect(ws).toBe('w1');
    expect(uid).toBe('u1');
    expect(name).toBe('ci');
    expect(keyPrefix).toBe('docmost.toke');
    expect(expiresAt).toBeNull();
    expect(keyHash).toBe(
      createHash('sha256').update('docmost.tokenabc').digest('hex'),
    );
  });

  it('validateApiKey rejects revoked keys', async () => {
    repo.findById.mockResolvedValue({ id: 'k1', deletedAt: new Date() });

    await expect(
      service.validateApiKey({
        sub: 'u1',
        workspaceId: 'w1',
        apiKeyId: 'k1',
        type: 'api_key',
      }),
    ).rejects.toThrow();
  });

  it('validateApiKey rejects expired keys', async () => {
    repo.findById.mockResolvedValue({
      id: 'k1',
      deletedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(
      service.validateApiKey({
        sub: 'u1',
        workspaceId: 'w1',
        apiKeyId: 'k1',
        type: 'api_key',
      }),
    ).rejects.toThrow();
  });

  it('validateApiKey returns identity for a valid key', async () => {
    repo.findById.mockResolvedValue({ id: 'k1', deletedAt: null, expiresAt: null });

    const result = await service.validateApiKey({
      sub: 'u1',
      workspaceId: 'w1',
      apiKeyId: 'k1',
      type: 'api_key',
    });

    expect(result.user.id).toBe('u1');
    expect(result.workspace.id).toBe('w1');
    expect(result.authType).toBe('api_key');
  });

  it('listApiKeys maps creator info and omits token', async () => {
    repo.listApiKeys.mockResolvedValue({
      items: [
        {
          id: 'k1',
          name: 'ci',
          creatorId: 'u1',
          workspaceId: 'w1',
          keyPrefix: 'pre',
          createdAt: new Date(),
          expiresAt: null,
          lastUsedAt: null,
          deletedAt: null,
          creatorName: 'Wu',
          creatorAvatarUrl: null,
        },
      ],
      meta: { hasNextPage: false },
    });

    const result = await service.listApiKeys('w1', { limit: 20 } as any);

    expect(result.items[0].creator.name).toBe('Wu');
    expect(result.items[0].token).toBeUndefined();
  });
});
