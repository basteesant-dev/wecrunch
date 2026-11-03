import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { del, put } from "@vercel/blob";

// Media storage. "local" writes to disk and is served by /media/[...key]
// (development only). "blob" is Vercel Blob. "supabase" uses the
// Supabase Storage S3-compatible API from the server.
export type StorageDriver = {
  name: "local" | "blob" | "supabase";
  put(key: string, body: Buffer, contentType: string): Promise<string>; // returns public URL
  remove(key: string): Promise<void>;
};

function localRoot() {
  return path.resolve(/* turbopackIgnore: true */ process.env.LOCAL_UPLOAD_DIR || "./storage/uploads");
}

/** Resolves a key inside the upload root, rejecting traversal. */
export function localPath(key: string) {
  const root = localRoot();
  const full = path.resolve(root, key);
  if (!full.startsWith(root + path.sep)) throw new Error("Invalid media key");
  return full;
}

const local: StorageDriver = {
  name: "local",
  async put(key, body) {
    const file = localPath(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
    return `/media/${key}`;
  },
  async remove(key) {
    await rm(localPath(key), { force: true });
  },
};

function blob(): StorageDriver {
  // Read automatically by @vercel/blob; set when a Blob store is connected to the Vercel project.
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Blob storage selected but BLOB_READ_WRITE_TOKEN is missing");
  const prefix = process.env.BLOB_PREFIX ?? "wecrunch/";
  return {
    name: "blob",
    async put(key, body, contentType) {
      // Keys already carry a random segment, so Blob must not add its own suffix.
      const res = await put(prefix + key, body, { access: "public", contentType, addRandomSuffix: false, cacheControlMaxAge: 31536000 });
      return res.url;
    },
    async remove(key) {
      await del(prefix + key);
    },
  };
}

function supabase(): StorageDriver {
  const baseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)?.replace(/\/+$/, "");
  const endpoint = process.env.SUPABASE_S3_ENDPOINT || (baseUrl ? baseUrl.replace(".supabase.co", ".storage.supabase.co") + "/storage/v1/s3" : "");
  const region = process.env.SUPABASE_S3_REGION || "eu-central-1";
  const accessKeyId = process.env.SUPABASE_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.SUPABASE_S3_SECRET_ACCESS_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "wecrunch";
  if (!baseUrl) throw new Error("Supabase storage selected but SUPABASE_URL is missing");
  if (!endpoint) throw new Error("Supabase storage selected but SUPABASE_S3_ENDPOINT is missing");
  if ((!accessKeyId || !secretAccessKey) && !serviceRoleKey) throw new Error("Supabase storage selected but S3 or service-role credentials are missing");

  const client = accessKeyId && secretAccessKey ? new S3Client({
    forcePathStyle: true,
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  }) : null;
  const objectPath = (key: string) => key.split("/").map(encodeURIComponent).join("/");
  const publicUrl = (key: string) => `${baseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${objectPath(key)}`;
  const restUrl = `${baseUrl}/storage/v1/object`;
  const restHeaders: Record<string, string> = serviceRoleKey ? { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey } : {};

  return {
    name: "supabase",
    async put(key, body, contentType) {
      if (client) {
        await client.send(new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          CacheControl: "public,max-age=31536000,immutable",
        }));
      } else {
        const response = await fetch(`${restUrl}/${encodeURIComponent(bucket)}/${objectPath(key)}`, {
          method: "POST",
          headers: { ...restHeaders, "Content-Type": contentType, "cache-control": "public,max-age=31536000,immutable", "x-upsert": "true" },
          body: new Uint8Array(body),
        });
        if (!response.ok) throw new Error(`Supabase Storage upload failed (${response.status})`);
      }
      return publicUrl(key);
    },
    async remove(key) {
      if (client) {
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      } else {
        const response = await fetch(`${restUrl}/remove/${encodeURIComponent(bucket)}`, {
          method: "POST",
          headers: { ...restHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ prefixes: [key] }),
        });
        if (!response.ok) throw new Error(`Supabase Storage delete failed (${response.status})`);
      }
    },
  };
}

export function storage(): StorageDriver {
  if (process.env.STORAGE_DRIVER === "blob") return blob();
  if (process.env.STORAGE_DRIVER === "supabase") return supabase();
  return local;
}

export async function readLocal(key: string) {
  return readFile(/* turbopackIgnore: true */ localPath(key));
}
