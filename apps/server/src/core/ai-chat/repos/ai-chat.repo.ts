import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@docmost/db/types/kysely.types';
import { dbOrTx } from '@docmost/db/utils';
import { AiChats, AiChatMessages } from '@docmost/db/types/db';
import { AiChat, AiChatMessage } from '@docmost/db/types/entity.types';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import {
  executeWithCursorPagination,
  CursorPaginationResult,
} from '@docmost/db/pagination/cursor-pagination';
import { Insertable } from 'kysely';

@Injectable()
export class AiChatRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async createChat(
    workspaceId: string,
    creatorId: string,
    trx?: KyselyTransaction,
  ): Promise<AiChat> {
    const db = dbOrTx(this.db, trx);
    return db
      .insertInto('aiChats')
      .values({ workspaceId, creatorId })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async findById(
    chatId: string,
    workspaceId: string,
    trx?: KyselyTransaction,
  ): Promise<AiChat | undefined> {
    const db = dbOrTx(this.db, trx);
    return db
      .selectFrom('aiChats')
      .selectAll()
      .where('id', '=', chatId)
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();
  }

  async listChats(
    workspaceId: string,
    userId: string,
    pagination: PaginationOptions,
  ): Promise<CursorPaginationResult<AiChat>> {
    const query = this.db
      .selectFrom('aiChats')
      .selectAll()
      .where('workspaceId', '=', workspaceId)
      .where('creatorId', '=', userId)
      .where('deletedAt', 'is', null);

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

  async getChatMessages(
    chatId: string,
    workspaceId: string,
  ): Promise<AiChatMessage[]> {
    return this.db
      .selectFrom('aiChatMessages')
      .selectAll()
      .where('chatId', '=', chatId)
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null)
      .orderBy('createdAt', 'asc')
      .orderBy('id', 'asc')
      .execute();
  }

  async insertMessage(
    message: Insertable<AiChatMessages>,
    trx?: KyselyTransaction,
  ): Promise<AiChatMessage> {
    const db = dbOrTx(this.db, trx);
    return db
      .insertInto('aiChatMessages')
      .values(message)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async updateChatTitle(
    chatId: string,
    title: string,
    trx?: KyselyTransaction,
  ): Promise<void> {
    const db = dbOrTx(this.db, trx);
    await db
      .updateTable('aiChats')
      .set({ title, updatedAt: new Date() })
      .where('id', '=', chatId)
      .execute();
  }

  async softDeleteChat(
    chatId: string,
    workspaceId: string,
    userId: string,
    trx?: KyselyTransaction,
  ): Promise<void> {
    const db = dbOrTx(this.db, trx);
    await db
      .updateTable('aiChats')
      .set({ deletedAt: new Date() })
      .where('id', '=', chatId)
      .where('workspaceId', '=', workspaceId)
      .where('creatorId', '=', userId)
      .execute();
  }

  async searchChats(
    query: string,
    workspaceId: string,
    userId: string,
  ): Promise<AiChat[]> {
    const like = `%${query}%`;
    return this.db
      .selectFrom('aiChats')
      .selectAll()
      .where('workspaceId', '=', workspaceId)
      .where('creatorId', '=', userId)
      .where('deletedAt', 'is', null)
      .where((eb) =>
        eb.or([
          eb('title', 'ilike', like),
          eb.exists(
            eb
              .selectFrom('aiChatMessages')
              .select('id')
              .whereRef('aiChatMessages.chatId', '=', 'aiChats.id')
              .where('aiChatMessages.content', 'ilike', like)
              .where('aiChatMessages.deletedAt', 'is', null),
          ),
        ]),
      )
      .orderBy('updatedAt', 'desc')
      .limit(20)
      .execute();
  }
}
