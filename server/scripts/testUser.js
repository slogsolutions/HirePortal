const bcrypt = require("bcryptjs");

async function seedTestUser() {
  if (process.env.NODE_ENV !== "test") return;

  const email = "login@test.com";
  const password = "123456";

  await User.deleteMany({ email });

  const hash = await bcrypt.hash(password, 10);

  await User.create({
    name: "E2E User",
    email,
    password: hash,   // 🔥 MUST be hashed
    role: "admin",
  });

  console.log("🧪 E2E user seeded with hashed password");
}
