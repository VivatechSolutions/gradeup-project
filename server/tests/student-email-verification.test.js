const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const User = require("../model/User");
const StudentProfile = require("../model/StudentProfile");
const mail = require("../config/EmailTransporter");
const { isValidStudentEmail, hasMailDomain } = require("../utils/studentEmail");
const { Resolver } = require("node:dns").promises;

let sent;
mail.getEmailTransporter = () => ({});
mail.sendEmail = async payload => { sent = payload; return {}; };
const verification = require("../services/studentEmailVerificationService");

test("email syntax accepts short local part and rejects malformed address", () => {
  assert.equal(isValidStudentEmail("S@gmail.com"), true);
  assert.equal(isValidStudentEmail("bad@x"), false);
  assert.equal(isValidStudentEmail("a@domain..com"), false);
});

test("an email domain without mail records is rejected", async () => {
  const oldMx = Resolver.prototype.resolveMx;
  const oldA = Resolver.prototype.resolve4;
  const missing = Object.assign(new Error("not found"), { code: "ENOTFOUND" });
  Resolver.prototype.resolveMx = async () => { throw missing; };
  Resolver.prototype.resolve4 = async () => { throw missing; };
  try { assert.equal(await hasMailDomain("vjhvd@bndsvhv.ijbnds"), false); }
  finally { Resolver.prototype.resolveMx = oldMx; Resolver.prototype.resolve4 = oldA; }
});

test("verification link uses a hashed, expiring, single-use token", async () => {
  process.env.FE_URL = "https://gradeup.example";
  const user = { _id: "student", email: "student@example.com", firstName: "Student", status: "pending" };
  let stored;
  User.findOneAndUpdate = async (filter, update) => {
    if (filter._id) { stored = update.$set; return user; }
    if (filter.emailVerificationTokenHash !== stored.emailVerificationTokenHash || stored.status === "active") return null;
    assert.ok(filter.emailVerificationExpiresAt.$gt instanceof Date);
    stored = { ...stored, ...update.$set };
    return user;
  };
  User.findOne = () => ({ select: async () => stored && ({ ...user, ...stored }) });
  StudentProfile.findOne = () => ({ lean: async () => null });
  const accepted = await verification.sendVerification(user);
  assert.equal(accepted, true);
  assert.match(sent.html, /Verify Email/);
  const token = new URL(sent.text.match(/https:\/\/\S+/)[0]).searchParams.get("token");
  assert.equal(stored.emailVerificationTokenHash, crypto.createHash("sha256").update(token).digest("hex"));
  assert.ok(stored.emailVerificationExpiresAt > new Date());
  assert.equal(await verification.verifyStudentEmail(token), "verified");
  assert.equal(stored.status, "active");
  assert.equal(await verification.verifyStudentEmail(token), "already_verified");
});

test("password signup stays pending and does not create an auth session", async () => {
  const oldResolveMx = Resolver.prototype.resolveMx;
  Resolver.prototype.resolveMx = async () => [{ exchange: "mail.example.com", priority: 10 }];
  try {
    const Credential = require("../model/PasswordCredential");
    const Profile = require("../model/StudentProfile");
    const Rewards = require("../model/RewardAccount");
    const Session = require("../model/AuthSession");
    const auth = require("../services/studentAuthService");
    User.findOne = async () => null;
    User.create = async payload => ({ _id: "new-student", ...payload });
    User.findOneAndUpdate = async (_filter, _update) => ({ _id: "new-student" });
    Credential.create = async () => ({});
    Profile.create = async () => ({ _id: "profile" });
    Rewards.create = async () => ({});
    Session.create = async () => { throw new Error("Session should not be created before verification"); };
    const result = await auth.registerIndependentStudent({ email: "S@gmail.com", password: "long-password-for-student",
      firstName: "S", lastName: "Learner", schoolName: "School", board: "CBSE", classNumber: "10" }, {});
    assert.equal(result.user.status, "pending");
    assert.equal(result.tokens, undefined);
  } finally {
    Resolver.prototype.resolveMx = oldResolveMx;
  }
});
