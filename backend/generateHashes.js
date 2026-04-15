const bcrypt = require("bcrypt");

/**
 * Utility script to generate bcrypt hashes for passwords
 * Usage: node generateHashes.js
 */
const generateHashes = async () => {
  const credentials = {
    "admin@college.edu": {
      password: "admin123",
      role: "admin",
    },
    "test-faculty@college.edu": {
      password: "faculty123",
      role: "faculty",
    },
    "test-student@college.edu": {
      password: "student123",
      role: "student",
    },
  };

  console.log("═══════════════════════════════════════════════════════");
  console.log("BCRYPT HASH GENERATOR FOR LOGIN CREDENTIALS");
  console.log("═══════════════════════════════════════════════════════\n");

  for (const [email, creds] of Object.entries(credentials)) {
    try {
      const hash = await bcrypt.hash(creds.password, 10);
      console.log(`\n📧 Email:    ${email}`);
      console.log(`🔑 Password: ${creds.password}`);
      console.log(`👥 Role:     ${creds.role}`);
      console.log(`🔐 Hash:     ${hash}`);
      console.log("─────────────────────────────────────────────────────");
    } catch (error) {
      console.error(`❌ Error hashing password for ${email}:`, error.message);
    }
  }

  console.log("\n✅ Hashes generated successfully!");
  console.log("\n💡 Use these hashes in database/schema.sql INSERT statements");
  console.log("═══════════════════════════════════════════════════════\n");
};

generateHashes().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
