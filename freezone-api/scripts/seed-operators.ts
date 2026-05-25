/**
 * Idempotent seed for three catalog operators (data-entry).
 *
 *   npx tsx scripts/seed-operators.ts
 *
 * Writes plaintext passwords once to OPERATORS_CREDENTIALS.md (gitignored).
 */
import { randomBytes } from "node:crypto";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "../src/lib/prisma";
import { hashPasswordArgon2id } from "../src/lib/password-hash";

const OPERATORS = [
  { email: "operator1@freezone-iq.com", name: "مشغّل 1" },
  { email: "operator2@freezone-iq.com", name: "مشغّل 2" },
  { email: "operator3@freezone-iq.com", name: "مشغّل 3" },
] as const;

const CREDENTIALS_PATH = resolve(process.cwd(), "OPERATORS_CREDENTIALS.md");

function randomPassword(): string {
  return randomBytes(24).toString("base64url").slice(0, 32);
}

async function main() {
  const created: { email: string; password: string }[] = [];

  for (const op of OPERATORS) {
    const existing = await prisma.adminUser.findUnique({ where: { email: op.email } });
    if (existing) {
      console.log(`✓ موجود مسبقاً: ${op.email} (${existing.role})`);
      continue;
    }
    const password = randomPassword();
    const passwordHash = await hashPasswordArgon2id(password);
    await prisma.adminUser.create({
      data: {
        email: op.email,
        name: op.name,
        passwordHash,
        role: "CATALOG_EDITOR",
        active: true,
      },
    });
    created.push({ email: op.email, password });
    console.log(`✓ أُنشئ: ${op.email}`);
  }

  if (created.length > 0) {
    const block = [
      "# Operator credentials (DO NOT COMMIT)",
      "",
      `Generated: ${new Date().toISOString()}`,
      "",
      ...created.map((c) => `- **${c.email}**: \`${c.password}\``),
      "",
      "Role: `CATALOG_EDITOR` — login at `/dashboard/login`.",
      "",
    ].join("\n");
    const prev = existsSync(CREDENTIALS_PATH) ? readFileSync(CREDENTIALS_PATH, "utf8") : "";
    writeFileSync(CREDENTIALS_PATH, prev ? `${prev.trimEnd()}\n\n${block}` : block);
    console.log(`\nكلمات السر الجديدة في: ${CREDENTIALS_PATH}`);
  } else {
    console.log("\nلا حسابات جديدة — لم يُحدَّث ملف كلمات السر.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
