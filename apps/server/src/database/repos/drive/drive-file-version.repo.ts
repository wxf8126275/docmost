import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@docmost/db/types/kysely.types';
import { dbOrTx } from '@docmost/db/utils';
import {
  DriveFileVersion,
  InsertableDriveFileVersion,
} from '@docmost/db/types/entity.types';

@Injectable()
export class DriveFileVersionRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  private baseFields: Array<keyof DriveFileVersion> = [
    'id',
    'workspaceId',
    'fileId',
    'versionNumber',
    'fileName',
    'filePath',
    'fileSize',
    'fileExt',
    'mimeType',
    'creatorId',
    'createdAt',
  ];

  async insertVersion(
    insertable: InsertableDriveFileVersion,
    trx?: KyselyTransaction,
  ): Promise<DriveFileVersion> {
    const db = dbOrTx(this.db, trx);
    return db
      .insertInto('driveFileVersions')
      .values(insertable)
      .returning(this.baseFields)
      .executeTakeFirst();
  }

  async nextVersionNumber(
    fileId: string,
    trx?: KyselyTransaction,
  ): Promise<number> {
    const db = dbOrTx(this.db, trx);
    const row = await db
      .selectFrom('driveFileVersions')
      .select((eb) => eb.fn.max<number>('versionNumber').as('max'))
      .where('fileId', '=', fileId)
      .executeTakeFirst();
    return Number(row?.max ?? 0) + 1;
  }

  async listVersions(
    fileId: string,
    trx?: KyselyTransaction,
  ): Promise<DriveFileVersion[]> {
    const db = dbOrTx(this.db, trx);
    return db
      .selectFrom('driveFileVersions')
      .select(this.baseFields)
      .where('fileId', '=', fileId)
      .orderBy('versionNumber', 'desc')
      .execute();
  }

  async getVersion(
    versionId: string,
    fileId: string,
    trx?: KyselyTransaction,
  ): Promise<DriveFileVersion | undefined> {
    const db = dbOrTx(this.db, trx);
    return db
      .selectFrom('driveFileVersions')
      .select(this.baseFields)
      .where('id', '=', versionId)
      .where('fileId', '=', fileId)
      .executeTakeFirst();
  }
}
