import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const N = 2 ** 15;
const R = 8;
const P = 1;
const KEYLEN = 64;

// Format: scrypt$N$r$p$saltB64$hashB64
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEYLEN, { N, r: R, p: P, maxmem: 128 * N * R * 2 });
  return ["scrypt", N, R, P, salt.toString("base64"), hash.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string) {
  const [alg, n, r, p, saltB64, hashB64] = stored.split("$");
  if (alg !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scryptAsync(password, Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 128 * Number(n) * Number(r) * 2,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

function appSecret() {
  const secret = process.env.APP_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("APP_SECRET must be set (32+ chars)");
    return "development-only-secret-do-not-use-in-production";
  }
  return secret;
}

// Visitor IPs are only stored/compared as keyed hashes.
export function hashIp(ip: string | null | undefined) {
  if (!ip) return null;
  return createHmac("sha256", appSecret()).update(ip).digest("hex").slice(0, 32);
}

export function passwordProblems(password: string) {
  const problems: string[] = [];
  if (password.length < 12) problems.push("at least 12 characters");
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) problems.push("upper and lower case letters");
  if (!/\d/.test(password)) problems.push("a number");
  return problems;
}
