const { test } = require("node:test");
const assert = require("node:assert/strict");
const servicePath = require.resolve("../services/studentAuthService");
let access, refresh, profile, cookies;
require.cache[servicePath] = { id: servicePath, filename: servicePath, loaded: true, exports: {
  ACCESS_COOKIE: "gradeup_access", REFRESH_COOKIE: "gradeup_refresh",
  resolveAccessUser: async () => { if (access instanceof Error) throw access; return access; },
  rotateRefresh: async () => { if (refresh instanceof Error) throw refresh; return refresh; },
  setAuthCookies: () => { cookies = true; },
  serializeUser: async () => { if (profile instanceof Error) throw profile; return profile; },
} };
const { requireStudentAuth } = require("../middleware/studentAuth");
async function run(headers = {}) {
  const logs = []; const warn = console.warn;
  console.warn = (...args) => logs.push(args);
  const req = { headers, path: "/room/livekit-token" };
  const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  let next = false;
  try { await requireStudentAuth(req, res, () => { next = true; }); } finally { console.warn = warn; }
  return { req, res, next, logs };
}
test.beforeEach(() => { access = null; refresh = null; profile = { firstName: "Student" }; cookies = false; });
test("anonymous token requests remain protected with useful diagnostics", async () => {
  const result = await run(); assert.equal(result.res.code, 401); assert.equal(result.next, false);
  assert.equal(result.logs[0][1].reason, "credentials-missing");
});
test("valid access session reaches the controller", async () => {
  access = { _id: "student" }; const result = await run({ cookie: "gradeup_access=secret" });
  assert.equal(result.next, true); assert.equal(result.req.authUser.id, "student"); assert.equal(result.logs.length, 0);
});
test("expired access can refresh and continue", async () => {
  access = Object.assign(new Error("secret-token"), { name: "TokenExpiredError" });
  refresh = { user: { _id: "student" }, tokens: {} };
  const result = await run({ cookie: "gradeup_refresh=secret-refresh" });
  assert.equal(result.next, true); assert.equal(cookies, true);
});
test("invalid sessions log reasons without leaking credentials", async () => {
  access = Object.assign(new Error("secret-token"), { name: "JsonWebTokenError" });
  const result = await run({ cookie: "gradeup_access=secret-token; gradeup_refresh=secret-refresh" });
  assert.equal(result.res.code, 401); assert.match(result.logs[0][1].reason, /access-invalid/);
  assert.doesNotMatch(JSON.stringify(result.logs), /secret-token|secret-refresh/);
});
test("database failures are service failures rather than false expired sessions", async () => {
  access = new Error("database credentials"); const result = await run();
  assert.equal(result.res.code, 503); assert.equal(result.logs[0][1].reason, "authentication-service-error");
  assert.doesNotMatch(JSON.stringify(result), /database credentials/);
});
