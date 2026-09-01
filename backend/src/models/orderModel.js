// ============================================================================
// Order Database Model (Raw SQL Queries)
// ============================================================================
// Covers Goals 2, 3, 4, 5, 9 — Orders CRUD, lines, lifecycle, collaborators,
// immutable history.  Every mutation writes an append-only audit row to
// order_history so the timeline can never be rewritten.
// ============================================================================

const pool = require('../config/db');

// -- Helpers ------------------------------------------------------------------

/** DB stores lowercase enums; frontend expects capitalised labels. */
const capitalizeStatus = (s) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

/**
 * Valid order-status transitions (Goal 4).
 * Cancel is only legal from placed / accepted — once the kitchen starts
 * preparing, the order can no longer be cancelled as a whole.
 */
const VALID_TRANSITIONS = {
  placed:    ['accepted', 'cancelled'],
  accepted:  ['preparing', 'cancelled'],
  preparing: ['ready'],
  ready:     ['served'],
  served:    [],
  cancelled: [],
};

// -- Permission helper --------------------------------------------------------

/**
 * Throws 403 if the calling user may not act on this order.
 *
 * Managers may act on any order.  Waiters may only act on orders where they
 * are the primary waiter or a collaborator.
 *
 * @param {object} clientOrPool  pg client (inside a txn) or pool
 * @param {number} orderId
 * @param {number} userId
 * @param {string} userRole      'manager' | 'waiter'
 * @param {object} [order]       pre-fetched order row (optional optimisation)
 */
const checkPermission = async (clientOrPool, orderId, userId, userRole, order) => {
  if (userRole === 'manager') return;

  if (!order) {
    const { rows } = await clientOrPool.query(
      'SELECT primary_waiter_id FROM orders WHERE id = $1',
      [orderId],
    );
    if (!rows[0]) {
      throw Object.assign(new Error('Order not found'), { statusCode: 404 });
    }
    order = rows[0];
  }

  if (order.primary_waiter_id === userId) return;

  const { rows: collabRows } = await clientOrPool.query(
    'SELECT 1 FROM order_collaborators WHERE order_id = $1 AND user_id = $2',
    [orderId, userId],
  );
  if (collabRows.length > 0) return;

  throw Object.assign(
    new Error('You do not have permission to update this order.'),
    { statusCode: 403 },
  );
};

// -- Response formatters ------------------------------------------------------

/**
 * Convert a raw `order_history` row into the camelCase timeline entry the
 * frontend expects.
 */
const formatTimelineEntry = (h) => {
  const base = {
    id:        h.id,
    type:      h.action,
    actorId:   h.performed_by,
    actorName: h.actor_name,
    timestamp: h.created_at,
  };
  const d = h.details || {};

  switch (h.action) {
    case 'status_change':
      return {
        ...base,
        oldStatus: h.old_value ? capitalizeStatus(h.old_value) : null,
        newStatus: capitalizeStatus(h.new_value),
      };
    case 'line_added':
      return { ...base, lineId: d.line_id, lineName: d.menu_item, quantity: d.quantity };
    case 'line_voided':
      return { ...base, lineId: d.line_id, lineName: d.menu_item, reason: d.reason };
    case 'collaborator_added':
      return { ...base, collaboratorName: d.collaborator_name };
    case 'note_added':
      return { ...base, note: d.note };
    default:
      return base;
  }
};

/**
 * Assemble the full order response expected by the frontend.
 *
 * Shape:
 * {
 *   id, tableNumber, status,
 *   primaryWaiterId, primaryWaiterName,
 *   collaborators: [{ id, name }],
 *   notes, createdAt, updatedAt, archived,
 *   lines: [{ id, menuItemId, menuItemName, quantity, specialInstructions,
 *             priceAtTime, status, voidReason }],
 *   timeline: [{ id, type, … }],
 *   total
 * }
 */
const formatOrderResponse = (order, lines, collaborators, history, latestNote, total) => ({
  id:                order.id,
  tableNumber:       order.table_number,
  status:            capitalizeStatus(order.status),
  primaryWaiterId:   order.primary_waiter_id,
  primaryWaiterName: order.primary_waiter_name,
  collaborators:     collaborators.map((c) => ({ id: c.id, name: c.name })),
  notes:             latestNote || '',
  createdAt:         order.created_at,
  updatedAt:         order.updated_at,
  archived:          order.is_archived,
  lines: lines.map((l) => ({
    id:                  l.id,
    menuItemId:          l.menu_item_id,
    menuItemName:        l.menu_item_name,
    quantity:            l.quantity,
    specialInstructions: l.special_instructions || '',
    priceAtTime:         parseFloat(l.unit_price),
    status:              l.is_voided ? 'void' : 'active',
    voidReason:          l.void_reason || null,
  })),
  timeline: history.map(formatTimelineEntry),
  total,
});

// -- Read ---------------------------------------------------------------------

/**
 * Fetch a single order by ID with all related data (lines, collaborators,
 * timeline, notes) and the computed total.
 */
const getOrderById = async (orderId) => {
  // 1. Order + primary waiter name
  const { rows: orderRows } = await pool.query(
    `SELECT o.*, u.name AS primary_waiter_name
       FROM orders o
       JOIN users u ON u.id = o.primary_waiter_id
      WHERE o.id = $1`,
    [orderId],
  );
  if (!orderRows[0]) return null;

  // 2. Order lines + menu-item names
  const { rows: lineRows } = await pool.query(
    `SELECT ol.*, mi.name AS menu_item_name
       FROM order_lines ol
       JOIN menu_items mi ON mi.id = ol.menu_item_id
      WHERE ol.order_id = $1
      ORDER BY ol.created_at ASC`,
    [orderId],
  );

  // 3. Collaborators
  const { rows: collabRows } = await pool.query(
    `SELECT u.id, u.name
       FROM order_collaborators oc
       JOIN users u ON u.id = oc.user_id
      WHERE oc.order_id = $1
      ORDER BY oc.added_at ASC`,
    [orderId],
  );

  // 4. Timeline (immutable history + actor names)
  const { rows: historyRows } = await pool.query(
    `SELECT oh.*, u.name AS actor_name
       FROM order_history oh
       JOIN users u ON u.id = oh.performed_by
      WHERE oh.order_id = $1
      ORDER BY oh.created_at ASC`,
    [orderId],
  );

  // 5. Latest note content
  const { rows: noteRows } = await pool.query(
    `SELECT content FROM order_notes
      WHERE order_id = $1
      ORDER BY created_at DESC LIMIT 1`,
    [orderId],
  );

  // 6. Total (server-calculated from non-voided lines)
  const total = lineRows
    .filter((l) => !l.is_voided)
    .reduce((sum, l) => sum + parseFloat(l.unit_price) * l.quantity, 0);

  return formatOrderResponse(
    orderRows[0],
    lineRows,
    collabRows,
    historyRows,
    noteRows[0]?.content || '',
    total,
  );
};

// -- Create -------------------------------------------------------------------

/**
 * Create a new order (Goal 2).
 *
 * @param {{ tableNumber: string|number, lines: Array, notes?: string, primaryWaiterId: number }}
 * @returns the full formatted order
 */
const createOrder = async ({ tableNumber, lines, notes, primaryWaiterId }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert the order
    const { rows: [order] } = await client.query(
      `INSERT INTO orders (table_number, status, primary_waiter_id)
       VALUES ($1, 'placed', $2) RETURNING *`,
      [String(tableNumber), primaryWaiterId],
    );

    // 2. Insert each line — snapshot the current menu price (Goal 3)
    for (const line of lines) {
      const { rows: [menuItem] } = await client.query(
        'SELECT id, name, price, is_available FROM menu_items WHERE id = $1',
        [line.menuItemId],
      );
      if (!menuItem) {
        throw Object.assign(
          new Error(`Menu item #${line.menuItemId} not found`),
          { statusCode: 400 },
        );
      }
      if (!menuItem.is_available) {
        throw Object.assign(
          new Error(`${menuItem.name} is not currently available`),
          { statusCode: 400 },
        );
      }

      await client.query(
        `INSERT INTO order_lines
           (order_id, menu_item_id, quantity, unit_price, special_instructions)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          order.id,
          menuItem.id,
          line.quantity,
          menuItem.price,                       // ← price snapshot
          line.specialInstructions || null,
        ],
      );
    }

    // 3. History: status_change → placed
    await client.query(
      `INSERT INTO order_history (order_id, action, old_value, new_value, details, performed_by)
       VALUES ($1, 'status_change', NULL, 'placed', $2, $3)`,
      [
        order.id,
        JSON.stringify({ old_status: null, new_status: 'placed' }),
        primaryWaiterId,
      ],
    );

    // 4. Optional note
    if (notes && notes.trim()) {
      await client.query(
        'INSERT INTO order_notes (order_id, content, created_by) VALUES ($1, $2, $3)',
        [order.id, notes, primaryWaiterId],
      );
      await client.query(
        `INSERT INTO order_history (order_id, action, details, performed_by)
         VALUES ($1, 'note_added', $2, $3)`,
        [order.id, JSON.stringify({ note: notes }), primaryWaiterId],
      );
    }

    await client.query('COMMIT');
    return getOrderById(order.id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// -- Status lifecycle ---------------------------------------------------------

/**
 * Advance (or cancel) an order's status (Goal 4).
 *
 * Validates the transition against the lifecycle rules and records an
 * immutable history entry (Goal 9).
 */
const advanceStatus = async (orderId, newStatus, userId, userRole) => {
  const normalised = newStatus.toLowerCase();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the row to prevent concurrent status changes
    const { rows: [order] } = await client.query(
      'SELECT * FROM orders WHERE id = $1 FOR UPDATE',
      [orderId],
    );
    if (!order) {
      throw Object.assign(new Error('Order not found'), { statusCode: 404 });
    }

    // Validate transition
    const valid = VALID_TRANSITIONS[order.status] || [];
    if (!valid.includes(normalised)) {
      throw Object.assign(
        new Error(
          `Cannot move from ${capitalizeStatus(order.status)} to ${capitalizeStatus(normalised)}. ` +
          `Valid transitions: ${valid.map(capitalizeStatus).join(', ') || 'none'}`,
        ),
        { statusCode: 400 },
      );
    }

    // Permission check
    await checkPermission(client, orderId, userId, userRole, order);

    // Apply
    await client.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
      [normalised, orderId],
    );

    // History
    await client.query(
      `INSERT INTO order_history (order_id, action, old_value, new_value, details, performed_by)
       VALUES ($1, 'status_change', $2, $3, $4, $5)`,
      [
        orderId,
        order.status,
        normalised,
        JSON.stringify({ old_status: order.status, new_status: normalised }),
        userId,
      ],
    );

    await client.query('COMMIT');
    return getOrderById(orderId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// -- Archive / restore --------------------------------------------------------

const archiveOrder = async (orderId, archived, userId, userRole) => {
  // Only managers should archive (enforced at route level), but double-check
  const { rows: [order] } = await pool.query(
    'SELECT * FROM orders WHERE id = $1',
    [orderId],
  );
  if (!order) {
    throw Object.assign(new Error('Order not found'), { statusCode: 404 });
  }

  await pool.query(
    'UPDATE orders SET is_archived = $1, updated_at = NOW() WHERE id = $2',
    [archived, orderId],
  );

  return getOrderById(orderId);
};

// -- Order lines --------------------------------------------------------------

/**
 * Add a line to an open order (Goal 3).
 *
 * "Lines can be added to an order at any point before it is served."
 * Snapshots the menu item's current price as `unit_price`.
 */
const addLine = async (orderId, { menuItemId, quantity, specialInstructions }, userId, userRole) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [order] } = await client.query(
      'SELECT * FROM orders WHERE id = $1 FOR UPDATE',
      [orderId],
    );
    if (!order) {
      throw Object.assign(new Error('Order not found'), { statusCode: 404 });
    }

    // Lines cannot be added once the order is served or cancelled
    if (['served', 'cancelled'].includes(order.status)) {
      throw Object.assign(
        new Error(`Cannot add lines to an order in status: ${capitalizeStatus(order.status)}`),
        { statusCode: 400 },
      );
    }

    await checkPermission(client, orderId, userId, userRole, order);

    // Look up menu item and snapshot price
    const { rows: [menuItem] } = await client.query(
      'SELECT id, name, price, is_available FROM menu_items WHERE id = $1',
      [menuItemId],
    );
    if (!menuItem) {
      throw Object.assign(new Error('Menu item not found'), { statusCode: 404 });
    }
    if (!menuItem.is_available) {
      throw Object.assign(
        new Error(`${menuItem.name} is not currently available`),
        { statusCode: 400 },
      );
    }

    const { rows: [newLine] } = await client.query(
      `INSERT INTO order_lines
         (order_id, menu_item_id, quantity, unit_price, special_instructions)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [orderId, menuItem.id, quantity, menuItem.price, specialInstructions || null],
    );

    // History (Goal 9)
    await client.query(
      `INSERT INTO order_history (order_id, action, details, performed_by)
       VALUES ($1, 'line_added', $2, $3)`,
      [
        orderId,
        JSON.stringify({
          line_id: newLine.id,
          menu_item: menuItem.name,
          quantity,
        }),
        userId,
      ],
    );

    await client.query(
      'UPDATE orders SET updated_at = NOW() WHERE id = $1',
      [orderId],
    );

    await client.query('COMMIT');
    return getOrderById(orderId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Void a line with a required reason (Goal 4).
 *
 * "Any line on an order can be voided, marked Void, with a required reason
 *  for as long as the order remains open, meaning any state before Served
 *  or Cancelled; voiding marks the line rather than deleting it."
 */
const voidLine = async (orderId, lineId, reason, userId, userRole) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [order] } = await client.query(
      'SELECT * FROM orders WHERE id = $1 FOR UPDATE',
      [orderId],
    );
    if (!order) {
      throw Object.assign(new Error('Order not found'), { statusCode: 404 });
    }

    if (['served', 'cancelled'].includes(order.status)) {
      throw Object.assign(
        new Error('Cannot void a line on a closed order.'),
        { statusCode: 400 },
      );
    }

    if (!reason || !reason.trim()) {
      throw Object.assign(
        new Error('A reason is required to void a line.'),
        { statusCode: 400 },
      );
    }

    await checkPermission(client, orderId, userId, userRole, order);

    // Find the line
    const { rows: [line] } = await client.query(
      `SELECT ol.*, mi.name AS menu_item_name
         FROM order_lines ol
         JOIN menu_items mi ON mi.id = ol.menu_item_id
        WHERE ol.id = $1 AND ol.order_id = $2`,
      [lineId, orderId],
    );
    if (!line) {
      throw Object.assign(new Error('Line not found'), { statusCode: 404 });
    }
    if (line.is_voided) {
      throw Object.assign(new Error('Line is already voided'), { statusCode: 400 });
    }

    // Mark voided (not deleted — record stays intact)
    await client.query(
      'UPDATE order_lines SET is_voided = true, void_reason = $1 WHERE id = $2',
      [reason, lineId],
    );

    // History (Goal 9)
    await client.query(
      `INSERT INTO order_history (order_id, action, details, performed_by)
       VALUES ($1, 'line_voided', $2, $3)`,
      [
        orderId,
        JSON.stringify({
          line_id: lineId,
          menu_item: line.menu_item_name,
          reason,
        }),
        userId,
      ],
    );

    await client.query(
      'UPDATE orders SET updated_at = NOW() WHERE id = $1',
      [orderId],
    );

    await client.query('COMMIT');
    return getOrderById(orderId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// -- Collaborators ------------------------------------------------------------

/**
 * Add a collaborator to an order (Goal 5).
 *
 * "Any number of other waiters can be added to it as collaborators who can
 *  also update it."
 */
const addCollaborator = async (orderId, collaboratorId, userId, userRole) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [order] } = await client.query(
      'SELECT * FROM orders WHERE id = $1',
      [orderId],
    );
    if (!order) {
      throw Object.assign(new Error('Order not found'), { statusCode: 404 });
    }

    await checkPermission(client, orderId, userId, userRole, order);

    // Collaborator must be a valid user
    const { rows: [collabUser] } = await client.query(
      'SELECT id, name FROM users WHERE id = $1',
      [collaboratorId],
    );
    if (!collabUser) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }

    // Cannot add the primary waiter as a collaborator
    if (order.primary_waiter_id === collaboratorId) {
      throw Object.assign(
        new Error('This user is already the primary waiter.'),
        { statusCode: 400 },
      );
    }

    // Insert (composite PK prevents duplicates)
    try {
      await client.query(
        'INSERT INTO order_collaborators (order_id, user_id) VALUES ($1, $2)',
        [orderId, collaboratorId],
      );
    } catch (err) {
      if (err.code === '23505') {
        throw Object.assign(
          new Error('This waiter is already a collaborator.'),
          { statusCode: 400 },
        );
      }
      throw err;
    }

    // History (Goal 9)
    await client.query(
      `INSERT INTO order_history (order_id, action, details, performed_by)
       VALUES ($1, 'collaborator_added', $2, $3)`,
      [
        orderId,
        JSON.stringify({
          collaborator_id: collaboratorId,
          collaborator_name: collabUser.name,
        }),
        userId,
      ],
    );

    await client.query(
      'UPDATE orders SET updated_at = NOW() WHERE id = $1',
      [orderId],
    );

    await client.query('COMMIT');
    return getOrderById(orderId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Remove a collaborator from an order.
 */
const removeCollaborator = async (orderId, collaboratorId, userId, userRole) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [order] } = await client.query(
      'SELECT * FROM orders WHERE id = $1',
      [orderId],
    );
    if (!order) {
      throw Object.assign(new Error('Order not found'), { statusCode: 404 });
    }

    await checkPermission(client, orderId, userId, userRole, order);

    await client.query(
      'DELETE FROM order_collaborators WHERE order_id = $1 AND user_id = $2',
      [orderId, collaboratorId],
    );

    await client.query(
      'UPDATE orders SET updated_at = NOW() WHERE id = $1',
      [orderId],
    );

    await client.query('COMMIT');
    return getOrderById(orderId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// -- Notes --------------------------------------------------------------------

/**
 * Add a note to an order (feeds into Goal 9 immutable timeline).
 */
const addNote = async (orderId, content, userId, userRole) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [order] } = await client.query(
      'SELECT * FROM orders WHERE id = $1',
      [orderId],
    );
    if (!order) {
      throw Object.assign(new Error('Order not found'), { statusCode: 404 });
    }

    await checkPermission(client, orderId, userId, userRole, order);

    if (!content || !content.trim()) {
      throw Object.assign(new Error('Note content cannot be empty'), { statusCode: 400 });
    }

    await client.query(
      'INSERT INTO order_notes (order_id, content, created_by) VALUES ($1, $2, $3)',
      [orderId, content, userId],
    );

    // History (Goal 9 — append-only)
    await client.query(
      `INSERT INTO order_history (order_id, action, details, performed_by)
       VALUES ($1, 'note_added', $2, $3)`,
      [orderId, JSON.stringify({ note: content }), userId],
    );

    await client.query(
      'UPDATE orders SET updated_at = NOW() WHERE id = $1',
      [orderId],
    );

    await client.query('COMMIT');
    return getOrderById(orderId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// -- List / Search / Filter / Paginate (Goal 6) ------------------------------

/**
 * Fetch a paginated, filtered, sorted list of orders (Goal 6).
 *
 * All filtering, sorting, and pagination happen server-side.
 *
 * @param {object} opts
 * @param {number}  opts.page       1-based page number
 * @param {number}  opts.pageSize   rows per page
 * @param {string}  opts.search     free-text over table_number
 * @param {string}  opts.status     filter by order status
 * @param {string}  opts.waiterId   filter by waiter (primary or collaborator)
 * @param {string}  opts.date       filter by date (YYYY-MM-DD)
 * @param {string}  opts.sortBy     'createdAt' | 'tableNumber' | 'status'
 * @param {string}  opts.sortDir    'asc' | 'desc'
 * @param {string}  opts.userRole   caller's role
 * @param {number}  opts.userId     caller's id (for waiter filtering)
 */
const getOrders = async ({
  page = 1,
  pageSize = 10,
  search = '',
  status = '',
  waiterId = '',
  date = '',
  sortBy = 'createdAt',
  sortDir = 'desc',
  userRole = 'waiter',
  userId = null,
} = {}) => {
  const values = [];
  let paramIndex = 1;
  let whereClause = 'WHERE 1=1';

  // Exclude archived by default
  whereClause += ' AND o.is_archived = false';

  // If waiter, only show orders where they are primary or collaborator
  if (userRole === 'waiter' && userId) {
    whereClause += ` AND (o.primary_waiter_id = $${paramIndex} OR EXISTS (
      SELECT 1 FROM order_collaborators oc2 WHERE oc2.order_id = o.id AND oc2.user_id = $${paramIndex}
    ))`;
    values.push(userId);
    paramIndex++;
  }

  // Text search over table number
  if (search) {
    whereClause += ` AND (
      o.table_number ILIKE $${paramIndex}
      OR u.name ILIKE $${paramIndex}
      OR CAST(o.id AS TEXT) ILIKE $${paramIndex}
    )`;
    values.push(`%${search}%`);
    paramIndex++;
  }

  // Status filter
  if (status && status !== 'All') {
    whereClause += ` AND o.status = $${paramIndex}`;
    values.push(status.toLowerCase());
    paramIndex++;
  }

  // Waiter filter (explicit, for manager filtering by a specific waiter)
  if (waiterId) {
    whereClause += ` AND (o.primary_waiter_id = $${paramIndex} OR EXISTS (
      SELECT 1 FROM order_collaborators oc3 WHERE oc3.order_id = o.id AND oc3.user_id = $${paramIndex}
    ))`;
    values.push(parseInt(waiterId, 10));
    paramIndex++;
  }

  // Date filter
  if (date) {
    whereClause += ` AND o.created_at::date = $${paramIndex}`;
    values.push(date);
    paramIndex++;
  }

  // Sorting
  const sortMap = {
    createdAt: 'o.created_at',
    tableNumber: 'o.table_number',
    status: 'o.status',
  };
  const sortCol = sortMap[sortBy] || 'o.created_at';
  const dir = sortDir === 'asc' ? 'ASC' : 'DESC';

  // Count total matches
  const countQuery = `
    SELECT COUNT(*) AS total
    FROM orders o
    JOIN users u ON u.id = o.primary_waiter_id
    ${whereClause}
  `;
  const { rows: [{ total: totalStr }] } = await pool.query(countQuery, values);
  const total = parseInt(totalStr, 10);

  // Fetch page
  const offset = (page - 1) * pageSize;
  const dataQuery = `
    SELECT o.*, u.name AS primary_waiter_name
    FROM orders o
    JOIN users u ON u.id = o.primary_waiter_id
    ${whereClause}
    ORDER BY ${sortCol} ${dir}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  values.push(pageSize, offset);

  const { rows: orderRows } = await pool.query(dataQuery, values);

  // For each order, get lines, collaborators, and compute total
  const orders = [];
  for (const order of orderRows) {
    // Lines
    const { rows: lines } = await pool.query(
      `SELECT ol.*, mi.name AS menu_item_name
       FROM order_lines ol
       JOIN menu_items mi ON mi.id = ol.menu_item_id
       WHERE ol.order_id = $1
       ORDER BY ol.created_at ASC`,
      [order.id],
    );

    // Collaborators
    const { rows: collabs } = await pool.query(
      `SELECT u.id, u.name
       FROM order_collaborators oc
       JOIN users u ON u.id = oc.user_id
       WHERE oc.order_id = $1`,
      [order.id],
    );

    // Total (non-voided lines)
    const orderTotal = lines
      .filter(l => !l.is_voided)
      .reduce((sum, l) => sum + parseFloat(l.unit_price) * l.quantity, 0);

    orders.push({
      id: order.id,
      tableNumber: order.table_number,
      status: capitalizeStatus(order.status),
      primaryWaiterId: order.primary_waiter_id,
      primaryWaiterName: order.primary_waiter_name,
      collaborators: collabs.map(c => ({ id: c.id, name: c.name })),
      notes: '',
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      archived: order.is_archived,
      lines: lines.map(l => ({
        id: l.id,
        menuItemId: l.menu_item_id,
        menuItemName: l.menu_item_name,
        quantity: l.quantity,
        specialInstructions: l.special_instructions || '',
        priceAtTime: parseFloat(l.unit_price),
        status: l.is_voided ? 'void' : 'active',
        voidReason: l.void_reason || null,
      })),
      total: orderTotal,
    });
  }

  return {
    orders,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
};

// -- Dashboard stats (Goal 8) ------------------------------------------------

/**
 * Compute all dashboard headline numbers and chart data server-side.
 */
const getDashboardStats = async () => {
  // Open orders (Placed, Accepted, Preparing, Ready)
  const { rows: [{ count: openOrders }] } = await pool.query(
    `SELECT COUNT(*) FROM orders
     WHERE status IN ('placed','accepted','preparing','ready')
       AND is_archived = false`,
  );

  // Orders placed today
  const { rows: [{ count: ordersToday }] } = await pool.query(
    `SELECT COUNT(*) FROM orders WHERE created_at::date = CURRENT_DATE`,
  );

  // Orders served today
  const { rows: [{ count: servedToday }] } = await pool.query(
    `SELECT COUNT(*) FROM orders
     WHERE status = 'served' AND created_at::date = CURRENT_DATE`,
  );

  // Revenue today (sum of non-voided lines on served orders placed today)
  const { rows: [{ revenue }] } = await pool.query(
    `SELECT COALESCE(SUM(ol.unit_price * ol.quantity), 0) AS revenue
     FROM order_lines ol
     JOIN orders o ON o.id = ol.order_id
     WHERE o.status = 'served'
       AND o.created_at::date = CURRENT_DATE
       AND ol.is_voided = false`,
  );

  // Status breakdown
  const { rows: statusRows } = await pool.query(
    `SELECT status, COUNT(*) AS count FROM orders GROUP BY status`,
  );
  const statusCounts = {};
  for (const row of statusRows) {
    statusCounts[capitalizeStatus(row.status)] = parseInt(row.count, 10);
  }

  // Waiter breakdown
  const { rows: waiterRows } = await pool.query(
    `SELECT u.name,
            COUNT(o.id) AS orders,
            COALESCE(SUM(CASE WHEN o.status = 'served' THEN (
              SELECT COALESCE(SUM(ol.unit_price * ol.quantity), 0)
              FROM order_lines ol WHERE ol.order_id = o.id AND ol.is_voided = false
            ) ELSE 0 END), 0) AS revenue
     FROM orders o
     JOIN users u ON u.id = o.primary_waiter_id
     GROUP BY u.name
     ORDER BY revenue DESC`,
  );
  const waiterBreakdown = waiterRows.map(w => ({
    name: w.name,
    orders: parseInt(w.orders, 10),
    revenue: parseFloat(w.revenue),
  }));

  // 14-day chart data
  const { rows: chartRows } = await pool.query(
    `SELECT
       d::date AS date,
       COUNT(o.id) FILTER (WHERE o.status = 'served') AS served,
       COALESCE(SUM(
         CASE WHEN o.status = 'served' THEN (
           SELECT COALESCE(SUM(ol2.unit_price * ol2.quantity), 0)
           FROM order_lines ol2 WHERE ol2.order_id = o.id AND ol2.is_voided = false
         ) ELSE 0 END
       ), 0) AS revenue
     FROM generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, '1 day') d
     LEFT JOIN orders o ON o.created_at::date = d::date
     GROUP BY d::date
     ORDER BY d::date ASC`,
  );
  const chartData = chartRows.map(r => ({
    date: r.date.toISOString().slice(0, 10),
    label: new Date(r.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    served: parseInt(r.served, 10),
    revenue: parseFloat(r.revenue),
  }));

  return {
    openOrders: parseInt(openOrders, 10),
    ordersToday: parseInt(ordersToday, 10),
    servedToday: parseInt(servedToday, 10),
    revenueToday: parseFloat(revenue),
    statusCounts,
    waiterBreakdown,
    chartData,
  };
};

// -- Slow order alerts (Goal 10) ----------------------------------------------

/**
 * Get orders that have been open longer than thresholdMinutes without
 * reaching 'ready'.  Acknowledging suppresses the alert for recheckMinutes.
 */
const getSlowOrders = async (thresholdMinutes = 30, recheckMinutes = 15) => {
  const { rows } = await pool.query(
    `SELECT o.*, u.name AS primary_waiter_name
     FROM orders o
     JOIN users u ON u.id = o.primary_waiter_id
     WHERE o.status IN ('placed', 'accepted', 'preparing')
       AND o.is_archived = false
       AND o.created_at < NOW() - ($1 || ' minutes')::interval
       AND NOT EXISTS (
         SELECT 1 FROM alert_acknowledgements aa
         WHERE aa.order_id = o.id
           AND aa.acknowledged_at > NOW() - ($2 || ' minutes')::interval
       )
     ORDER BY o.created_at ASC`,
    [String(thresholdMinutes), String(recheckMinutes)],
  );

  // Attach lines for display
  const alerts = [];
  for (const order of rows) {
    const { rows: lines } = await pool.query(
      `SELECT ol.*, mi.name AS menu_item_name
       FROM order_lines ol
       JOIN menu_items mi ON mi.id = ol.menu_item_id
       WHERE ol.order_id = $1`,
      [order.id],
    );

    alerts.push({
      id: order.id,
      tableNumber: order.table_number,
      status: capitalizeStatus(order.status),
      primaryWaiterId: order.primary_waiter_id,
      primaryWaiterName: order.primary_waiter_name,
      createdAt: order.created_at,
      lines: lines.map(l => ({
        id: l.id,
        menuItemName: l.menu_item_name,
        quantity: l.quantity,
        status: l.is_voided ? 'void' : 'active',
      })),
    });
  }

  return alerts;
};

/**
 * Acknowledge a slow order alert.
 */
const acknowledgeAlert = async (orderId, userId) => {
  await pool.query(
    'INSERT INTO alert_acknowledgements (order_id, acknowledged_by) VALUES ($1, $2)',
    [orderId, userId],
  );
};

// -- CSV export (Goal 7) ------------------------------------------------------

/**
 * Return today's orders with lines, total, and status for CSV export.
 */
const getOrdersForCSV = async () => {
  const { rows: orderRows } = await pool.query(
    `SELECT o.*, u.name AS primary_waiter_name
     FROM orders o
     JOIN users u ON u.id = o.primary_waiter_id
     WHERE o.created_at::date = CURRENT_DATE
     ORDER BY o.created_at ASC`,
  );

  const results = [];
  for (const order of orderRows) {
    const { rows: lines } = await pool.query(
      `SELECT ol.*, mi.name AS menu_item_name
       FROM order_lines ol
       JOIN menu_items mi ON mi.id = ol.menu_item_id
       WHERE ol.order_id = $1 AND ol.is_voided = false`,
      [order.id],
    );

    const linesSummary = lines.map(l => `${l.menu_item_name} x${l.quantity}`).join('; ');
    const total = lines.reduce((s, l) => s + parseFloat(l.unit_price) * l.quantity, 0);

    results.push({
      orderId: order.id,
      tableNumber: order.table_number,
      status: capitalizeStatus(order.status),
      waiter: order.primary_waiter_name,
      lines: linesSummary,
      total: total.toFixed(2),
      placedAt: new Date(order.created_at).toISOString(),
    });
  }
  return results;
};

// -- Exports ------------------------------------------------------------------

module.exports = {
  getOrderById,
  getOrders,
  createOrder,
  advanceStatus,
  archiveOrder,
  addLine,
  voidLine,
  addCollaborator,
  removeCollaborator,
  addNote,
  getDashboardStats,
  getSlowOrders,
  acknowledgeAlert,
  getOrdersForCSV,
  VALID_TRANSITIONS,
  capitalizeStatus,
};
