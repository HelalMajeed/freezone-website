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
 *   ADMIN_PHONE=07712345678 \
 *     npx tsx prisma/seed-dashboard-superadmin.ts
 *
 * Idempotent: if the email already exists, the user is upgraded to superadmin
 * and the password is reset. `ADMIN_PHONE` (optional, Iraqi 07XXXXXXXXX) sets
 * the phone login identifier and is updated on rerun. If no env vars are set,
 * sensible defaults are used — change them on first login and rotate
 * immediately for production.
 *
 * Password env precedence (mission §3.2 / runbook naming):
 *   1. DASHBOARD_SEED_PASSWORD  — this script's original variable, always wins;
 *   2. ADMIN_PASSWORD           — mission/runbook alias, used when (1) is unset;
 *   3. built-in default         — non-production only; in production the script
 *      refuses to run unless (1) or (2) is set explicitly.
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/dashboard-auth";
import { isValidIraqiPhone, normalizeIraqiPhone } from "../src/lib/phone";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.DASHBOARD_SEED_EMAIL ?? "admin@freezone-iq.com").trim().toLowerCase();
  const name = process.env.DASHBOARD_SEED_NAME ?? "Site Owner";
  /** DASHBOARD_SEED_PASSWORD wins; ADMIN_PASSWORD (mission/runbook naming) is
   *  the fallback alias — precedence documented in the file header. */
  const passwordFromEnv = process.env.DASHBOARD_SEED_PASSWORD ?? process.env.ADMIN_PASSWORD;
  const password = passwordFromEnv ?? "ChangeMe!2026";

  /** Never provision/unlock a SUPER_ADMIN with the repo's built-in default
   *  password in production — that credential is committed in VCS and this seed
   *  also resets the password and re-activates an existing account on rerun.
   *  Require an explicit DASHBOARD_SEED_PASSWORD (or its ADMIN_PASSWORD alias)
   *  when NODE_ENV=production. */
  if (passwordFromEnv === undefined && process.env.NODE_ENV === "production") {
    console.error(
      "Refusing to seed a superadmin with the built-in default password in production. " +
        "Set DASHBOARD_SEED_PASSWORD or ADMIN_PASSWORD (and ideally DASHBOARD_SEED_EMAIL) explicitly.",
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  /** Optional phone login identifier (alternative to email at /dashboard/login). */
  const phoneRaw = process.env.ADMIN_PHONE?.trim();
  let phone: string | undefined;
  if (phoneRaw) {
    if (!isValidIraqiPhone(phoneRaw)) {
      console.error("ADMIN_PHONE must be a valid Iraqi mobile (07XXXXXXXXX).");
      process.exit(1);
    }
    phone = normalizeIraqiPhone(phoneRaw);
  }

  const passwordHash = await hashPassword(password);

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    await prisma.adminUser.update({
      where: { email },
      data: {
        passwordHash,
        role: "SUPER_ADMIN",
        active: true,
        failedLogins: 0,
        lockedUntil: null,
        name,
        ...(phone ? { phone } : {}),
      },
    });
    console.log(`✓ Upgraded existing user → superadmin: ${email}`);
  } else {
    await prisma.adminUser.create({
      data: {
        email,
        name,
        passwordHash,
        role: "SUPER_ADMIN",
        active: true,
        ...(phone ? { phone } : {}),
      },
    });
    console.log(`✓ Created superadmin: ${email}`);
  }

  console.log("");
  console.log("Login at:  /dashboard/login");
  console.log(`Email:     ${email}`);
  if (phone) console.log(`Phone:     ${phone}`);
  console.log(`Password:  ${password === "ChangeMe!2026" ? "(default — CHANGE NOW)" : "(set via env)"}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
