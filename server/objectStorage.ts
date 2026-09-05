import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import type { Readable } from "stream";

// Cloudflare R2 storage for uploaded media (template header images/videos/
// PDFs, campaign attachments). R2 speaks the S3 API, so the AWS SDK works
// against it unmodified - just point `endpoint` at Cloudflare's R2 gateway
// instead of AWS's. See uploadStorage.ts for how this fits into the
// read/write path: R2 is used for new uploads only when fully configured,
// with an automatic fallback to the legacy Postgres-blob path if R2 is
// unreachable or unconfigured, so a botched migration can never block a
// customer from uploading media or sending a campaign.

let client: S3Client | null = null;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

// Cheap to call on every request - checked before every write to decide
// whether to attempt R2 at all, so it must not itself throw.
export function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.UPLOAD_STORAGE_BACKEND !== "postgres"
  );
}

function getClient(): S3Client {
  if (client) return client;
  const accountId = requiredEnv("R2_ACCOUNT_ID");
  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
  return client;
}

function getBucket(): string {
  return requiredEnv("R2_BUCKET_NAME");
}

export function objectKeyForId(id: string): string {
  return `uploads/${id}`;
}

export async function uploadObject(params: {
  key: string;
  buffer: Buffer;
  mimeType: string;
}): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: params.key,
      Body: params.buffer,
      ContentType: params.mimeType,
    }),
  );
}

// Buffers the whole object into memory - use for callers that need to hand
// the raw bytes to another API (e.g. Meta's media upload endpoint), where
// there's no way to stream through anyway.
export async function getObjectBuffer(key: string): Promise<Buffer> {
  const result = await getClient().send(
    new GetObjectCommand({ Bucket: getBucket(), Key: key }),
  );
  const bytes = await result.Body?.transformToByteArray();
  if (!bytes) throw new Error(`Object ${key} has no body`);
  return Buffer.from(bytes);
}

// True streaming variant for the HTTP-serving hot path (GET /uploads/db/:id)
// so the server pipes bytes straight through instead of buffering the whole
// file before responding.
export async function getObjectStream(
  key: string,
): Promise<{ stream: Readable; contentType?: string; contentLength?: number }> {
  const result = await getClient().send(
    new GetObjectCommand({ Bucket: getBucket(), Key: key }),
  );
  if (!result.Body) throw new Error(`Object ${key} has no body`);
  return {
    stream: result.Body as Readable,
    contentType: result.ContentType,
    contentLength: result.ContentLength,
  };
}

export async function deleteObject(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: getBucket(), Key: key }),
  );
}

// Used by the backfill script to verify a write landed before it marks the
// row migrated and (later, in a separate pass) clears the base64 fallback.
export async function objectExists(key: string): Promise<boolean> {
  try {
    await getClient().send(
      new HeadObjectCommand({ Bucket: getBucket(), Key: key }),
    );
    return true;
  } catch {
    return false;
  }
}
