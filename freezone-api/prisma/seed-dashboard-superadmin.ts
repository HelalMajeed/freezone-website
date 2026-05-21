/**
 * Create the first dashboard superadmin (or upgrade an existing user).
 *
 * Usage:
 *   npx tsx prisma/seed-dashboard-superadmin.ts
 *     # uses env DASHBOARD_SEED_EMAIL, DASHBOARD_SEED_NAME, DASHBOARD_SEED_PASSWORD
 *
 *   DASHBOARD_SEED_EMAIL=admin@freezone-iq.com \
 *   DASHBOARD_SEED_NAME="Site Owner" \
 *   DASHBOARD_SEED_PASSWORD="ChangeMe!2026" \
 *     npx tsx prisma/seed-dashboard-superadmin.ts
 *
 * Idempotent: if the email already exists, the user is upgraded to superadmin
 * and the password is reset. If no env vars are set, sensible defaults are used
 * — change them on first login and rotate immediately for production.
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/dashboard-auth";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.DASHBOARD_SEED_EMAIL ?? "admin@freezone-iq.com").trim().toLowerCase();
  const name = process.env.DASHBOARD_SEED_NAME ?? "Site Owner";
  const password = process.env.DASHBOARD_SEED_PASSWORD ?? "ChangeMe!2026";

  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    await prisma.adminUser.update({
      where: { email },
      data: {
        passwordHash,
        role: "superadmin",
        active: true,
        failedLogins: 0,
        lockedUntil: null,
        name,
      },
    });
    console.log(`✓ Upgraded existing user → superadmin: ${email}`);
  } else {
    await prisma.adminUser.create({
      data: {
        email,
        name,
        passwordHash,
        role: "superadmin",
        active: true,
      },
    });
    console.log(`✓ Created superadmin: ${email}`);
  }

  console.log("");
  console.log("Login at:  /dashboard/login");
  console.log(`Email:     ${email}`);
  console.log(`Password:  ${password === "ChangeMe!2026" ? "(default — CHANGE NOW)" : "(set via env)"}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
