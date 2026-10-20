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
  /** Owning drive space. All file access is scoped by it. */
  spaceId: string;
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
    'spaceId',
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
    opts?: { trx?: KyselyTransaction; spaceId?: string },
  ): Promise<DriveFile> {
    const db = dbOrTx(this.db, opts?.trx);
    let query = db
      .selectFrom('driveFiles')
      .select(this.baseFields)
      .where('id', '=', fileId);

    if (opts?.spaceId) {
      query = query.where('spaceId', '=', opts.spaceId);
    }

    return query.executeTakeFirst();
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
    spaceId: string,
    trx?: KyselyTransaction,
  ): Promise<DriveFile> {
    const db = dbOrTx(this.db, trx);
    return db
      .updateTable('driveFiles')
      .set(updatable)
      .where('id', '=', fileId)
      .where('spaceId', '=', spaceId)
      .returning(this.baseFields)
      .executeTakeFirst();
  }

  async softDeleteFile(
    fileId: string,
    spaceId: string,
    trx?: KyselyTransaction,
  ): Promise<void> {
    const db = dbOrTx(this.db, trx);
    await db
      .updateTable('driveFiles')
      .set({ deletedAt: new Date() })
      .where('id', '=', fileId)
      .where('spaceId', '=', spaceId)
      .execute();
  }

  async listFiles(opts: ListFilesOptions): Promise<DriveFile[]> {
    const { workspaceId, spaceId, folderId, trx } = opts;
    const db = dbOrTx(this.db, trx);

    let query = db
      .selectFrom('driveFiles')
      .select(this.baseFields)
      .where('workspaceId', '=', workspaceId)
      .where('spaceId', '=', spaceId)
      .where('deletedAt', 'is', null);

    if (folderId === null) {
      query = query.where('folderId', 'is', null);
    } else if (folderId) {
      query = query.where('folderId', '=', folderId);
    }

    return query.orderBy('fileName', 'asc').execute();
  }

  async sumFileSizes(opts: { spaceId: string }): Promise<number> {
    const { spaceId } = opts;
    const db = dbOrTx(this.db);

    const row = await db
      .selectFrom('driveFiles')
      .select((eb) => eb.fn.sum<number>('fileSize').as('total'))
      .where('spaceId', '=', spaceId)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();

    return Number(row?.total ?? 0);
  }
}
