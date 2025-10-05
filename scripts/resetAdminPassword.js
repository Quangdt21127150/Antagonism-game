#!/usr/bin/env node
/*
  Reset admin password script
  Usage examples (PowerShell):
  node scripts/resetAdminPassword.js --username admin --new "NewStrongPass123!"
  node scripts/resetAdminPassword.js --email admin@game.com --new "NewStrongPass123!"
  node scripts/resetAdminPassword.js --id 11111111-1111-1111-1111-111111111111 --new "NewStrongPass123!"

  Notes:
  - This uses your existing DB connection from config/postgres.js
  - Works against your production DB if .env points there
*/

require("dotenv").config();
const bcrypt = require("bcrypt");
const sequelize = require("../config/postgres");
const User = require("../models/User");

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i];
    const next = argv[i + 1];
    if (key === "--username") {
      args.username = next;
      i++;
    } else if (key === "--email") {
      args.email = next;
      i++;
    } else if (key === "--id") {
      args.id = next;
      i++;
    } else if (key === "--new") {
      args.newPassword = next;
      i++;
    }
  }
  return args;
}

(async () => {
  const { username, email, id, newPassword } = parseArgs(process.argv);

  if (!newPassword) {
    console.error("Error: Missing --new <password>");
    process.exit(1);
  }

  if (newPassword.length < 8 || newPassword.length > 64) {
    console.error("Error: Password length must be between 8 and 64 characters");
    process.exit(1);
  }

  let where = { isAdmin: true };
  if (id) where.id = id;
  else if (email) where.email = email;
  else if (username) where.username = username;
  else where.username = "admin"; // default fallback

  try {
    await sequelize.authenticate();

    const adminUser = await User.findOne({ where });
    if (!adminUser) {
      console.error("Admin user not found with filter:", where);
      process.exit(1);
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await adminUser.update({ password: hash });

    console.log("Success: Admin password updated for user:", {
      id: adminUser.id,
      username: adminUser.username,
      email: adminUser.email,
    });
    process.exit(0);
  } catch (err) {
    console.error("Failed to reset admin password:", err.message);
    process.exit(1);
  } finally {
    try {
      await sequelize.close();
    } catch {}
  }
})();
