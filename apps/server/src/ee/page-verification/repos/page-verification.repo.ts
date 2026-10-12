import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { Insertable, Selectable } from 'kysely';
import { jsonArrayFrom } from 'kysely/helpers/postgres';
import { KyselyDB, KyselyTransaction } from '@docmost/db/types/kysely.types';
import { dbOrTx, executeTx } from '@docmost/db/utils';
import {
  InsertablePageVerification,
  PageVerification,
  UpdatablePageVerification,
} from '@docmost/db/types/entity.types';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import {
  executeWithCursorPagination,
  CursorPaginationResult,
} from '@docmost/db/pagination/cursor-pagination';

export interface VerifierRef {
  id: string;
  name: string;
  avatarUrl: string | null;
  email: string;
}

export interface UserRef {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface ListVerificationsFilters {
  spaceIds?: string[];
  verifierId?: string;
  type?: string;
  query?: string;
}

@Injectable()
export class PageVerificationRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async getByPageId(pageId: string): Promise<PageVerification | undefined> {
    return this.db
      .selectFrom('pageVerifications')
      .selectAll()
      .where('pageId', '=', pageId)
      .executeTakeFirst();
  }

  async getById(id: string): Promise<PageVerification | undefined> {
    return this.db
      .selectFrom('pageVerifications')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  async insert(
    data: InsertablePageVerification,
    trx?: KyselyTransaction,
  ): Promise<PageVerification> {
    const db = dbOrTx(this.db, trx);
    return db
      .insertInto('pageVerifications')
      .values(data)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async update(
    id: string,
    data: UpdatablePageVerification,
    trx?: KyselyTransaction,
  ): Promise<PageVerification> {
    const db = dbOrTx(this.db, trx);
    return db
      .updateTable('pageVerifications')
      .set(data)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async deleteByPageId(pageId: string): Promise<void> {
    await this.db
      .deleteFrom('pageVerifications')
      .where('pageId', '=', pageId)
      .execute();
  }

  async getUserRef(userId: string | null): Promise<UserRef | null> {
    if (!userId) return null;
    const row = await this.db
      .selectFrom('users')
      .select(['id', 'name', 'avatarUrl'])
      .where('id', '=', userId)
      .executeTakeFirst();
    return row ?? null;
  }

  async getVerifierRefs(
    pageVerificationId: string,
  ): Promise<VerifierRef[]> {
    const rows = await this.db
      .selectFrom('pageVerifiers')
      .innerJoin('users', 'users.id', 'pageVerifiers.userId')
      .select([
        'users.id',
        'users.name',
        'users.avatarUrl',
        'users.email',
      ])
      .where('pageVerifiers.pageVerificationId', '=', pageVerificationId)
      .execute();
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      avatarUrl: r.avatarUrl,
      email: r.email,
    }));
  }

  async getVerifierUserIds(pageVerificationId: string): Promise<string[]> {
    const rows = await this.db
      .selectFrom('pageVerifiers')
      .select(['userId'])
      .where('pageVerifiers.pageVerificationId', '=', pageVerificationId)
      .execute();
    return rows.map((r) => r.userId);
  }

  /**
   * Replace the verifier set for a verification record atomically.
   */
  async setVerifiers(
    pageVerificationId: string,
    userIds: string[],
    addedById: string,
  ): Promise<void> {
    await executeTx(this.db, async (trx) => {
      await trx
        .deleteFrom('pageVerifiers')
        .where('pageVerificationId', '=', pageVerificationId)
        .execute();

      if (userIds.length === 0) return;

      const values: Insertable<any>[] = userIds.map((userId) => ({
        pageVerificationId,
        userId,
        isPrimary: false,
        addedById,
      }));
      await trx.insertInto('pageVerifiers').values(values).execute();
    });
  }

  async listVerifications(
    workspaceId: string,
    pagination: PaginationOptions,
    filters: ListVerificationsFilters = {},
  ): Promise<CursorPaginationResult<any>> {
    let query = this.db
      .selectFrom('pageVerifications as pv')
      .innerJoin('pages as p', 'p.id', 'pv.pageId')
      .innerJoin('spaces as s', 's.id', 'pv.spaceId')
      .select([
        'pv.id',
        'pv.pageId',
        'pv.spaceId',
        'pv.type',
        'pv.status',
        'pv.mode',
        'pv.periodAmount',
        'pv.periodUnit',
        'pv.verifiedAt',
        'pv.expiresAt',
        'pv.createdAt',
        'p.title as pageTitle',
        'p.slugId as pageSlugId',
        'p.icon as pageIcon',
        's.name as spaceName',
        's.slug as spaceSlug',
      ])
      .select((eb) =>
        jsonArrayFrom(
          eb
            .selectFrom('pageVerifiers as pv2')
            .innerJoin('users as u', 'u.id', 'pv2.userId')
            .select(['u.id', 'u.name', 'u.avatarUrl'])
            .whereRef('pv2.pageVerificationId', '=', 'pv.id'),
        ).as('verifiers'),
      )
      .where('pv.workspaceId', '=', workspaceId);

    if (filters.spaceIds && filters.spaceIds.length > 0) {
      query = query.where('pv.spaceId', 'in', filters.spaceIds);
    }
    if (filters.type) {
      query = query.where('pv.type', '=', filters.type);
    }
    if (filters.verifierId) {
      query = query.where((eb) =>
        eb.exists(
          eb
            .selectFrom('pageVerifiers as pv3')
            .select('pv3.userId')
            .whereRef('pv3.pageVerificationId', '=', 'pv.id')
            .where('pv3.userId', '=', filters.verifierId!),
        ),
      );
    }
    if (filters.query) {
      query = query.where('p.title', 'ilike', `%${filters.query}%`);
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
}
