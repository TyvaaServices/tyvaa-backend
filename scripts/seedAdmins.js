// Usage: node scripts/seedAdmins.js
require("dotenv").config();
const { Admin } = require("../src/config/index");

// List of admin emails to prefill
defaultAdmins = [
  "cheikh.traore@tyvaa.live",
  "houleymatou.diallo@tyvaa.live",
  // Add more admin emails as needed
];

async function seedAdmins() {
  for (const email of defaultAdmins) {
    const existing = await Admin.findOne({ where: { email } });
    if (!existing) {
      await Admin.create({ email });
      console.log(`Created admin: ${email}`);
    } else {
      console.log(`Admin already exists: ${email}`);
    }
  }
  process.exit(0);
}

seedAdmins().catch((err) => {
  console.error("Error seeding admins:", err);
  process.exit(1);
});
