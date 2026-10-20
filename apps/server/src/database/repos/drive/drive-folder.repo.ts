import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@docmost/db/types/kysely.types';
import { dbOrTx } from '@docmost/db/utils';
import {
  DriveFolder,
  InsertableDriveFolder,
  UpdatableDriveFolder,
} from '@docmost/db/types/entity.types';

export interface ListFoldersOptions {
  workspaceId: string;
  /** Owning drive space. All folder access is scoped by it. */
  spaceId: string;
  /** null = root level, string = inside that folder. */
  parentId?: string | null;
  trx?: KyselyTransaction;
}

@Injectable()
export class DriveFolderRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  private baseFields: Array<keyof DriveFolder> = [
    'id',
    'workspaceId',
    'spaceId',
    'parentId',
    'name',
    'creatorId',
    'createdAt',
    'updatedAt',
    'deletedAt',
  ];

  async findById(
    folderId: string,
    opts?: { trx?: KyselyTransaction; spaceId?: string },
  ): Promise<DriveFolder> {
    const db = dbOrTx(this.db, opts?.trx);
    let query = db
      .selectFrom('driveFolders')
      .select(this.baseFields)
      .where('id', '=', folderId);

    if (opts?.spaceId) {
      query = query.where('spaceId', '=', opts.spaceId);
    }

    return query.executeTakeFirst();
  }

  async createFolder(
    insertable: InsertableDriveFolder,
    trx?: KyselyTransaction,
  ): Promise<DriveFolder> {
    const db = dbOrTx(this.db, trx);
    return db
      .insertInto('driveFolders')
      .values(insertable)
      .returning(this.baseFields)
      .executeTakeFirst();
  }

  async updateFolder(
    updatable: UpdatableDriveFolder,
    folderId: string,
    spaceId: string,
    trx?: KyselyTransaction,
  ): Promise<DriveFolder> {
    const db = dbOrTx(this.db, trx);
    return db
      .updateTable('driveFolders')
      .set(updatable)
      .where('id', '=', folderId)
      .where('spaceId', '=', spaceId)
      .returning(this.baseFields)
      .executeTakeFirst();
  }

  async softDeleteFolder(
    folderId: string,
    spaceId: string,
    trx?: KyselyTransaction,
  ): Promise<void> {
    const db = dbOrTx(this.db, trx);
    await db
      .updateTable('driveFolders')
      .set({ deletedAt: new Date() })
      .where('id', '=', folderId)
      .where('spaceId', '=', spaceId)
      .execute();
  }

  async listFolders(opts: ListFoldersOptions): Promise<DriveFolder[]> {
    const { workspaceId, spaceId, parentId, trx } = opts;
    const db = dbOrTx(this.db, trx);

    let query = db
      .selectFrom('driveFolders')
      .select(this.baseFields)
      .where('workspaceId', '=', workspaceId)
      .where('spaceId', '=', spaceId)
      .where('deletedAt', 'is', null);

    if (parentId === null) {
      query = query.where('parentId', 'is', null);
    } else if (parentId) {
      query = query.where('parentId', '=', parentId);
    }

    return query.orderBy('name', 'asc').execute();
  }
}
