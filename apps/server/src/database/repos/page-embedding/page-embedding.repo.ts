import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '../../types/kysely.types';
import { sql } from 'kysely';

export interface InsertEmbeddingRow {
  pageId: string;
  spaceId: string;
  workspaceId: string;
  attachmentId?: string | null;
  modelName: string;
  modelDimensions: number;
  embedding: number[];
  chunkIndex?: number;
  chunkStart?: number;
  chunkLength?: number;
  metadata?: unknown;
}

export function toVectorLiteral(vec: number[]): string {
  return '[' + vec.join(',') + ']';
}

@Injectable()
export class PageEmbeddingRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async insertEmbeddings(rows: InsertEmbeddingRow[]): Promise<void> {
    if (!rows.length) {
      return;
    }
    const values = rows.map((r) => ({
      pageId: r.pageId,
      spaceId: r.spaceId,
      workspaceId: r.workspaceId,
      attachmentId: r.attachmentId ?? null,
      modelName: r.modelName,
      modelDimensions: r.modelDimensions,
      embedding: sql`${sql.raw(toVectorLiteral(r.embedding))}::vector`,
      chunkIndex: r.chunkIndex ?? 0,
      chunkStart: r.chunkStart ?? 0,
      chunkLength: r.chunkLength ?? 0,
      metadata: (r.metadata ?? null) as unknown,
    }));

    await this.db.insertInto('pageEmbeddings').values(values as never).execute();
  }

  async deleteByPageIds(pageIds: string[]): Promise<void> {
    if (!pageIds.length) {
      return;
    }
    await this.db
      .deleteFrom('pageEmbeddings')
      .where('pageId', 'in', pageIds)
      .execute();
  }

  async deleteByWorkspace(workspaceId: string): Promise<void> {
    await this.db
      .deleteFrom('pageEmbeddings')
      .where('workspaceId', '=', workspaceId)
      .execute();
  }

  async vectorSearch(
    workspaceId: string,
    queryVec: number[],
    opts?: { limit?: number; spaceId?: string },
  ): Promise<Array<{ pageId: string; distance: number }>> {
    const limit = opts?.limit ?? 20;
    const params: unknown[] = [workspaceId, toVectorLiteral(queryVec)];
    let sqlText = `select page_id as "pageId", (embedding <=> $2::vector) as distance from page_embeddings where workspace_id = $1 and deleted_at is null`;

    if (opts?.spaceId) {
      params.push(opts.spaceId);
      sqlText += ` and space_id = $${params.length}`;
    }
    sqlText += ` order by distance asc limit ${limit}`;

    const compiled = { sql: sqlText, parameters: params } as never;
    const { rows } = await this.db.executeQuery(compiled);
    return rows as Array<{ pageId: string; distance: number }>;
  }
}
