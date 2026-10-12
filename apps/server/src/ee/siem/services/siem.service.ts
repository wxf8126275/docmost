import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { request } from 'undici';
import { QueueName, QueueJob } from '../../../integrations/queue/constants/queue.constants';
import {
  SiemDestination,
  InsertableSiemDestination,
  UpdatableSiemDestination,
} from '@docmost/db/types/entity.types';
import { EncryptionService } from '../../../integrations/encryption/encryption.service';
import { OutboundAgentFactory } from '../../../integrations/outbound/outbound-agent.factory';
import {
  ISiemConfig,
  ISiemDestination,
  ISiemDestinationInput,
  ISiemTestResult,
  ITestSiemDestinationInput,
  IUpdateSiemDestinationInput,
  SiemAuditEvent,
  SiemDestinationStatus,
  SiemDestinationType,
} from '../types/siem.types';
import { buildDeliverRequest, DeliverRequest } from '../lib/siem.formatter';
import { SiemRepo } from '../repos/siem.repo';

export const SIEM_MAX_DESTINATIONS_PER_WORKSPACE = 2;

function toISO(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

@Injectable()
export class SiemService {
  private readonly logger = console;

  constructor(
    private readonly repo: SiemRepo,
    private readonly encryptionService: EncryptionService,
    private readonly outboundAgentFactory: OutboundAgentFactory,
    @InjectQueue(QueueName.SIEM_QUEUE) private readonly queue: Queue,
  ) {}

  async list(workspaceId: string): Promise<ISiemDestination[]> {
    const rows = await this.repo.listByWorkspace(workspaceId);
    return rows.map((row) => this.toDto(row));
  }

  async create(
    workspaceId: string,
    userId: string,
    input: ISiemDestinationInput,
  ): Promise<ISiemDestination> {
    const existing = await this.repo.listByWorkspace(workspaceId);
    if (existing.length >= SIEM_MAX_DESTINATIONS_PER_WORKSPACE) {
      throw new BadRequestException(
        `Maximum ${SIEM_MAX_DESTINATIONS_PER_WORKSPACE} SIEM destinations per workspace`,
      );
    }

    const data: InsertableSiemDestination = {
      workspaceId,
      name: input.name,
      type: input.type,
      config: input.config as any,
      secrets: this.encryptionService.encrypt(
        JSON.stringify(input.secrets ?? {}),
      ),
      creatorId: userId ?? null,
      enabled: input.enabled ?? true,
    } as InsertableSiemDestination;

    const created = await this.repo.create(data);
    return this.toDto(created);
  }

  async update(
    workspaceId: string,
    input: IUpdateSiemDestinationInput,
  ): Promise<ISiemDestination> {
    const existing = await this.repo.findById(input.destinationId, workspaceId);
    if (!existing) {
      throw new NotFoundException('SIEM destination not found');
    }

    const data: UpdatableSiemDestination = {} as UpdatableSiemDestination;
    if (input.name !== undefined) (data as any).name = input.name;
    if (input.config !== undefined) (data as any).config = input.config;
    if (input.enabled !== undefined) (data as any).enabled = input.enabled;
    if (input.secrets !== undefined) {
      (data as any).secrets = this.encryptionService.encrypt(
        JSON.stringify(input.secrets),
      );
    }

    const updated = await this.repo.update(
      input.destinationId,
      workspaceId,
      data,
      existing.version,
    );
    return this.toDto(updated);
  }

  async remove(workspaceId: string, destinationId: string): Promise<void> {
    const existing = await this.repo.findById(destinationId, workspaceId);
    if (!existing) {
      throw new NotFoundException('SIEM destination not found');
    }
    await this.repo.remove(destinationId, workspaceId);
  }

  async test(
    workspaceId: string,
    input: ITestSiemDestinationInput,
  ): Promise<ISiemTestResult> {
    let secrets: Record<string, string> = input.secrets ?? {};
    let config = input.config;

    if (input.destinationId) {
      const existing = await this.repo.findById(input.destinationId, workspaceId);
      if (existing) {
        const stored = this.decryptSecrets(existing.secrets);
        secrets = { ...stored, ...secrets };
        if (!config) config = existing.config as unknown as Record<string, unknown>;
      }
    }

    return this.deliverTest(input.type, config, secrets);
  }

  async retry(workspaceId: string, destinationId: string): Promise<void> {
    const existing = await this.repo.findById(destinationId, workspaceId);
    if (!existing) {
      throw new NotFoundException('SIEM destination not found');
    }
    await this.repo.resetForRetry(destinationId);
  }

  /** Deliver one audit event to every enabled destination in the workspace. */
  async deliverAuditLog(
    workspaceId: string,
    event: SiemAuditEvent,
  ): Promise<void> {
    const destinations = await this.repo.findEnabledByWorkspace(workspaceId);
    for (const dest of destinations) {
      const secrets = this.decryptSecrets(dest.secrets);
      const req = buildDeliverRequest(
        dest.type as SiemDestinationType,
        dest.config as unknown as Record<string, unknown>,
        secrets,
        event,
      );
      const result = await this.send(req);
      if (result.error) {
        this.logger.warn?.(`SIEM delivery failed for ${dest.id}: ${result.error}`);
        await this.repo.markFailed(
          dest.id,
          result.error,
          new Date(),
          new Date(Date.now() + 5 * 60_000),
        );
      } else {
        await this.repo.markDelivered(
          dest.id,
          new Date(),
          new Date(event.createdAt),
          event.id,
          JSON.stringify(event),
        );
      }
    }
  }

  async enqueueDelivery(
    workspaceId: string,
    event: SiemAuditEvent,
  ): Promise<void> {
    await this.queue.add(QueueJob.SIEM_DELIVER, { workspaceId, event });
  }

  private async deliverTest(
    type: SiemDestinationType,
    config: Record<string, unknown>,
    secrets: Record<string, string>,
  ): Promise<ISiemTestResult> {
    const req = buildDeliverRequest(type, config, secrets, {
      id: 'test',
      workspaceId: 'test',
      actorId: null,
      actorType: 'user',
      event: 'siem.test',
      resourceType: 'workspace',
      resourceId: null,
      spaceId: null,
      changes: null,
      metadata: null,
      ipAddress: null,
      userAgent: null,
      createdAt: new Date().toISOString(),
    });
    const result = await this.send(req);
    return {
      delivered: !result.error,
      statusCode: result.statusCode,
      error: result.error,
    };
  }

  private async send(
    req: DeliverRequest,
  ): Promise<{ statusCode?: number; error?: string }> {
    const lease = await this.outboundAgentFactory.lease(req.url, {
      rejectUnauthorized: req.rejectUnauthorized,
    });
    try {
      const res = await request(req.url, {
        method: 'POST',
        headers: req.headers,
        body: req.body,
        dispatcher: lease.dispatcher,
      });
      if (res.statusCode >= 200 && res.statusCode < 300) {
        return { statusCode: res.statusCode };
      }
      const text = await res.body.text().catch(() => '');
      return { statusCode: res.statusCode, error: text.slice(0, 500) };
    } catch (e) {
      return { error: (e as Error).message.slice(0, 500) };
    } finally {
      await lease.release();
    }
  }

  private decryptSecrets(encrypted: string): Record<string, string> {
    if (!encrypted) return {};
    try {
      return JSON.parse(this.encryptionService.decrypt(encrypted)) as Record<
        string,
        string
      >;
    } catch {
      return {};
    }
  }

  private toDto(row: SiemDestination): ISiemDestination {
    const secrets = this.decryptSecrets(row.secrets as unknown as string);
    const hasSecrets: Record<string, boolean> = {};
    for (const key of Object.keys(secrets)) {
      hasSecrets[key] = true;
    }

    return {
      id: row.id,
      name: row.name,
      type: row.type as SiemDestinationType,
      enabled: row.enabled,
      status: row.status as SiemDestinationStatus,
      config: row.config as unknown as ISiemConfig,
      hasSecrets,
      cursorCreatedAt: toISO(row.cursorCreatedAt) ?? new Date(0).toISOString(),
      lastDeliveredAt: toISO(row.lastDeliveredAt),
      lastError: row.lastError,
      lastErrorAt: toISO(row.lastErrorAt),
      consecutiveFailures: row.consecutiveFailures,
      nextAttemptAt: toISO(row.nextAttemptAt),
      failingSince: toISO(row.failingSince),
      createdAt: toISO(row.createdAt) ?? new Date(0).toISOString(),
      updatedAt: toISO(row.updatedAt) ?? new Date(0).toISOString(),
    };
  }
}
