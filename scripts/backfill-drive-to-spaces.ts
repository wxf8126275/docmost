// Requirement: cloud-drive (docs/requirements/2026-10-19-cloud-drive.md)
// Task: 2 (batch-backfill-drive) — CLI runner.
// Usage: tsx scripts/backfill-drive-to-spaces.ts [--dry-run] [--verify]
import * as dotenv from 'dotenv';
import { Kysely } from 'kysely';
import { PostgresJSDialect } from 'kysely-postgres-js';
import postgres from 'postgres';
import { envPath, normalizePostgresUrl } from '../apps/server/src/common/helpers';
import { applyBackfill } from '../apps/server/src/database/backfill/drive-to-spaces';

dotenv.config({ path: envPath });

const db = new Kysely<any>({
  dialect: new PostgresJSDialect({
    postgres: postgres(normalizePostgresUrl(process.env.DATABASE_URL)),
  }),
});

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verify = args.includes('--verify');
  const result = await applyBackfill(db, { dryRun, verify });
  console.log(JSON.stringify(result, null, 2));
  await db.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
