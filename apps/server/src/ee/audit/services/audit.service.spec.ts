import { AuditService } from './audit.service';
import { AuditRepo } from '../repos/audit.repo';
import { ClsService } from 'nestjs-cls';
import {
  AUDIT_CONTEXT_KEY,
  AuditContext,
} from '../../../common/middlewares/audit-context.middleware';

describe('AuditService', () => {
  let service: AuditService;
  let repo: any;
  let cls: any;
  let siemQueue: any;

  const ctx: AuditContext = {
    workspaceId: 'w1',
    actorId: 'u1',
    actorType: 'user',
    ipAddress: '1.2.3.4',
    userAgent: 'ua',
  };

  beforeEach(() => {
    repo = {
      insertAuditLog: jest.fn().mockResolvedValue({ id: 'a1' }),
      insertAuditLogs: jest.fn().mockResolvedValue(undefined),
      updateRetention: jest.fn().mockResolvedValue(undefined),
      getRetention: jest.fn().mockResolvedValue(365),
      listAuditLogs: jest.fn().mockResolvedValue({
        items: [],
        meta: { nextCursor: null },
      }),
    };
    cls = { get: jest.fn(), set: jest.fn() };
    siemQueue = { add: jest.fn().mockResolvedValue(undefined) };
    service = new AuditService(repo, cls, siemQueue);
  });

  it('log persists a row using the CLS audit context', async () => {
    cls.get.mockReturnValue(ctx);

    await service.log({
      event: 'user.login',
      resourceType: 'user',
      resourceId: 'u1',
    } as any);

    expect(repo.insertAuditLog).toHaveBeenCalledTimes(1);
    const arg = repo.insertAuditLog.mock.calls[0][0] as any;
    expect(arg.workspaceId).toBe('w1');
    expect(arg.actorId).toBe('u1');
    expect(arg.ipAddress).toBe('1.2.3.4');
    expect(arg.actorType).toBe('user');
    expect(siemQueue.add).toHaveBeenCalledWith(
      'siem-deliver',
      expect.objectContaining({ workspaceId: 'w1' }),
    );
  });

  it('log skips when no workspaceId is present in context', async () => {
    cls.get.mockReturnValue({
      workspaceId: null,
      actorId: null,
      actorType: 'user',
      ipAddress: null,
      userAgent: null,
    });

    await service.log({ event: 'x', resourceType: 'y' } as any);

    expect(repo.insertAuditLog).not.toHaveBeenCalled();
  });

  it('logBatchWithContext persists every payload with context', async () => {
    cls.get.mockReturnValue(ctx);

    await service.logBatchWithContext(
      [
        { event: 'user.login', resourceType: 'page' },
        { event: 'user.logout', resourceType: 'space' },
      ] as any,
      ctx,
    );

    expect(repo.insertAuditLogs).toHaveBeenCalledTimes(1);
    expect(repo.insertAuditLogs.mock.calls[0][0]).toHaveLength(2);
  });

  it('updateRetention delegates to repo', async () => {
    await service.updateRetention('w1', 90);
    expect(repo.updateRetention).toHaveBeenCalledWith('w1', 90);
  });

  it('listAuditLogs maps rows to the API response shape', async () => {
    repo.listAuditLogs.mockResolvedValue({
      items: [
        {
          id: 'a1',
          workspaceId: 'w1',
          actorId: 'u1',
          actorType: 'user',
          event: 'user.login',
          resourceType: 'user',
          resourceId: 'u1',
          actorName: 'Wu',
          actorEmail: 'w@x.com',
          actorAvatarUrl: null,
          createdAt: new Date(),
          changes: null,
          metadata: null,
        } as any,
      ],
      meta: { nextCursor: null },
    });

    const result = await service.listAuditLogs('w1', { limit: 50 });
    expect(result.items[0].actor).toEqual({
      id: 'u1',
      name: 'Wu',
      email: 'w@x.com',
      avatarUrl: undefined,
    });
  });
});
