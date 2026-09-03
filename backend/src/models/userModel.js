const pool = require('../config/db');

// Parameterized queries (using $1, $2, etc.) are crucial for preventing SQL injection.
// Instead of string concatenation which allows attackers to inject malicious SQL,
// the driver sends the query structure and parameters separately to the database.
// The DB treats parameters strictly as data, never as executable code.

const createUser = async (email, passwordHash, name, role) => {
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           name = EXCLUDED.name,
           role = EXCLUDED.role,
           deleted_at = NULL
       WHERE users.deleted_at IS NOT NULL
     RETURNING *`,
    [email, passwordHash, name, role]
  );
  return result.rows[0];
};

const findByEmail = async (email) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
    [email]
  );
  return result.rows[0];
};

const findById = async (id) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  return result.rows[0];
};

const getAllWaiters = async () => {
  const result = await pool.query(
    'SELECT * FROM users WHERE role = $1 AND deleted_at IS NULL ORDER BY name ASC',
    ['waiter']
  );
  return result.rows;
};

// Return all staff members for Admin management (excluding password hash)
const getAllUsers = async () => {
  const result = await pool.query(
    'SELECT id, email, name, role, created_at FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC'
  );
  return result.rows;
};

// Deactivate the login while retaining foreign-keyed order and audit history.
const deleteUser = async (id) => {
  const result = await pool.query(
    'UPDATE users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id, email, name, role',
    [id]
  );
  return result.rows[0];
};

module.exports = {
  createUser,
  findByEmail,
  findById,
  getAllWaiters,
  getAllUsers,
  deleteUser,
};
