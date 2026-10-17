import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@docmost/db/types/kysely.types';
import { dbOrTx } from '@docmost/db/utils';
import {
  DriveShare,
  InsertableDriveShare,
} from '@docmost/db/types/entity.types';

@Injectable()
export class DriveShareRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  private baseFields: Array<keyof DriveShare> = [
    'id',
    'workspaceId',
    'fileId',
    'creatorId',
    'token',
    'permission',
    'expiresAt',
    'createdAt',
    'updatedAt',
    'deletedAt',
  ];

  async createShare(
    insertable: InsertableDriveShare,
    trx?: KyselyTransaction,
  ): Promise<DriveShare> {
    const db = dbOrTx(this.db, trx);
    return db
      .insertInto('driveShares')
      .values(insertable)
      .returning(this.baseFields)
      .executeTakeFirst();
  }

  async findByToken(
    token: string,
    opts?: { trx?: KyselyTransaction },
  ): Promise<DriveShare | undefined> {
    const db = dbOrTx(this.db, opts?.trx);
    return db
      .selectFrom('driveShares')
      .select(this.baseFields)
      .where('token', '=', token)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();
  }

  async softDeleteShare(
    token: string,
    trx?: KyselyTransaction,
  ): Promise<void> {
    const db = dbOrTx(this.db, trx);
    await db
      .updateTable('driveShares')
      .set({ deletedAt: new Date() })
      .where('token', '=', token)
      .execute();
  }
}
