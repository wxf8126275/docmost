import { Kysely, sql } from 'kysely';

/**
 * Cloud Drive share links (Phase 2).
 *
 * A share link grants time-boxed, token-gated access to a single drive file.
 * `permission` is 'read' (metadata/preview) or 'download' (also fetch bytes).
 * `token` is a globally unique, unguessable key used in the public share URL.
 * Expired links (`expires_at` in the past) and soft-deleted rows are rejected
 * at resolve time.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('drive_shares')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('workspace_id', 'uuid', (col) =>
      col.references('workspaces.id').onDelete('cascade').notNull(),
    )
    .addColumn('file_id', 'uuid', (col) =>
      col.references('drive_files.id').onDelete('cascade').notNull(),
    )
    .addColumn('creator_id', 'uuid', (col) =>
      col.references('users.id').onDelete('set null'),
    )
    .addColumn('token', 'varchar', (col) => col.notNull())
    .addColumn('permission', 'varchar', (col) =>
      col.notNull().defaultTo('read'),
    )
    .addColumn('expires_at', 'timestamptz', (col) => col)
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('deleted_at', 'timestamptz', (col) => col)
    .addUniqueConstraint('drive_shares_token_unique', ['token'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('drive_shares').execute();
}
