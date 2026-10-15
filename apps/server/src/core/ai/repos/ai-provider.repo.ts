import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@docmost/db/types/kysely.types';
import { dbOrTx } from '@docmost/db/utils';
import { AiProvider } from '@docmost/db/types/entity.types';

export interface CreateAiProviderInput {
  name: string;
  driver: string;
  apiKeyEncrypted?: string | null;
  baseUrl?: string | null;
  completionModel: string;
  embeddingModel?: string | null;
  isDefault?: boolean;
}

/**
 * Data-access layer for workspace AI providers. `apiKeyEncrypted` is stored
 * pre-encrypted by the caller (AiProviderService); this repo never touches
 * plaintext secrets.
 */
@Injectable()
export class AiProviderRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async createProvider(
    workspaceId: string,
    input: CreateAiProviderInput,
    trx?: KyselyTransaction,
  ): Promise<AiProvider> {
    const db = dbOrTx(this.db, trx);
    return db
      .insertInto('aiProviders')
      .values({
        workspaceId,
        name: input.name,
        driver: input.driver,
        apiKeyEncrypted: input.apiKeyEncrypted ?? null,
        baseUrl: input.baseUrl ?? null,
        completionModel: input.completionModel,
        embeddingModel: input.embeddingModel ?? null,
        isDefault: input.isDefault ?? false,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async updateProvider(
    id: string,
    workspaceId: string,
    patch: Partial<CreateAiProviderInput>,
    trx?: KyselyTransaction,
  ): Promise<AiProvider> {
    const db = dbOrTx(this.db, trx);
    return db
      .updateTable('aiProviders')
      .set(patch)
      .where('id', '=', id)
      .where('workspaceId', '=', workspaceId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async findById(
    id: string,
    workspaceId: string,
  ): Promise<AiProvider | undefined> {
    return this.db
      .selectFrom('aiProviders')
      .selectAll()
      .where('id', '=', id)
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();
  }

  async listByWorkspace(workspaceId: string): Promise<AiProvider[]> {
    return this.db
      .selectFrom('aiProviders')
      .selectAll()
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null)
      .orderBy('createdAt', 'asc')
      .execute();
  }

  async findDefault(
    workspaceId: string,
  ): Promise<AiProvider | undefined> {
    return this.db
      .selectFrom('aiProviders')
      .selectAll()
      .where('workspaceId', '=', workspaceId)
      .where('isDefault', '=', true)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();
  }

  async deleteProvider(
    id: string,
    workspaceId: string,
    trx?: KyselyTransaction,
  ): Promise<void> {
    const db = dbOrTx(this.db, trx);
    await db
      .updateTable('aiProviders')
      .set({ deletedAt: new Date() })
      .where('id', '=', id)
      .where('workspaceId', '=', workspaceId)
      .execute();
  }

  /**
   * Marks a single provider as the default for a workspace by first clearing
   * any existing default, then setting the target one. Enforces at most one
   * default per workspace.
   */
  async setDefault(
    workspaceId: string,
    id: string,
    trx?: KyselyTransaction,
  ): Promise<AiProvider> {
    const db = dbOrTx(this.db, trx);
    await db
      .updateTable('aiProviders')
      .set({ isDefault: false })
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null)
      .execute();

    return db
      .updateTable('aiProviders')
      .set({ isDefault: true })
      .where('id', '=', id)
      .where('workspaceId', '=', workspaceId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
