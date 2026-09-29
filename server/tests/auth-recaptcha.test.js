const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const axios = require("axios");
const { requireRecaptcha } = require("../middleware/recaptcha");
const original = axios.post;
const env = { secret: process.env.RECAPTCHA_SECRET_KEY, hosts: process.env.RECAPTCHA_ALLOWED_HOSTNAMES };
after(() => { axios.post = original; for (const [key, value] of Object.entries({ RECAPTCHA_SECRET_KEY: env.secret, RECAPTCHA_ALLOWED_HOSTNAMES: env.hosts })) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
async function run(token) {
  const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await requireRecaptcha({ body: { recaptchaToken: token } }, res, () => { res.next = true; });
  return res;
}
test("reCAPTCHA fails closed without secret or token", async () => {
  delete process.env.RECAPTCHA_SECRET_KEY;
  assert.equal((await run("token")).code, 503);
  process.env.RECAPTCHA_SECRET_KEY = "test-secret";
  assert.equal((await run("")).code, 400);
});
test("reCAPTCHA accepts Google's success only for configured host", async () => {
  process.env.RECAPTCHA_SECRET_KEY = "test-secret";
  process.env.RECAPTCHA_ALLOWED_HOSTNAMES = "gradeup.example";
  axios.post = async (url, body, options) => {
    assert.equal(url, "https://www.google.com/recaptcha/api/siteverify");
    assert.equal(new URLSearchParams(body).get("response"), "token");
    assert.equal(options.timeout, 10000);
    return { data: { success: true, hostname: "gradeup.example" } };
  };
  assert.equal((await run("token")).next, true);
  axios.post = async () => ({ data: { success: true, hostname: "other.example" } });
  assert.equal((await run("token")).code, 400);
  axios.post = async () => ({ data: { success: false, "error-codes": ["timeout-or-duplicate"] } });
  assert.equal((await run("token")).code, 400);
  axios.post = async () => { throw new Error("network"); };
  assert.equal((await run("token")).code, 503);
});
