# AI prompts

The prompts I used during the development of this project, grouped by goal and milestone. For each prompt: the objective, what was generated, what errors or omissions were discovered, and how I corrected them.

---

## 1. Initial Database Schema & Constraints

### Prompt
> "I am building a restaurant order management backend in PostgreSQL and Node.js. Write a SQL migration script for the database. We have users (managers, waiters), menu items (name, price, availability, category), orders (table number, status, primary waiter), order lines (menu item, quantity, special instructions, void status and reason), order collaborators (junction table), order notes, and an immutable audit log for order history. Make sure to use appropriate data types and constraints."

### What you got
The generated SQL script created the tables with basic primary keys, foreign keys, and indexes. However:
- It used `FLOAT` / `REAL` for prices on `menu_items` and `order_lines`.
- It used plain `VARCHAR` for status and user roles without constraints.
- It did not include a price snapshot column on `order_lines`, assuming line pricing would just join back to `menu_items`.
- It did not include check constraints for positive quantities or non-negative prices.

### What you corrected
- Replaced `FLOAT` with `DECIMAL(10, 2)` across `menu_items.price` and `order_lines.unit_price`. Using floating-point types for monetary values introduces IEEE 754 precision rounding errors.
- Created custom PostgreSQL ENUM types: `CREATE TYPE user_role AS ENUM ('manager', 'waiter')` and `CREATE TYPE order_status AS ENUM ('placed', 'accepted', 'preparing', 'ready', 'served', 'cancelled')`.
- Added database-level mathematical integrity constraints: `CHECK(price >= 0)`, `CHECK(unit_price >= 0)`, and `CHECK(quantity > 0)`.
- Added `unit_price` directly onto `order_lines` to snapshot the menu item price at the moment of addition, preventing retrospective price changes from altering past tickets.
- Added `ON DELETE RESTRICT` between `order_lines` and `menu_items` so menu items with historical sales cannot be inadvertently deleted.

---

## 2. Order Lifecycle State Machine & Concurrency Control (Produced Broken Code)

### Prompt
> "Write an Express route and PostgreSQL query to update an order's status. The status transitions must follow: Placed -> Accepted -> Preparing -> Ready -> Served. An order can be Cancelled, but only when it is still Placed or Accepted. Once Preparing begins, it cannot be cancelled. Also record the change in an order_history audit table."

### What you got
The generated route handler looked up the order with a simple `SELECT`, validated the status change in JavaScript, and then ran an `UPDATE` query:
```javascript
const order = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
if (order.rows[0].status === 'preparing' && newStatus === 'cancelled') {
  return res.status(400).json({ error: 'Cannot cancel' });
}
await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [newStatus, orderId]);
await pool.query('INSERT INTO order_history ...');
```

**Why this was wrong and broke in testing**:
1. **Critical Concurrency Race Condition**: Because the `SELECT` and `UPDATE` were separate, un-isolated queries without row locking, two simultaneous requests could race. For example, if a waiter submitted a cancellation while the kitchen submitted an acceptance to start preparing, both would read the initial status and succeed, leaving the order in an invalid state.
2. **Incomplete State Graph Validation**: The logic only explicitly checked the cancellation edge case, but permitted arbitrary jumps—for instance, jumping from `placed` directly to `served`, or reverting from `ready` back to `preparing`.
3. **No Transaction Isolation**: If inserting into `order_history` failed, the order status update remained committed, violating the requirement of an unbreakable audit trail.

### What you corrected
- Wrapped the entire flow in an explicit ACID transaction using `await client.query('BEGIN')` and `ROLLBACK` on any error.
- Enforced row-level locking by using `SELECT * FROM orders WHERE id = $1 FOR UPDATE` to block concurrent status modifications on the same ticket.
- Built a strict state transition dictionary (`VALID_TRANSITIONS`):
  ```javascript
  const VALID_TRANSITIONS = {
    placed:    ['accepted', 'cancelled'],
    accepted:  ['preparing', 'cancelled'],
    preparing: ['ready'],
    ready:     ['served'],
    served:    [],
    cancelled: [],
  };
  ```
- Guaranteed that the status update and the `order_history` audit record write occur within the exact same database transaction before committing.

---

## 3. Bulk Menu Item Actions with Partial Failure Reporting

### Prompt
> "Write a backend endpoint for managers to select several menu items and update either their price or availability all at once. The requirement is: because some items in the selection may be invalid, such as a negative price or non-existent ID, the result must report per item what succeeded and what was rejected and why, rather than failing the whole batch."

### What you got
The AI generated a single SQL update using `UPDATE menu_items SET ... WHERE id = ANY($1)`. When asked how to handle validation failures per item, it proposed wrapping the batch in a transaction that rolled back completely if any price was negative.

### What you corrected
- Rejected the all-or-nothing batch update since Goal 7 explicitly requires partial outcome reporting.
- Rewrote the service method in `menuModel.js` (`bulkUpdateMenuItems`) to process the items sequentially with individual validation:
  - If a price is provided and is `< 0`, it records `{ itemId, status: 'rejected', reason: 'Price must be non-negative' }`.
  - If the item ID does not exist in the database, it records `{ itemId, status: 'rejected', reason: 'Menu item not found' }`.
  - For valid items, it executes the update and records `{ itemId, status: 'success', data: updatedRow }`.
- Returned a clean response summary containing `totalProcessed`, `totalSuccess`, `totalRejected`, and the array of per-item outcome reports.

---

## 4. Slow-Order Alert Query with Cooldown Logic

### Prompt
> "I need a PostgreSQL query for an alert system. It should return orders that have been open for more than 30 minutes without reaching 'ready'. Waiters or managers can acknowledge an alert, which clears it. If the order is still not ready 15 minutes later, the alert must return. Here is the alert_acknowledgements table (id, order_id, acknowledged_by, acknowledged_at)."

### What you got
The AI provided a query using a `LEFT JOIN` on `alert_acknowledgements`:
```sql
SELECT o.* FROM orders o
LEFT JOIN alert_acknowledgements aa ON aa.order_id = o.id
WHERE o.status IN ('placed', 'accepted', 'preparing')
  AND o.created_at < NOW() - INTERVAL '30 minutes'
  AND aa.id IS NULL;
```

**Why this was wrong**:
A `LEFT JOIN` with `aa.id IS NULL` only checks if the order has *never* been acknowledged. As soon as any staff member acknowledged the order once, it would permanently disappear from the alerts area and never return, completely violating the requirement that an unready order must re-alert after 15 minutes.

### What you corrected
- Replaced the `LEFT JOIN` with a correlated `NOT EXISTS` subquery checking only for recent acknowledgements within the cooldown interval:
  ```sql
  SELECT o.*, u.name AS primary_waiter_name
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
  ORDER BY o.created_at ASC;
  ```
- Parameterized both the initial threshold (30 minutes) and the recheck cooldown (15 minutes) using environment variables (`ALERT_THRESHOLD_MINUTES`, `ALERT_RECHECK_MINUTES`).

---

## 5. Dashboard Aggregate Metrics & 14-Day Trend Analytics

### Prompt
> "Write a SQL query or function to get dashboard numbers for a restaurant order system: open orders count, orders placed today, orders served today, revenue today, status breakdown, waiter breakdown, and orders served per day over the last 14 days."

### What you got
The AI attempted to write a single multi-table `SELECT` query joining `orders`, `users`, and `order_lines` with multiple `COUNT(DISTINCT ...)` and `SUM(...)` clauses grouped by multiple dimensions.

**Why this was problematic**:
Joining `order_lines` onto `orders` inside the same query used for calculating order counts produced a Cartesian product multiplication on non-distinct counts. Furthermore, days in the 14-day history where zero orders were placed were completely omitted from the result set, causing gaps in the frontend Recharts line chart.

### What you corrected
- Decomposed the dashboard retrieval into concise, dedicated queries in `orderModel.getDashboardStats()`:
  - Separate scalar counts for open orders, orders placed today, and orders served today.
  - A clean revenue calculation summing `unit_price * quantity` on non-voided lines of served orders placed today (`created_at::date = CURRENT_DATE`).
  - Status counts grouped by `status` and waiter leaderboards grouped by `primary_waiter_id`.
  - A 14-day date series loop in JavaScript that defaults any day with zero orders to `{ count: 0, revenue: 0 }`, ensuring smooth, continuous data visualization in Recharts without rendering gaps.
