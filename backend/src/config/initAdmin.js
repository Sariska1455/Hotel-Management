// ============================================================================
// Auto-initialize / Sync Owner Admin from Environment Variables (.env)
// ============================================================================
// Guarantees that only the single Owner/Admin configured in .env has admin access.
// Automatically ensures the PostgreSQL enum supports 'admin' and synchronizes
// the hashed password in the users table so the Admin can log in.
// ============================================================================
const bcrypt = require('bcryptjs');
const pool = require('./db');

const initAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'Restaurant Owner';

  if (!adminEmail || !adminPassword) {
    console.warn('⚠️ ADMIN_EMAIL or ADMIN_PASSWORD not configured in .env. Admin bootstrap skipped.');
    return;
  }

  try {
    // 1. Ensure 'admin' is part of user_role enum
    try {
      await pool.query("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin'");
    } catch (enumErr) {
      // Ignore if already present or if custom type doesn't support IF NOT EXISTS in old PG
      if (!enumErr.message.includes('already exists')) {
        console.warn('Note on user_role enum:', enumErr.message);
      }
    }

    // 2. Hash admin password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    // 3. Upsert Admin user
    const existing = await pool.query('SELECT id, role FROM users WHERE email = $1', [adminEmail]);

    if (existing.rows.length === 0) {
      await pool.query(
        'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)',
        [adminEmail, passwordHash, adminName, 'admin']
      );
      console.log(`🛡️ Admin user created from .env (${adminEmail})`);
    } else {
      // Update password hash and ensure role is admin
      await pool.query(
        'UPDATE users SET password_hash = $1, name = $2, role = $3 WHERE email = $4',
        [passwordHash, adminName, 'admin', adminEmail]
      );
      console.log(`🛡️ Admin user synchronized from .env (${adminEmail})`);
    }
  } catch (err) {
    console.warn('⚠️ Could not initialize Admin from .env (Database may still be connecting):', err.message);
  }
};

module.exports = initAdmin;
