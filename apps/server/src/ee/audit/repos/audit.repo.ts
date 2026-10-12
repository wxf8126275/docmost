import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { Insertable, Selectable } from 'kysely';
import { KyselyDB, KyselyTransaction } from '@docmost/db/types/kysely.types';
import { dbOrTx } from '@docmost/db/utils';
import { Audit } from '@docmost/db/types/db';
import { AuditLogData } from '../../../common/events/audit-events';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import {
  executeWithCursorPagination,
  CursorPaginationResult,
} from '@docmost/db/pagination/cursor-pagination';

export type AuditLogWithActor = Selectable<Audit> & {
  actorName: string | null;
  actorEmail: string | null;
  actorAvatarUrl: string | null;
};

export interface ListAuditLogsFilters {
  event?: string;
  resourceType?: string;
  actorId?: string;
  spaceId?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class AuditRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async insertAuditLog(
    data: AuditLogData,
    trx?: KyselyTransaction,
  ): Promise<Selectable<Audit>> {
    const db = dbOrTx(this.db, trx);
    const values: Insertable<Audit> = {
      workspaceId: data.workspaceId,
      actorId: data.actorId ?? null,
      actorType: data.actorType,
      event: data.event,
      resourceType: data.resourceType,
      resourceId: data.resourceId ?? null,
      spaceId: data.spaceId ?? null,
      changes: data.changes ?? null,
      metadata: data.metadata ?? null,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
    };
    return db
      .insertInto('audit')
      .values(values)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async insertAuditLogs(
    data: AuditLogData[],
    trx?: KyselyTransaction,
  ): Promise<void> {
    if (data.length === 0) return;
    const db = dbOrTx(this.db, trx);
    const values: Insertable<Audit>[] = data.map((d) => ({
      workspaceId: d.workspaceId,
      actorId: d.actorId ?? null,
      actorType: d.actorType,
      event: d.event,
      resourceType: d.resourceType,
      resourceId: d.resourceId ?? null,
      spaceId: d.spaceId ?? null,
      changes: d.changes ?? null,
      metadata: d.metadata ?? null,
      ipAddress: d.ipAddress ?? null,
      userAgent: d.userAgent ?? null,
    }));
    await db.insertInto('audit').values(values).execute();
  }

  async listAuditLogs(
    workspaceId: string,
    pagination: PaginationOptions,
    filters: ListAuditLogsFilters = {},
  ): Promise<CursorPaginationResult<AuditLogWithActor>> {
    let query = this.db
      .selectFrom('audit')
      .selectAll('audit')
      .leftJoin('users', 'users.id', 'audit.actorId')
      .select([
        'users.name as actorName',
        'users.email as actorEmail',
        'users.avatarUrl as actorAvatarUrl',
      ])
      .where('audit.workspaceId', '=', workspaceId);

    if (filters.event) {
      query = query.where('audit.event', '=', filters.event);
    }
    if (filters.resourceType) {
      query = query.where('audit.resourceType', '=', filters.resourceType);
    }
    if (filters.actorId) {
      query = query.where('audit.actorId', '=', filters.actorId);
    }
    if (filters.spaceId) {
      query = query.where('audit.spaceId', '=', filters.spaceId);
    }
    if (filters.startDate) {
      query = query.where('audit.createdAt', '>=', new Date(filters.startDate));
    }
    if (filters.endDate) {
      query = query.where('audit.createdAt', '<=', new Date(filters.endDate));
    }

    return executeWithCursorPagination(query, {
      perPage: pagination.limit,
      cursor: pagination.cursor,
      beforeCursor: pagination.beforeCursor,
      fields: [
        { expression: 'createdAt', direction: 'desc' },
        { expression: 'id', direction: 'desc' },
      ],
      parseCursor: (cursor: any) => ({
        createdAt: new Date(cursor.createdAt),
        id: cursor.id,
      }),
    });
  }

  async getRetention(workspaceId: string): Promise<number> {
    const row = await this.db
      .selectFrom('workspaces')
      .select('auditRetentionDays')
      .where('id', '=', workspaceId)
      .executeTakeFirstOrThrow();
    return row.auditRetentionDays;
  }

  async updateRetention(
    workspaceId: string,
    retentionDays: number,
  ): Promise<void> {
    await this.db
      .updateTable('workspaces')
      .set({ auditRetentionDays: retentionDays })
      .where('id', '=', workspaceId)
      .execute();
  }
}
