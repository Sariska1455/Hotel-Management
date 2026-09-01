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
    'SELECT * FROM users WHERE role = $1 ORDER BY name ASC',
    ['waiter']
  );
  return result.rows;
};

// Return all staff members for Admin management (excluding password hash)
const getAllUsers = async () => {
  const result = await pool.query(
    'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC'
  );
  return result.rows;
};

// Check if a user is linked to any orders or timeline history
const checkUserOrders = async (id) => {
  const orders = await pool.query(
    'SELECT id FROM orders WHERE primary_waiter_id = $1 LIMIT 1',
    [id]
  );
  if (orders.rows.length > 0) return true;

  const history = await pool.query(
    'SELECT id FROM order_history WHERE performed_by = $1 LIMIT 1',
    [id]
  );
  return history.rows.length > 0;
};

// Delete user by id
const deleteUser = async (id) => {
  const result = await pool.query(
    'DELETE FROM users WHERE id = $1 RETURNING id, email, name, role',
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
  checkUserOrders,
  deleteUser,
};
