import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyService } from './services/api-key.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import WorkspaceAbilityFactory from '../../core/casl/abilities/workspace-ability.factory';
import { UserRole } from '../../common/helpers/types/permission';

describe('ApiKeyController', () => {
  let controller: ApiKeyController;
  let service: any;

  beforeEach(async () => {
    service = {
      listApiKeys: jest.fn(),
      createApiKey: jest.fn(),
      updateApiKey: jest.fn(),
      revokeApiKey: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiKeyController],
      providers: [
        { provide: ApiKeyService, useValue: service },
        WorkspaceAbilityFactory,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(ApiKeyController);
  });

  it('createApiKey is forbidden for non-admin members', async () => {
    const user = { id: 'u1', role: UserRole.MEMBER } as any;
    const workspace = { id: 'w1' } as any;

    let threw = false;
    try {
      await controller.createApiKey({ name: 'x' }, user, workspace);
    } catch (e) {
      threw = true;
      expect(e).toBeInstanceOf(Error);
    }
    expect(threw).toBe(true);
  });

  it('createApiKey is allowed for workspace owners', async () => {
    service.createApiKey.mockResolvedValue({ id: 'k1', token: 't' });
    const user = { id: 'u1', role: UserRole.OWNER } as any;
    const workspace = { id: 'w1' } as any;

    const result = await controller.createApiKey({ name: 'x' }, user, workspace);

    expect(result.token).toBe('t');
  });

  it('revokeApiKey is allowed for admins', async () => {
    service.revokeApiKey.mockResolvedValue({ id: 'k1' });
    const user = { id: 'u1', role: UserRole.ADMIN } as any;
    const workspace = { id: 'w1' } as any;

    const result = await controller.revokeApiKey({ apiKeyId: 'k1' }, user, workspace);

    expect(result.id).toBe('k1');
  });
});
