import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, put } from "@vercel/blob";

// Media storage. "local" writes to disk and is served by /media/[...key]
// (development only). "blob" is Vercel Blob, for deployments on Vercel.
export type StorageDriver = {
  name: "local" | "blob";
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

export function storage(): StorageDriver {
  return process.env.STORAGE_DRIVER === "blob" ? blob() : local;
}

export async function readLocal(key: string) {
  return readFile(/* turbopackIgnore: true */ localPath(key));
}
