import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('api_keys')
    .addColumn('key_hash', 'text', (col) => col.notNull())
    .addColumn('key_prefix', 'text', (col) => col.notNull())
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('api_keys')
    .dropColumn('key_hash')
    .dropColumn('key_prefix')
    .execute();
}
