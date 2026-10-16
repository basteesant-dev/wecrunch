import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { BRAND } from "@/brand";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  // DATABASE_URL is the pooled URL the Vercel Neon integration adds to this (WeCrunch-only) project.
  const connectionString = process.env[BRAND.databaseEnv] || process.env.DATABASE_URL;
  if (!connectionString) throw new Error(`${BRAND.databaseEnv} (or DATABASE_URL) is not set`);
  const adapter = new PrismaPg({ connectionString, max: Number(process.env.DB_POOL_MAX || 10) });
  return new PrismaClient({ adapter });
}

// One client per process; reused across hot reloads in development.
export const db = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
