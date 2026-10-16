import { stat } from "node:fs/promises";
import { open } from "node:fs/promises";
import { localPath } from "@/lib/storage";

// Serves files from the local storage driver (development / single-server
// installs). With STORAGE_DRIVER=blob, media URLs point at Vercel Blob instead.
const TYPES: Record<string, string> = {
  jpg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif", gif: "image/gif",
  mp4: "video/mp4", webm: "video/webm", pdf: "application/pdf",
};

export async function GET(request: Request, { params }: RouteContext<"/media/[...key]">) {
  const { key } = await params;
  const type = TYPES[key.at(-1)?.split(".").pop()?.toLowerCase() ?? ""];
  if (!type || (process.env.STORAGE_DRIVER || "local") !== "local") return new Response("Not found", { status: 404 });
  let file: string;
  let size: number;
  try {
    file = localPath(key.join("/"));
    size = (await stat(file)).size;
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const headers: Record<string, string> = {
    "content-type": type,
    "cache-control": "public, max-age=31536000, immutable",
    "accept-ranges": "bytes",
    "x-content-type-options": "nosniff",
  };
  // Byte ranges are required for video seeking (and for playback at all on iOS Safari).
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  let start = 0;
  let end = size - 1;
  if (range) {
    start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start > end || start >= size) return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
  }
  const fh = await open(file);
  const length = end - start + 1;
  const buf = Buffer.alloc(length);
  await fh.read(buf, 0, length, start);
  await fh.close();
  return new Response(buf, {
    status: range ? 206 : 200,
    headers: { ...headers, "content-length": String(length), ...(range ? { "content-range": `bytes ${start}-${end}/${size}` } : {}) },
  });
}
