const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { promisify } = require("util");

const scrypt = promisify(crypto.scrypt);
const COMMON = new Set(["password", "password123", "password1234", "password12345", "password123456789", "123456789012345", "1234567890123456", "qwertyuiopasdfgh", "iloveyou12345678", "letmein123456789", "gradeup123456789", "correcthorsebatterystaple", "abcdefghijklmnop", "adminadminadmin", "welcome123456789", "passw0rdpassw0rd"]);
const PARAMS = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
let activeDerivations = 0;
const waiting = [];
async function derive(password, salt, size) {
  if (activeDerivations >= 2) await new Promise(resolve => waiting.push(resolve));
  else activeDerivations += 1;
  try { return await scrypt(password, salt, size, PARAMS); }
  finally {
    const next = waiting.shift();
    if (next) next(); else activeDerivations -= 1;
  }
}

function validateNewPassword(password) {
  if (typeof password !== "string") return "Enter a password";
  const normalized = password.normalize("NFC");
  const length = [...normalized].length;
  if (length < 15) return "Use at least 15 characters. Spaces and symbols are welcome.";
  if (length > 1024 || Buffer.byteLength(normalized, "utf8") > 4096) return "Password is too long (maximum 1024 characters).";
  const compact = normalized.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (COMMON.has(compact) || /^(.)\1{14,}$/u.test(normalized) || /^(1234567890|qwerty){2,}/i.test(normalized)) {
    return "This password is too common or predictable. Choose a different one.";
  }
  return null;
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(32);
  const hash = await derive(password.normalize("NFC"), salt, 64);
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

async function verifyPassword(password, stored) {
  if (typeof password !== "string" || typeof stored !== "string") return false;
  if (Buffer.byteLength(password, "utf8") > 4096) return false;
  if (!stored.startsWith("scrypt$")) return bcrypt.compare(password, stored);
  const parts = stored.split("$");
  if (parts.length !== 6) return false;
  const [_, n, r, p, saltText, hashText] = parts;
  const N = Number(n), R = Number(r), P = Number(p);
  if (N !== PARAMS.N || R !== PARAMS.r || P !== PARAMS.p) return false;
  const salt = Buffer.from(saltText, "base64"), expected = Buffer.from(hashText, "base64");
  if (salt.length !== 32 || expected.length !== 64) return false;
  const actual = await derive(password.normalize("NFC"), salt, expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

module.exports = { validateNewPassword, hashPassword, verifyPassword };
