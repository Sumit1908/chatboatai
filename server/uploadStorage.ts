import { randomUUID } from "crypto";
import { storage } from "./storage";
import * as objectStorage from "./objectStorage";

// Header media (template samples and per-send attachments) is served at the
// same /uploads/db/<id> URL prefix regardless of where the bytes actually
// live - a database row (legacy, or R2 unconfigured/unreachable) or object
// storage (R2, once configured - see objectStorage.ts). Every persisted
// mediaUrl string (template components, conversation messages, notification
// header overrides) stays valid across that switch since the URL shape
// never changes; only the `storageKey` column on the row says where the
// bytes are. New uploads try R2 first when configured and fall back to the
// database on any error, so a botched migration or an R2 outage can never
// block a customer from uploading media or sending a campaign.
const DB_UPLOAD_PREFIX = "/uploads/db/";

export function isDbUploadUrl(mediaUrl: string): boolean {
  return mediaUrl.startsWith(DB_UPLOAD_PREFIX);
}

export function dbUploadUrl(id: string): string {
  return `${DB_UPLOAD_PREFIX}${id}`;
}

function dbUploadIdFromUrl(mediaUrl: string): string | null {
  return isDbUploadUrl(mediaUrl) ? mediaUrl.slice(DB_UPLOAD_PREFIX.length) : null;
}

export async function saveUploadedMedia(params: {
  buffer: Buffer;
  mimeType: string;
  originalName?: string;
  userId?: string;
  phoneNumberId?: string | null;
}): Promise<{ id: string; url: string }> {
  if (objectStorage.isR2Configured()) {
    try {
      const id = randomUUID();
      const key = objectStorage.objectKeyForId(id);
      await objectStorage.uploadObject({ key, buffer: params.buffer, mimeType: params.mimeType });
      const row = await storage.saveUploadedFile({
        id,
        userId: params.userId,
        phoneNumberId: params.phoneNumberId || undefined,
        originalName: params.originalName,
        mimeType: params.mimeType,
        size: params.buffer.length,
        storageKey: key,
      });
      return { id: row.id, url: dbUploadUrl(row.id) };
    } catch (err: any) {
      console.error("[uploadStorage] R2 upload failed, falling back to database storage:", err.message);
    }
  }

  const row = await storage.saveUploadedFile({
    userId: params.userId,
    phoneNumberId: params.phoneNumberId || undefined,
    originalName: params.originalName,
    mimeType: params.mimeType,
    size: params.buffer.length,
    data: params.buffer.toString("base64"),
  });
  return { id: row.id, url: dbUploadUrl(row.id) };
}

// Resolves any header media URL (R2-backed, database-backed, or legacy
// local-disk path from before the original database-storage fix) back to
// raw bytes, or null if it's not resolvable.
export async function getUploadedMediaBuffer(
  mediaUrl: string
): Promise<{ buffer: Buffer; mimeType: string; originalName: string | null } | null> {
  const id = dbUploadIdFromUrl(mediaUrl);
  if (!id) return null;
  const row = await storage.getUploadedFile(id);
  if (!row) return null;
  if (row.storageKey) {
    const buffer = await objectStorage.getObjectBuffer(row.storageKey);
    return { buffer, mimeType: row.mimeType, originalName: row.originalName };
  }
  if (!row.data) return null;
  return { buffer: Buffer.from(row.data, "base64"), mimeType: row.mimeType, originalName: row.originalName };
}

export async function deleteUploadedMedia(mediaUrl: string): Promise<boolean> {
  const id = dbUploadIdFromUrl(mediaUrl);
  if (!id) return false;
  const row = await storage.getUploadedFile(id);
  if (row?.storageKey) {
    // Delete the object before the row, so if this fails the row (and the
    // ability to retry the delete) is still there instead of leaving an
    // orphaned object in the bucket with nothing pointing at it.
    await objectStorage.deleteObject(row.storageKey);
  }
  return storage.deleteUploadedFile(id);
}

// Looks up who uploaded a file, straight from the database row - not an
// in-memory cache. An in-memory map of every upload's owner grows forever
// for the life of the process (never freed until restart) and resets on
// every deploy/restart anyway, which silently disabled the ownership check
// for any file uploaded before the last restart. Returns undefined for
// URLs that aren't database-backed uploads (legacy local-disk paths, which
// have no ownership record to check), null if the row doesn't exist.
export async function getUploadedMediaOwner(mediaUrl: string): Promise<string | null | undefined> {
  const id = dbUploadIdFromUrl(mediaUrl);
  if (!id) return undefined;
  const row = await storage.getUploadedFile(id);
  return row ? row.userId ?? null : null;
}
