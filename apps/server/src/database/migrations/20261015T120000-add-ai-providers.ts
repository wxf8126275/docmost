import { Kysely, sql } from 'kysely';

/**
 * Adds the `ai_providers` table so workspace admins can manage AI service
 * providers (driver, encrypted api key, base url, models) from the settings UI
 * instead of relying solely on server environment variables.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('ai_providers')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('workspace_id', 'uuid', (col) =>
      col.notNull().references('workspaces.id').onDelete('cascade'),
    )
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('driver', 'text', (col) => col.notNull())
    .addColumn('api_key_encrypted', 'text', (col) => col)
    .addColumn('base_url', 'text', (col) => col)
    .addColumn('completion_model', 'text', (col) => col.notNull())
    .addColumn('embedding_model', 'text', (col) => col)
    .addColumn('is_default', 'boolean', (col) =>
      col.notNull().defaultTo(false),
    )
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('deleted_at', 'timestamptz', (col) => col)
    .execute();

  await db.schema
    .createIndex('ai_providers_workspace_id_idx')
    .on('ai_providers')
    .column('workspace_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('ai_providers').execute();
}
