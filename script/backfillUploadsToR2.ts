import "dotenv/config";
import { storage } from "../server/storage";
import * as objectStorage from "../server/objectStorage";

// One-time migration of legacy uploaded_files rows (bytes stored as base64
// in Postgres) to Cloudflare R2. Safe to stop and re-run at any point -
// progress is tracked in the database itself (storage_key / data columns),
// not a separate checkpoint file.
//
// Usage:
//   tsx script/backfillUploadsToR2.ts --dry-run          # Phase A, no writes
//   tsx script/backfillUploadsToR2.ts                    # Phase A, for real
//   tsx script/backfillUploadsToR2.ts --phase=clear --dry-run
//   tsx script/backfillUploadsToR2.ts --phase=clear       # Phase B, for real
//
// Phase A (copy, default): uploads each legacy row's bytes to R2, verifies
// the object landed, then sets storage_key. Leaves `data` untouched as a
// fallback, so nothing is at risk if a migrated row's R2 read ever fails.
//
// Phase B (clear): run manually, only after Phase A has been stable in
// production for a while (recommended 1-2 weeks). Clears `data` for rows
// with a verified storage_key, which is what actually shrinks the table.
// This is deliberately a separate, manual step - never auto-chained after
// Phase A.

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(): { dryRun: boolean; phase: "copy" | "clear" } {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const phaseArg = args.find((a) => a.startsWith("--phase="));
  const phase = phaseArg ? phaseArg.slice("--phase=".length) : "copy";
  if (phase !== "copy" && phase !== "clear") {
    throw new Error(`Unknown --phase value "${phase}". Use "copy" or "clear".`);
  }
  return { dryRun, phase };
}

async function runCopyPhase(dryRun: boolean): Promise<void> {
  if (!objectStorage.isR2Configured()) {
    throw new Error(
      "R2 is not configured. Set R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET_NAME " +
        "(and make sure UPLOAD_STORAGE_BACKEND isn't set to \"postgres\") before running the backfill.",
    );
  }

  let afterId: string | undefined;
  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (;;) {
    const batch = await storage.listUploadedFilesMissingStorageKey({ limit: BATCH_SIZE, afterId });
    if (batch.length === 0) break;

    for (const row of batch) {
      afterId = row.id;

      if (!row.data) {
        console.warn(`[backfill] ${row.id} has no data and no storageKey - nothing to migrate, skipping.`);
        skipped++;
        continue;
      }

      const key = objectStorage.objectKeyForId(row.id);
      const label = `${row.id} (${row.originalName || row.mimeType}, ${row.size} bytes)`;

      if (dryRun) {
        migrated++;
        continue;
      }

      try {
        const buffer = Buffer.from(row.data, "base64");
        await objectStorage.uploadObject({ key, buffer, mimeType: row.mimeType });

        const landed = await objectStorage.objectExists(key);
        if (!landed) throw new Error("object not found in R2 immediately after upload");

        await storage.setUploadedFileStorageKey(row.id, key);
        migrated++;
      } catch (err: any) {
        failed++;
      }
    }

    await sleep(BATCH_DELAY_MS);
  }

  if (failed > 0) {
    console.log("[backfill] Re-run the same command to retry failed rows - progress is resumable.");
  }
}

async function runClearPhase(dryRun: boolean): Promise<void> {
  let afterId: string | undefined;
  let cleared = 0;

  for (;;) {
    const batch = await storage.listUploadedFilesReadyToClear({ limit: BATCH_SIZE, afterId });
    if (batch.length === 0) break;

    for (const row of batch) {
      afterId = row.id;
      if (dryRun) {
        console.log(`[backfill] [dry-run] would clear legacy data for ${row.id}`);
      } else {
        await storage.clearUploadedFileData(row.id);
      }
      cleared++;
    }

    await sleep(BATCH_DELAY_MS);
  }

}

async function main() {
  const { dryRun, phase } = parseArgs();

  if (phase === "copy") {
    await runCopyPhase(dryRun);
  } else {
    await runClearPhase(dryRun);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[backfill] Fatal error:", err);
    process.exit(1);
  });
