const { Resolver } = require("node:dns").promises;
const dns = new Resolver({ timeout: 3000, tries: 1 });

function normalizeStudentEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidStudentEmail(value) {
  const email = normalizeStudentEmail(value);
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+$/.test(email)) return false;
  const [local, domain] = email.split("@");
  if (!local || local.length > 64 || local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;
  const labels = domain.split(".");
  return labels.length >= 2 && labels.every(label => label.length > 0 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)) && /^[a-z]{2,63}$/.test(labels.at(-1));
}

async function hasMailDomain(value) {
  if (!isValidStudentEmail(value)) return false;
  const domain = normalizeStudentEmail(value).split("@")[1];
  try {
    const records = await dns.resolveMx(domain);
    if (records.length) return records.some(record => record.exchange && record.exchange !== ".");
  } catch (error) {
    if (!["ENODATA", "ENOTFOUND", "ENOTIMP"].includes(error.code)) throw error;
  }
  try { return (await dns.resolve4(domain)).length > 0; }
  catch (error) {
    if (["ENODATA", "ENOTFOUND", "ENOTIMP"].includes(error.code)) return false;
    throw error;
  }
}

module.exports = { normalizeStudentEmail, isValidStudentEmail, hasMailDomain };
