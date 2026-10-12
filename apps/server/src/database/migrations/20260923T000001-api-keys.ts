import { Kysely, sql } from 'kysely';

/**
 * Placeholder migration.
 *
 * The `api_keys` table was originally created by this migration in a local
 * environment under the timestamp `20260923T000001`. The migration file was
 * later renamed to `20250912T101500-api-keys.ts` in the repository, but the
 * executed record remained under the old name in `kysely_migration`, which
 * made the migrator report a "corrupted migrations" state. This no-op file
 * restores the name the database expects so the migrator stays consistent;
 * the table itself is already created by `20250912T101500-api-keys.ts`.
 */
export async function up(db: Kysely<any>): Promise<void> {
  // no-op: api_keys already exists
}

export async function down(db: Kysely<any>): Promise<void> {
  // no-op
}
