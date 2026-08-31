// ============================================================================
// Menu Item Database Model (Raw SQL Queries)
// ============================================================================
// 💡 WHY RAW SQL WITH PARAMETERIZED QUERIES?
// 1. Full performance and transparency - no black-box ORM queries.
// 2. Security - parameterized ($1, $2) prevents SQL injection.
// 3. Interview preparedness - you can explain every JOIN, WHERE, and TRANSACTION.
// ============================================================================

const pool = require('../config/db');

/**
 * Fetch menu items with optional filters
 */
const getMenuItems = async ({ includeArchived = false, category, search } = {}) => {
  let query = `
    SELECT id, name, description, category, price, is_available, is_archived, created_at, updated_at
    FROM menu_items
    WHERE 1=1
  `;
  const values = [];
  let paramIndex = 1;

  // By default, exclude archived items unless explicitly requested (e.g., by a manager)
  if (!includeArchived) {
    query += ` AND is_archived = false`;
  }

  if (category && category !== 'All') {
    query += ` AND category = $${paramIndex}`;
    values.push(category);
    paramIndex++;
  }

  if (search) {
    query += ` AND (LOWER(name) LIKE $${paramIndex} OR LOWER(description) LIKE $${paramIndex})`;
    values.push(`%${search.toLowerCase()}%`);
    paramIndex++;
  }

  query += ` ORDER BY category ASC, name ASC`;

  const result = await pool.query(query, values);
  return result.rows;
};

/**
 * Find a single menu item by ID
 */
const getMenuItemById = async (id) => {
  const result = await pool.query(
    `SELECT * FROM menu_items WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Create a new menu item (Manager only)
 */
const createMenuItem = async ({ name, description, category = 'Mains', price, is_available = true }) => {
  const result = await pool.query(
    `INSERT INTO menu_items (name, description, category, price, is_available)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [name, description, category, price, is_available]
  );
  return result.rows[0];
};

/**
 * Update an existing menu item (Manager only)
 */
const updateMenuItem = async (id, { name, description, category, price, is_available, is_archived }) => {
  // Build dynamic update query
  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(name);
  }
  if (description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(description);
  }
  if (category !== undefined) {
    updates.push(`category = $${paramIndex++}`);
    values.push(category);
  }
  if (price !== undefined) {
    updates.push(`price = $${paramIndex++}`);
    values.push(price);
  }
  if (is_available !== undefined) {
    updates.push(`is_available = $${paramIndex++}`);
    values.push(is_available);
  }
  if (is_archived !== undefined) {
    updates.push(`is_archived = $${paramIndex++}`);
    values.push(is_archived);
  }

  updates.push(`updated_at = NOW()`);

  values.push(id);
  const query = `
    UPDATE menu_items
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows[0] || null;
};

/**
 * Bulk Action on Menu Items (Goal 7 Requirement)
 * 
 * "Managers can select several menu items and apply one change to all of them —
 * a new price or a change in availability — in a single action. Because some
 * items in the selection may be invalid, such as a negative price, the result
 * must report per item what succeeded and what was rejected and why, not just fail the whole batch."
 */
const bulkUpdateMenuItems = async ({ itemIds, price, is_available }) => {
  const results = [];

  for (const id of itemIds) {
    try {
      // Find item
      const item = await getMenuItemById(id);
      if (!item) {
        results.push({
          id,
          name: `Item #${id}`,
          status: 'rejected',
          reason: 'Menu item not found'
        });
        continue;
      }

      // Validation check 1: Negative or invalid price check
      if (price !== undefined && price !== null && (isNaN(price) || parseFloat(price) < 0)) {
        results.push({
          id,
          name: item.name,
          status: 'rejected',
          reason: `Invalid price (₹${price}). Price cannot be negative.`
        });
        continue;
      }

      // Validation check 2: Price exceeding safety threshold
      if (price !== undefined && price !== null && parseFloat(price) > 100000) {
        results.push({
          id,
          name: item.name,
          status: 'rejected',
          reason: `Price (₹${price}) exceeds safety limit of ₹100,000.00`
        });
        continue;
      }

      // Apply update
      const updateData = {};
      if (price !== undefined && price !== null) updateData.price = parseFloat(price);
      if (is_available !== undefined && is_available !== null) updateData.is_available = is_available;

      const updated = await updateMenuItem(id, updateData);

      results.push({
        id,
        name: item.name,
        status: 'success',
        item: updated
      });
    } catch (err) {
      results.push({
        id,
        name: `Item #${id}`,
        status: 'rejected',
        reason: err.message || 'Database execution error'
      });
    }
  }

  return results;
};

module.exports = {
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  bulkUpdateMenuItems
};
