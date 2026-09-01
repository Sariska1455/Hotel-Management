// ============================================================================
// Database Migration Runner (Cross-Platform Node.js)
// ============================================================================
// Replaces the bash/psql CLI requirement. Reads all .sql migration files in
// order and executes them against PostgreSQL using the configured DATABASE_URL.
// ============================================================================
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs = require('fs');
const pool = require('./config/db');
const initAdmin = require('./config/initAdmin');

const runMigrations = async () => {
  console.log('🚀 Starting Database Migrations...');
  const client = await pool.connect();

  try {
    const migrationsDir = path.join(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      console.log(`📄 Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      // Execute SQL statements
      await client.query(sql);
      console.log(`✅ Applied migration: ${file}`);
    }

    console.log('🎉 All database migrations applied successfully!');

    // Automatically sync/bootstrap the single Owner Admin configured in .env
    console.log('🛡️ Initializing Admin user...');
    await initAdmin();

    console.log('✅ Database setup complete.');
  } catch (err) {
    console.error('❌ Migration Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

runMigrations();
