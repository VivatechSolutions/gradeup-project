const { test } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const AuthSession = require("../model/AuthSession");
const User = require("../model/User");
const { rotateRefresh, setAuthCookies } = require("../services/studentAuthService");

test("simultaneous refreshes rotate once and leave the winning refresh cookie intact", async () => {
  const oldSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "test-only-signing-secret";
  const originals = {
    claim: AuthSession.findOneAndUpdate,
    find: AuthSession.findOne,
    create: AuthSession.create,
    update: AuthSession.updateMany,
    user: User.findById,
  };
  const initial = { userId: "student", familyId: "family", status: "active", expiresAt: new Date(Date.now() + 60000), absoluteExpiresAt: new Date(Date.now() + 120000) };
  const user = { _id: { toString: () => "student" }, role: "student", status: "active", deletedAt: null };
  const created = []; let revoked = false;
  AuthSession.findOneAndUpdate = async (_filter, update) => {
    if (initial.status !== "active") return null;
    initial.status = "rotated"; initial.lastUsedAt = update.$set.lastUsedAt;
    return { ...initial };
  };
  AuthSession.findOne = async () => initial;
  AuthSession.create = async value => { created.push(value); return value; };
  AuthSession.updateMany = async () => { revoked = true; };
  User.findById = async () => user;
  const request = { headers: { cookie: "gradeup_refresh=shared-token" }, ip: "127.0.0.1", get: () => "test" };
  try {
    const [first, second] = await Promise.all([rotateRefresh(request), rotateRefresh(request)]);
    assert.equal(created.length, 1);
    assert.equal(revoked, false);
    assert.ok(first.tokens.refreshToken);
    assert.equal(second.tokens.refreshToken, undefined);
    assert.ok(jwt.verify(first.tokens.accessToken, process.env.JWT_SECRET));
    assert.ok(jwt.verify(second.tokens.accessToken, process.env.JWT_SECRET));
    const cookies = [];
    setAuthCookies({ cookie: (...args) => cookies.push(args) }, second.tokens);
    assert.deepEqual(cookies.map(item => item[0]), ["gradeup_access"]);
  } finally {
    AuthSession.findOneAndUpdate = originals.claim; AuthSession.findOne = originals.find;
    AuthSession.create = originals.create; AuthSession.updateMany = originals.update;
    User.findById = originals.user;
    if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret;
  }
});
