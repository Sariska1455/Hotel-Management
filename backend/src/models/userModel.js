const pool = require('../config/db');

// Parameterized queries (using $1, $2, etc.) are crucial for preventing SQL injection.
// Instead of string concatenation which allows attackers to inject malicious SQL,
// the driver sends the query structure and parameters separately to the database.
// The DB treats parameters strictly as data, never as executable code.

const createUser = async (email, passwordHash, name, role) => {
  const result = await pool.query(
    'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING *',
    [email, passwordHash, name, role]
  );
  return result.rows[0];
};

const findByEmail = async (email) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0];
};

const findById = async (id) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0];
};

const getAllWaiters = async () => {
  const result = await pool.query(
    'SELECT * FROM users WHERE role = $1',
    ['waiter']
  );
  return result.rows;
};

module.exports = {
  createUser,
  findByEmail,
  findById,
  getAllWaiters,
};
