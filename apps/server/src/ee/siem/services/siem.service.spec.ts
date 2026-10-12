import { SiemService } from './siem.service';
import { SiemRepo } from '../repos/siem.repo';
import { EncryptionService } from '../../../integrations/encryption/encryption.service';
import { OutboundAgentFactory } from '../../../integrations/outbound/outbound-agent.factory';
import { request } from 'undici';
import { BadRequestException, NotFoundException } from '@nestjs/common';

jest.mock('undici', () => ({ request: jest.fn() }));

const mockRequest = request as unknown as jest.Mock;

function makeRepo() {
  return {
    listByWorkspace: jest.fn(),
    findById: jest.fn(),
    findEnabledByWorkspace: jest.fn(),
    create: jest.fn().mockResolvedValue({ id: 'd1' }),
    update: jest.fn().mockResolvedValue({ id: 'd1', version: 6 }),
    remove: jest.fn().mockResolvedValue(undefined),
    markDelivered: jest.fn().mockResolvedValue(undefined),
    markFailed: jest.fn().mockResolvedValue(undefined),
    resetForRetry: jest.fn().mockResolvedValue(undefined),
  } as any;
}

const encryption = {
  encrypt: (s: string) => 'ENC:' + s,
  decrypt: (s: string) => (s.startsWith('ENC:') ? s.slice(4) : '{}'),
} as unknown as EncryptionService;

const outbound = {
  lease: jest.fn().mockResolvedValue({ dispatcher: {}, release: jest.fn() }),
} as unknown as OutboundAgentFactory;

const queue = { add: jest.fn().mockResolvedValue(undefined) } as any;

describe('SiemService', () => {
  let service: SiemService;
  let repo: any;

  beforeEach(() => {
    repo = makeRepo();
    service = new SiemService(repo, encryption, outbound, queue);
    mockRequest.mockReset();
  });

  it('list maps row to DTO and derives hasSecrets', async () => {
    repo.listByWorkspace.mockResolvedValue([
      {
        id: 'd1',
        name: 'dest',
        type: 'http',
        enabled: true,
        status: 'healthy',
        config: { url: 'x' },
        secrets: 'ENC:{"authHeaderValue":"t"}',
        consecutiveFailures: 0,
        cursorCreatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const result = await service.list('w1');
    expect(result[0].hasSecrets).toEqual({ authHeaderValue: true });
    expect(result[0].type).toBe('http');
  });

  it('create enforces the per-workspace destination limit', async () => {
    repo.listByWorkspace.mockResolvedValue([{}, {}]);
    await expect(
      service.create('w1', 'u1', { name: 'x', type: 'http', config: {} } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('create encrypts secrets before persisting', async () => {
    repo.listByWorkspace.mockResolvedValue([]);
    await service.create('w1', 'u1', {
      name: 'x',
      type: 'http',
      config: { url: 'u' },
      secrets: { authHeaderValue: 'top' },
    } as any);
    const data = repo.create.mock.calls[0][0];
    expect(data.secrets).toBe('ENC:{"authHeaderValue":"top"}');
  });

  it('update uses optimistic-lock version from fetched row', async () => {
    repo.findById.mockResolvedValue({ id: 'd1', version: 5 });
    await service.update('w1', { destinationId: 'd1', name: 'new' } as any);
    expect(repo.update).toHaveBeenCalledWith('d1', 'w1', expect.anything(), 5);
  });

  it('update throws NotFound when missing', async () => {
    repo.findById.mockResolvedValue(undefined);
    await expect(
      service.update('w1', { destinationId: 'd1' } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('test returns delivered=true on 2xx', async () => {
    mockRequest.mockResolvedValue({ statusCode: 200, body: { text: async () => '' } });
    const res = await service.test('w1', {
      type: 'http',
      config: { url: 'https://x', authHeaderName: 'A', authHeaderPrefix: 'Bearer', format: 'json' },
      secrets: { authHeaderValue: 't' },
    } as any);
    expect(res.delivered).toBe(true);
    expect(res.statusCode).toBe(200);
  });

  it('test returns error when request rejects', async () => {
    mockRequest.mockRejectedValue(new Error('conn refused'));
    const res = await service.test('w1', {
      type: 'http',
      config: { url: 'https://x' },
    } as any);
    expect(res.delivered).toBe(false);
    expect(res.error).toContain('conn refused');
  });

  it('retry resets destination counters', async () => {
    repo.findById.mockResolvedValue({ id: 'd1' });
    await service.retry('w1', 'd1');
    expect(repo.resetForRetry).toHaveBeenCalledWith('d1');
  });

  it('deliverAuditLog marks delivered on success', async () => {
    repo.findEnabledByWorkspace.mockResolvedValue([
      {
        id: 'd1',
        type: 'http',
        config: { url: 'https://x', authHeaderName: 'A', authHeaderPrefix: 'Bearer', format: 'json' },
        secrets: 'ENC:{"authHeaderValue":"t"}',
      },
    ]);
    mockRequest.mockResolvedValue({ statusCode: 202, body: { text: async () => '' } });
    await service.deliverAuditLog('w1', {
      id: 'e1',
      workspaceId: 'w1',
      actorId: null,
      actorType: 'user',
      event: 'x',
      resourceType: 'y',
      resourceId: null,
      spaceId: null,
      changes: null,
      metadata: null,
      ipAddress: null,
      userAgent: null,
      createdAt: new Date().toISOString(),
    });
    expect(repo.markDelivered).toHaveBeenCalledWith('d1', expect.any(Date), expect.any(Date), 'e1', expect.any(String));
    expect(repo.markFailed).not.toHaveBeenCalled();
  });

  it('deliverAuditLog marks failed on delivery error', async () => {
    repo.findEnabledByWorkspace.mockResolvedValue([
      { id: 'd1', type: 'http', config: { url: 'https://x' }, secrets: 'ENC:{}' },
    ]);
    mockRequest.mockRejectedValue(new Error('boom'));
    await service.deliverAuditLog('w1', {
      id: 'e1',
      workspaceId: 'w1',
      actorId: null,
      actorType: 'user',
      event: 'x',
      resourceType: 'y',
      resourceId: null,
      spaceId: null,
      changes: null,
      metadata: null,
      ipAddress: null,
      userAgent: null,
      createdAt: new Date().toISOString(),
    });
    expect(repo.markFailed).toHaveBeenCalled();
  });
});
