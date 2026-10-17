import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@docmost/db/types/kysely.types';
import { dbOrTx } from '@docmost/db/utils';
import {
  DriveFile,
  InsertableDriveFile,
  UpdatableDriveFile,
} from '@docmost/db/types/entity.types';

export interface ListFilesOptions {
  workspaceId: string;
  driveType: 'personal' | 'shared';
  /** Required for personal drives; ignored (treated as null) for shared. */
  ownerId?: string | null;
  /** null = root level, string = inside that folder. */
  folderId?: string | null;
  trx?: KyselyTransaction;
}

@Injectable()
export class DriveFileRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  private baseFields: Array<keyof DriveFile> = [
    'id',
    'workspaceId',
    'driveType',
    'ownerId',
    'folderId',
    'fileName',
    'filePath',
    'fileSize',
    'fileExt',
    'mimeType',
    'type',
    'creatorId',
    'createdAt',
    'updatedAt',
    'deletedAt',
  ];

  async findById(
    fileId: string,
    opts?: { trx?: KyselyTransaction },
  ): Promise<DriveFile> {
    const db = dbOrTx(this.db, opts?.trx);
    return db
      .selectFrom('driveFiles')
      .select(this.baseFields)
      .where('id', '=', fileId)
      .executeTakeFirst();
  }

  async createFile(
    insertable: InsertableDriveFile,
    trx?: KyselyTransaction,
  ): Promise<DriveFile> {
    const db = dbOrTx(this.db, trx);
    return db
      .insertInto('driveFiles')
      .values(insertable)
      .returning(this.baseFields)
      .executeTakeFirst();
  }

  async updateFile(
    updatable: UpdatableDriveFile,
    fileId: string,
    trx?: KyselyTransaction,
  ): Promise<DriveFile> {
    const db = dbOrTx(this.db, trx);
    return db
      .updateTable('driveFiles')
      .set(updatable)
      .where('id', '=', fileId)
      .returning(this.baseFields)
      .executeTakeFirst();
  }

  async softDeleteFile(
    fileId: string,
    trx?: KyselyTransaction,
  ): Promise<void> {
    const db = dbOrTx(this.db, trx);
    await db
      .updateTable('driveFiles')
      .set({ deletedAt: new Date() })
      .where('id', '=', fileId)
      .execute();
  }

  async listFiles(opts: ListFilesOptions): Promise<DriveFile[]> {
    const { workspaceId, driveType, ownerId, folderId, trx } = opts;
    const db = dbOrTx(this.db, trx);

    let query = db
      .selectFrom('driveFiles')
      .select(this.baseFields)
      .where('workspaceId', '=', workspaceId)
      .where('driveType', '=', driveType)
      .where('deletedAt', 'is', null);

    if (driveType === 'personal') {
      query = query.where('ownerId', '=', ownerId ?? '');
    } else {
      query = query.where('ownerId', 'is', null);
    }

    if (folderId === null) {
      query = query.where('folderId', 'is', null);
    } else if (folderId) {
      query = query.where('folderId', '=', folderId);
    }

    return query.orderBy('fileName', 'asc').execute();
  }

  async sumFileSizes(opts: {
    workspaceId: string;
    driveType: 'personal' | 'shared';
    ownerId?: string | null;
  }): Promise<number> {
    const { workspaceId, driveType, ownerId } = opts;
    const db = dbOrTx(this.db);

    let query = db
      .selectFrom('driveFiles')
      .select((eb) => eb.fn.sum<number>('fileSize').as('total'))
      .where('workspaceId', '=', workspaceId)
      .where('driveType', '=', driveType)
      .where('deletedAt', 'is', null);

    if (driveType === 'personal') {
      query = query.where('ownerId', '=', ownerId ?? '');
    } else {
      query = query.where('ownerId', 'is', null);
    }

    const row = await query.executeTakeFirst();
    return Number(row?.total ?? 0);
  }
}
