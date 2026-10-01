const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const User = require("../model/User");
const Credential = require("../model/PasswordCredential");
const Session = require("../model/AuthSession");
const email = require("../config/EmailTransporter");
let sent;
email.getEmailTransporter = () => ({});
email.sendEmail = async payload => { sent = payload; return {}; };
const controller = require("../controller/StudentPasswordReset");
function response() { return { code: 200, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; }, clearCookie() {} }; }
test("registered email gets a real link; reset consumes token, hashes password and revokes sessions", async () => {
  process.env.FE_URL = "https://gradeup.example";
  process.env.BCRYPT_COST = "4";
  const user = { _id: "student", email: "student@example.com" };
  let stored; let changed; let revoked = false;
  User.findOne = async query => { if (query.normalizedEmail) assert.equal(query.normalizedEmail, user.email); return user; };
  Credential.findOne = async query => query.userId ? { _id: "credential" } : stored && query.resetTokenHash === stored.resetTokenHash ? { userId: user._id, passwordHash: await require("bcrypt").hash("Previous-password-123", 4) } : null;
  Credential.updateOne = async (_query, update) => { stored = update.$set; };
  Credential.findOneAndUpdate = async (query, update) => {
    if (!stored || stored.resetTokenHash !== query.resetTokenHash) return null;
    assert.ok(query.resetExpiresAt.$gt instanceof Date);
    stored = null; changed = update.$set; return { userId: user._id };
  };
  Session.updateMany = async query => { assert.equal(query.userId, user._id); revoked = true; };
  let res = response();
  await controller.forgot({ body: { email: " Student@Example.COM " } }, res);
  assert.equal(res.code, 200);
  const link = sent.text.match(/https:\/\/\S+/)[0];
  const token = new URL(link).searchParams.get("token");
  assert.equal(stored.resetTokenHash, crypto.createHash("sha256").update(token).digest("hex"));
  assert.ok(stored.resetExpiresAt > new Date());
  res = response(); await controller.reset({ body: { token, newPassword: "New-password-123" } }, res);
  assert.equal(res.code, 200); assert.ok(revoked);
  assert.ok(await require("../services/studentPassword").verifyPassword("New-password-123", changed.passwordHash));
  res = response(); await controller.reset({ body: { token, newPassword: "New-password-456" } }, res);
  assert.equal(res.code, 400);
});
test("unknown email returns a generic response without sending email", async () => {
  sent = null; User.findOne = async () => null;
  const res = response(); await controller.forgot({ body: { email: "unknown@example.com" } }, res);
  assert.equal(res.code, 200); assert.equal(sent, null);
});
test("malformed reset tokens and invalid email are rejected", async () => {
  let res = response(); await controller.reset({ body: { token: "mock-reset-token-123", newPassword: "password123" } }, res);
  assert.equal(res.code, 400);
  res = response(); await controller.forgot({ body: { email: "invalid" } }, res);
  assert.equal(res.code, 400);
});
test("new password policy accepts long passphrases and rejects predictable passwords", async () => {
  const policy = require("../services/studentPassword");
  assert.match(policy.validateNewPassword("too-short"), /15/);
  assert.match(policy.validateNewPassword("password123456789"), /predictable/);
  assert.equal(policy.validateNewPassword("A long passphrase with spaces and no mandatory digits"), null);
  const long = "🌱 A very long unique passphrase ".repeat(5);
  assert.equal(policy.validateNewPassword(long), null);
  const hash = await policy.hashPassword(long);
  assert.equal(await policy.verifyPassword(long, hash), true);
  assert.equal(await policy.verifyPassword(long + "x", hash), false);
  const legacy = await require("bcrypt").hash("legacy-pass", 4);
  assert.equal(await policy.verifyPassword("legacy-pass", legacy), true);
});
test("reset rejects the current password without using the reset link", async () => {
  const token = "a".repeat(64);
  const password = "My current password is long";
  const hash = await require("bcrypt").hash(password, 4);
  User.findOne = async () => ({ _id: "student" });
  Credential.findOne = async () => ({ userId: "student", passwordHash: hash });
  Credential.findOneAndUpdate = async () => { throw new Error("Reset token should remain available"); };
  const res = response();
  await controller.reset({ body: { token, newPassword: password } }, res);
  assert.equal(res.code, 400);
  assert.match(res.body.message, /different/);
});
