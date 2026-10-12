import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './services/audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserRole } from '../../common/helpers/types/permission';

describe('AuditController', () => {
  let controller: AuditController;
  let service: any;

  beforeEach(async () => {
    service = {
      listAuditLogs: jest.fn().mockResolvedValue({ items: [], meta: {} }),
      getRetention: jest.fn().mockResolvedValue(365),
      updateRetention: jest.fn().mockResolvedValue(undefined),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [{ provide: AuditService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AuditController);
  });

  const owner = { id: 'u1', role: UserRole.OWNER } as any;
  const admin = { id: 'u1', role: UserRole.ADMIN } as any;

  it('listAuditLogs is forbidden for non-owners', async () => {
    let threw = false;
    try {
      await controller.listAuditLogs({}, admin, { id: 'w1' });
    } catch (e) {
      threw = true;
      expect(e).toBeInstanceOf(ForbiddenException);
    }
    expect(threw).toBe(true);
  });

  it('listAuditLogs is allowed for owners', async () => {
    service.listAuditLogs.mockResolvedValue({
      items: [{ id: 'a1' }],
      meta: { nextCursor: null },
    });
    const result = await controller.listAuditLogs({ limit: 50 }, owner, {
      id: 'w1',
    });
    expect(result.items).toHaveLength(1);
  });

  it('getRetention returns retentionDays', async () => {
    service.getRetention.mockResolvedValue(180);
    const result = await controller.getRetention(owner, { id: 'w1' });
    expect(result.retentionDays).toBe(180);
  });

  it('updateRetention updates and returns retentionDays', async () => {
    const result = await controller.updateRetention(
      { auditRetentionDays: 120 },
      owner,
      { id: 'w1' },
    );
    expect(result.retentionDays).toBe(120);
    expect(service.updateRetention).toHaveBeenCalledWith('w1', 120);
  });
});
