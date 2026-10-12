import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@docmost/db/types/kysely.types';
import { dbOrTx } from '@docmost/db/utils';
import { ApiKeys } from '@docmost/db/types/db';
import { ApiKey } from '@docmost/db/types/entity.types';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import {
  executeWithCursorPagination,
  CursorPaginationResult,
} from '@docmost/db/pagination/cursor-pagination';

export interface ApiKeyWithCreator extends ApiKey {
  creatorName: string | null;
  creatorAvatarUrl: string | null;
}

@Injectable()
export class ApiKeyRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async createApiKey(
    workspaceId: string,
    creatorId: string,
    name: string,
    keyHash: string,
    keyPrefix: string,
    expiresAt: Date | null,
    trx?: KyselyTransaction,
  ): Promise<ApiKey> {
    const db = dbOrTx(this.db, trx);
    return db
      .insertInto('apiKeys')
      .values({ workspaceId, creatorId, name, keyHash, keyPrefix, expiresAt })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async findById(
    apiKeyId: string,
    workspaceId: string,
  ): Promise<ApiKey | undefined> {
    return this.db
      .selectFrom('apiKeys')
      .selectAll()
      .where('id', '=', apiKeyId)
      .where('workspaceId', '=', workspaceId)
      .executeTakeFirst();
  }

  async listApiKeys(
    workspaceId: string,
    pagination: PaginationOptions,
  ): Promise<CursorPaginationResult<ApiKeyWithCreator>> {
    const query = this.db
      .selectFrom('apiKeys')
      .selectAll('apiKeys')
      .leftJoin('users', 'users.id', 'apiKeys.creatorId')
      .select(['users.name as creatorName', 'users.avatarUrl as creatorAvatarUrl'])
      .where('apiKeys.workspaceId', '=', workspaceId)
      .where('apiKeys.deletedAt', 'is', null);

    return executeWithCursorPagination(query, {
      perPage: pagination.limit,
      cursor: pagination.cursor,
      beforeCursor: pagination.beforeCursor,
      fields: [
        { expression: 'updatedAt', direction: 'desc' },
        { expression: 'id', direction: 'desc' },
      ],
      parseCursor: (cursor) => ({
        updatedAt: new Date(cursor.updatedAt),
        id: cursor.id,
      }),
    });
  }

  async updateName(
    apiKeyId: string,
    workspaceId: string,
    name: string,
  ): Promise<ApiKey> {
    return this.db
      .updateTable('apiKeys')
      .set({ name })
      .where('id', '=', apiKeyId)
      .where('workspaceId', '=', workspaceId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async revoke(apiKeyId: string, workspaceId: string): Promise<ApiKey> {
    return this.db
      .updateTable('apiKeys')
      .set({ deletedAt: new Date() })
      .where('id', '=', apiKeyId)
      .where('workspaceId', '=', workspaceId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
