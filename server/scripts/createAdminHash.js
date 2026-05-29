const bcrypt = require("bcrypt");

async function main() {
  const password = process.argv[2];

  if (!password) {
    console.error("Usage: node scripts/createAdminHash.js <plain-text-password>");
    process.exit(1);
  }

  const saltRounds = Number(process.env.ADMIN_BCRYPT_ROUNDS || 10);
  const passwordHash = await bcrypt.hash(password, saltRounds);

  console.log(JSON.stringify({ password, passwordHash }, null, 2));
}

main().catch((error) => {
  console.error("Failed to generate admin password hash");
  console.error(error);
  process.exit(1);
});
