import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import {
  AuditLogPayload,
  ActorType,
  AuditLogData,
} from '../../../common/events/audit-events';
import {
  AUDIT_CONTEXT_KEY,
  AuditContext,
} from '../../../common/middlewares/audit-context.middleware';
import { AuditRepo, AuditLogWithActor } from '../repos/audit.repo';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueName, QueueJob } from '../../../integrations/queue/constants/queue.constants';
import { Selectable } from 'kysely';
import { Audit } from '@docmost/db/types/db';
import { SiemAuditEvent } from '../../siem/types/siem.types';

export interface ListAuditLogsParams {
  limit?: number;
  cursor?: string;
  event?: string;
  resourceType?: string;
  actorId?: string;
  spaceId?: string;
  startDate?: string;
  endDate?: string;
}

export interface AuditLogResponse {
  id: string;
  workspaceId: string;
  actorId?: string;
  actorType: string;
  event: string;
  resourceType: string;
  resourceId?: string;
  spaceId?: string;
  changes?: { before?: Record<string, any>; after?: Record<string, any> };
  metadata?: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
  actor?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

function toAuditLogResponse(row: AuditLogWithActor): AuditLogResponse {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    actorId: row.actorId ?? undefined,
    actorType: row.actorType,
    event: row.event,
    resourceType: row.resourceType,
    resourceId: row.resourceId ?? undefined,
    spaceId: row.spaceId ?? undefined,
    changes: (row.changes as any) ?? undefined,
    metadata: (row.metadata as any) ?? undefined,
    ipAddress: row.ipAddress ?? undefined,
    createdAt: row.createdAt as unknown as Date,
    actor: row.actorId
      ? {
          id: row.actorId,
          name: row.actorName ?? '',
          email: row.actorEmail ?? '',
          avatarUrl: row.actorAvatarUrl ?? undefined,
        }
      : undefined,
  };
}

@Injectable()
export class AuditService {
  constructor(
    private readonly repo: AuditRepo,
    private readonly cls: ClsService,
    @InjectQueue(QueueName.SIEM_QUEUE) private readonly siemQueue: Queue,
  ) {}

  private context(): AuditContext {
    return (
      this.cls.get<AuditContext>(AUDIT_CONTEXT_KEY) ?? {
        workspaceId: null,
        actorId: null,
        actorType: 'user',
        ipAddress: null,
        userAgent: null,
      }
    );
  }

  private enqueueSiem(row: Selectable<Audit>): void {
    if (!row?.id) return;
    const event: SiemAuditEvent = {
      id: row.id,
      workspaceId: row.workspaceId,
      actorId: row.actorId,
      actorType: row.actorType,
      event: row.event,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      spaceId: row.spaceId,
      changes: row.changes as any,
      metadata: row.metadata as any,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : String(row.createdAt),
    };
    this.siemQueue
      .add(QueueJob.SIEM_DELIVER, { workspaceId: row.workspaceId, event })
      .catch(() => {});
  }

  log(payload: AuditLogPayload): Promise<void> {
    return this.logWithContext(payload, this.context());
  }

  async logWithContext(payload: AuditLogPayload, context: AuditContext): Promise<void> {
    if (!context.workspaceId) return Promise.resolve();
    const data: AuditLogData = {
      ...payload,
      workspaceId: context.workspaceId,
      actorId: context.actorId ?? undefined,
      actorType: context.actorType ?? 'user',
      ipAddress: context.ipAddress ?? undefined,
      userAgent: context.userAgent ?? undefined,
    };
    const row = await this.repo.insertAuditLog(data);
    this.enqueueSiem(row);
    return;
  }

  async logBatchWithContext(
    payloads: AuditLogPayload[],
    context: AuditContext,
  ): Promise<void> {
    if (!context.workspaceId || payloads.length === 0) return;
    const data: AuditLogData[] = payloads.map((p) => ({
      ...p,
      workspaceId: context.workspaceId!,
      actorId: context.actorId ?? undefined,
      actorType: context.actorType ?? 'user',
      ipAddress: context.ipAddress ?? undefined,
      userAgent: context.userAgent ?? undefined,
    }));
    await this.repo.insertAuditLogs(data);
  }

  setActorId(actorId: string): void {
    const ctx = this.cls.get<AuditContext>(AUDIT_CONTEXT_KEY);
    if (ctx) {
      ctx.actorId = actorId;
      this.cls.set(AUDIT_CONTEXT_KEY, ctx);
    }
  }

  setActorType(actorType: ActorType): void {
    const ctx = this.cls.get<AuditContext>(AUDIT_CONTEXT_KEY);
    if (ctx) {
      ctx.actorType = actorType;
      this.cls.set(AUDIT_CONTEXT_KEY, ctx);
    }
  }

  async listAuditLogs(
    workspaceId: string,
    params: ListAuditLogsParams,
  ): Promise<{ items: AuditLogResponse[]; meta: any }> {
    const result = await this.repo.listAuditLogs(
      workspaceId,
      {
        query: '',
        limit: params.limit ?? 50,
        cursor: params.cursor,
        adminView: false,
      },
      {
        event: params.event,
        resourceType: params.resourceType,
        actorId: params.actorId,
        spaceId: params.spaceId,
        startDate: params.startDate,
        endDate: params.endDate,
      },
    );
    return {
      items: result.items.map(toAuditLogResponse),
      meta: result.meta,
    };
  }

  async getRetention(workspaceId: string): Promise<number> {
    return this.repo.getRetention(workspaceId);
  }

  async updateRetention(
    workspaceId: string,
    retentionDays: number,
  ): Promise<void> {
    return this.repo.updateRetention(workspaceId, retentionDays);
  }
}
