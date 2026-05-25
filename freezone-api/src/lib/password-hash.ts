import { scrypt as scryptCb, timingSafeEqual, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import argon2 from "argon2";

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
) => Promise<Buffer>;

const SCRYPT_KEYLEN = 64;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

/** New operator accounts — memory-hard argon2id per autonomous defaults. */
export async function hashPasswordArgon2id(password: string): Promise<string> {
  if (!password || password.length < 8) throw new Error("PASSWORD_TOO_SHORT");
  const hash = await argon2.hash(password.normalize("NFKC"), {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
  return `argon2id$${hash}`;
}

/** Legacy dashboard hashes (scrypt) — still verified for existing users. */
export async function hashPasswordScrypt(password: string): Promise<string> {
  if (!password || password.length < 8) throw new Error("PASSWORD_TOO_SHORT");
  const salt = randomBytes(16);
  const derived = await scrypt(password.normalize("NFKC"), salt, SCRYPT_KEYLEN);
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("base64")}$${derived.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith("argon2id$")) {
    try {
      return await argon2.verify(stored.slice("argon2id$".length), password.normalize("NFKC"));
    } catch {
      return false;
    }
  }
  try {
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;
    const salt = Buffer.from(parts[4], "base64");
    const expected = Buffer.from(parts[5], "base64");
    const candidate = await scrypt(password.normalize("NFKC"), salt, expected.length);
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}
