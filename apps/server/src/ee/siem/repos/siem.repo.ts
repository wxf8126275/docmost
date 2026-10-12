import { Injectable } from '@nestjs/common';
import { ConflictException } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { sql } from 'kysely';
import { KyselyDB, KyselyTransaction } from '@docmost/db/types/kysely.types';
import { dbOrTx } from '@docmost/db/utils';
import {
  SiemDestination,
  InsertableSiemDestination,
  UpdatableSiemDestination,
} from '@docmost/db/types/entity.types';

@Injectable()
export class SiemRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  listByWorkspace(workspaceId: string): Promise<SiemDestination[]> {
    return this.db
      .selectFrom('siemDestinations')
      .selectAll()
      .where('workspaceId', '=', workspaceId)
      .orderBy('createdAt', 'desc')
      .execute();
  }

  findById(
    id: string,
    workspaceId: string,
  ): Promise<SiemDestination | undefined> {
    return this.db
      .selectFrom('siemDestinations')
      .selectAll()
      .where('id', '=', id)
      .where('workspaceId', '=', workspaceId)
      .executeTakeFirst();
  }

  findEnabledByWorkspace(workspaceId: string): Promise<SiemDestination[]> {
    return this.db
      .selectFrom('siemDestinations')
      .selectAll()
      .where('workspaceId', '=', workspaceId)
      .where('enabled', '=', true)
      .execute();
  }

  create(
    data: InsertableSiemDestination,
    trx?: KyselyTransaction,
  ): Promise<SiemDestination> {
    const db = dbOrTx(this.db, trx);
    return db
      .insertInto('siemDestinations')
      .values(data)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async update(
    id: string,
    workspaceId: string,
    data: UpdatableSiemDestination,
    expectedVersion: number,
  ): Promise<SiemDestination> {
    const result = await this.db
      .updateTable('siemDestinations')
      .set({ ...data, version: sql`version + 1` })
      .where('id', '=', id)
      .where('workspaceId', '=', workspaceId)
      .where('version', '=', expectedVersion)
      .returningAll()
      .executeTakeFirst();
    if (!result) {
      throw new ConflictException('Destination was modified concurrently');
    }
    return result;
  }

  async remove(id: string, workspaceId: string): Promise<void> {
    await this.db
      .deleteFrom('siemDestinations')
      .where('id', '=', id)
      .where('workspaceId', '=', workspaceId)
      .execute();
  }

  async markDelivered(
    id: string,
    deliveredAt: Date,
    cursorCreatedAt: Date,
    cursorId: string,
    cursorSnapshot: string,
  ): Promise<void> {
    await this.db
      .updateTable('siemDestinations')
      .set({
        lastDeliveredAt: deliveredAt,
        consecutiveFailures: 0,
        status: 'healthy',
        failingSince: null,
        nextAttemptAt: null,
        cursorCreatedAt,
        cursorId,
        cursorSnapshot,
      })
      .where('id', '=', id)
      .execute();
  }

  async markFailed(
    id: string,
    error: string,
    at: Date,
    nextAttemptAt: Date,
  ): Promise<void> {
    await this.db
      .updateTable('siemDestinations')
      .set({
        consecutiveFailures: sql`consecutive_failures + 1`,
        lastError: error,
        lastErrorAt: at,
        status: 'failing',
        failingSince: sql`coalesce(failing_since, ${at})`,
        nextAttemptAt,
      })
      .where('id', '=', id)
      .execute();
  }

  async resetForRetry(id: string): Promise<void> {
    await this.db
      .updateTable('siemDestinations')
      .set({
        consecutiveFailures: 0,
        nextAttemptAt: null,
        status: 'healthy',
        failingSince: null,
      })
      .where('id', '=', id)
      .execute();
  }
}
