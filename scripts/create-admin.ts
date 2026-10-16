// Creates (or resets the password of) a super admin from environment variables.
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='…' npm run admin:create
// Credentials are never stored in the repository.
import "dotenv/config";
import { db } from "../src/lib/db";
import { hashPassword, passwordProblems } from "../src/lib/crypto";

export async function createAdminFromEnv({ onlyIfNone = false } = {}) {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    if (!onlyIfNone) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD");
    return;
  }
  if (onlyIfNone && (await db.adminUser.count()) > 0) return;
  const problems = passwordProblems(password);
  if (problems.length) throw new Error(`ADMIN_PASSWORD needs ${problems.join(", ")}`);
  const passwordHash = await hashPassword(password);
  await db.adminUser.upsert({
    where: { email },
    update: { passwordHash, role: "SUPER_ADMIN", isActive: true, failedLogins: 0, lockedUntil: null },
    create: { email, name: process.env.ADMIN_NAME || "Super Admin", passwordHash, role: "SUPER_ADMIN" },
  });
  console.log(`Super admin ready: ${email}`);
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/create-admin.ts")) {
  createAdminFromEnv()
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}
