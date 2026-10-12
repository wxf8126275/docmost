import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { SiemController } from './siem.controller';
import { SiemService } from './services/siem.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserRole } from '../../common/helpers/types/permission';

describe('SiemController', () => {
  let controller: SiemController;
  let service: any;

  beforeEach(async () => {
    service = {
      list: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'd1' }),
      update: jest.fn().mockResolvedValue({ id: 'd1' }),
      remove: jest.fn().mockResolvedValue(undefined),
      test: jest.fn().mockResolvedValue({ delivered: true }),
      retry: jest.fn().mockResolvedValue(undefined),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SiemController],
      providers: [{ provide: SiemService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(SiemController);
  });

  const owner = { id: 'u1', role: UserRole.OWNER } as any;
  const admin = { id: 'u1', role: UserRole.ADMIN } as any;

  it('non-owners are forbidden on every endpoint', async () => {
    await expect(controller.list(admin, { id: 'w1' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      controller.create(admin, { id: 'w1' }, { name: 'x', type: 'http', config: {} } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('list routes to service for owners', async () => {
    await controller.list(owner, { id: 'w1' });
    expect(service.list).toHaveBeenCalledWith('w1');
  });

  it('create / update / delete / test / retry route to service', async () => {
    await controller.create(owner, { id: 'w1' }, { name: 'x', type: 'http', config: {} } as any);
    expect(service.create).toHaveBeenCalledWith('w1', 'u1', expect.anything());

    await controller.update(owner, { id: 'w1' }, { destinationId: 'd1' } as any);
    expect(service.update).toHaveBeenCalledWith('w1', { destinationId: 'd1' });

    await controller.delete(owner, { id: 'w1' }, { destinationId: 'd1' });
    expect(service.remove).toHaveBeenCalledWith('w1', 'd1');

    await controller.test(owner, { id: 'w1' }, { type: 'http', config: {} } as any);
    expect(service.test).toHaveBeenCalledWith('w1', expect.anything());

    await controller.retry(owner, { id: 'w1' }, { destinationId: 'd1' });
    expect(service.retry).toHaveBeenCalledWith('w1', 'd1');
  });
});
