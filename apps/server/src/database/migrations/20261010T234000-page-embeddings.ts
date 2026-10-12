import { type Kysely, sql } from 'kysely';

/**
 * Creates the `page_embeddings` table used by AI semantic search (pgvector
 * driver). The embedding dimension is taken from AI_EMBEDDING_DIMENSION so the
 * indexed `vector(dim)` column matches the configured embedding model.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`CREATE EXTENSION IF NOT EXISTS vector`.execute(db);

  const rawDim = parseInt(process.env.AI_EMBEDDING_DIMENSION || '1536', 10);
  const dim = Number.isFinite(rawDim) && rawDim > 0 ? rawDim : 1536;

  await db.schema
    .createTable('page_embeddings')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('page_id', 'uuid', (col) =>
      col.references('pages.id').onDelete('cascade').notNull(),
    )
    .addColumn('space_id', 'uuid', (col) =>
      col.references('spaces.id').onDelete('cascade').notNull(),
    )
    .addColumn('workspace_id', 'uuid', (col) =>
      col.references('workspaces.id').onDelete('cascade').notNull(),
    )
    .addColumn('attachment_id', 'uuid', (col) => col)
    .addColumn('model_name', 'varchar', (col) => col.notNull())
    .addColumn('model_dimensions', 'integer', (col) => col.notNull())
    .addColumn('embedding', sql`vector(${sql.lit(dim)})`, (col) => col.notNull())
    .addColumn('chunk_index', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('chunk_start', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('chunk_length', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('metadata', 'jsonb', (col) => col)
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('deleted_at', 'timestamptz', (col) => col)
    .execute();

  // HNSW index for cosine similarity (pgvector >= 0.5, Postgres >= 13).
  await sql`CREATE INDEX IF NOT EXISTS idx_page_embeddings_embedding
    ON page_embeddings USING hnsw (embedding vector_cosine_ops)`.execute(db);

  await db.schema
    .createIndex('idx_page_embeddings_page')
    .ifNotExists()
    .on('page_embeddings')
    .column('page_id')
    .execute();

  await db.schema
    .createIndex('idx_page_embeddings_workspace')
    .ifNotExists()
    .on('page_embeddings')
    .columns(['workspace_id', 'deleted_at'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .dropIndex('idx_page_embeddings_workspace')
    .ifExists()
    .execute();
  await db.schema.dropIndex('idx_page_embeddings_page').ifExists().execute();
  await db.schema
    .dropIndex('idx_page_embeddings_embedding')
    .ifExists()
    .execute();
  await db.schema.dropTable('page_embeddings').ifExists().execute();
  await sql`DROP EXTENSION IF EXISTS vector`.execute(db);
}
