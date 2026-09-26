/**
 * Pre-deployment verification. Runs before the schema migration in
 * `npm start` (and on its own with `npm run verify:deploy`). Read-only: it
 * never changes the database and never prints secret values.
 *
 * Exits 1 - so the deploy stops before `drizzle-kit push` touches the
 * schema and the previous version keeps serving - when:
 *   - a required environment variable is missing (incl. FACEBOOK_APP_SECRET)
 *   - contacts_account_phone_uidx / messages_whatsapp_id_uidx are missing
 */
import "dotenv/config";
import pg from "pg";
import { REQUIRED_UNIQUE_INDEXES, checkEnvironment, checkIndexes, type IndexState } from "./deployChecks";

async function readIndexStates(databaseUrl: string): Promise<IndexState[]> {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query("BEGIN READ ONLY");
    const states: IndexState[] = [];
    for (const spec of REQUIRED_UNIQUE_INDEXES) {
      const table = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
        [spec.table],
      );
      const idx = await client.query(
        `SELECT ix.indisunique AS unique FROM pg_class i
           JOIN pg_index ix ON ix.indexrelid = i.oid
           JOIN pg_namespace n ON n.oid = i.relnamespace
          WHERE n.nspname = 'public' AND i.relname = $1`,
        [spec.index],
      );
      let duplicateGroups = 0;
      if (table.rowCount && !idx.rowCount) {
        const dup =
          spec.table === "contacts"
            ? `SELECT count(*)::int AS n FROM (SELECT 1 FROM contacts GROUP BY account_id, phone HAVING count(*) > 1) d`
            : `SELECT count(*)::int AS n FROM (SELECT 1 FROM messages WHERE whatsapp_message_id IS NOT NULL GROUP BY whatsapp_message_id HAVING count(*) > 1) d`;
        duplicateGroups = (await client.query(dup)).rows[0].n;
      }
      states.push({
        table: spec.table,
        index: spec.index,
        tableExists: !!table.rowCount,
        indexExists: !!idx.rowCount,
        indexIsUnique: !!idx.rows[0]?.unique,
        duplicateGroups,
      });
    }
    await client.query("ROLLBACK");
    return states;
  } finally {
    await client.end();
  }
}

async function main() {
  const env = checkEnvironment(process.env);
  let errors = [...env.errors];
  const warnings = [...env.warnings];

  if (process.env.DATABASE_URL) {
    try {
      const idx = checkIndexes(await readIndexStates(process.env.DATABASE_URL));
      errors = errors.concat(idx.errors);
      warnings.push(...idx.warnings);
    } catch (error) {
      errors.push(`Could not inspect the database: ${(error as Error).message}`);
    }
  }

  for (const w of warnings) console.warn(`[verify-deploy] warning: ${w}`);
  if (errors.length) {
    for (const e of errors) console.error(`[verify-deploy] ERROR: ${e}`);
    console.error(`[verify-deploy] ${errors.length} problem(s) found - stopping before the database migration. Nothing was changed.`);
    process.exit(1);
  }
  console.log("[verify-deploy] OK - environment and required indexes verified.");
}

main();
