# Schema

## Table by table: what columns and types does each one have?

### 1. `users`
Represents staff members (managers, waiters, and admin).
- `id`: `SERIAL PRIMARY KEY` — Auto-incrementing unique user identifier.
- `email`: `VARCHAR(255) NOT NULL UNIQUE` — Login email address.
- `password_hash`: `VARCHAR(255) NOT NULL` — Bcrypt salted password hash.
- `name`: `VARCHAR(255) NOT NULL` — Staff member's display name.
- `role`: `user_role NOT NULL DEFAULT 'waiter'` — Custom ENUM (`'manager'`, `'waiter'`, `'admin'`).
- `deleted_at`: `TIMESTAMPTZ NULL` — Soft deletion timestamp to preserve order attribution.
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()` — Account creation timestamp.

### 2. `menu_items`
The restaurant's catalog of food and beverages.
- `id`: `SERIAL PRIMARY KEY` — Auto-incrementing unique menu item identifier.
- `name`: `VARCHAR(255) NOT NULL` — Dish or beverage name.
- `description`: `TEXT` — Detailed description and allergen notes.
- `category`: `VARCHAR(100) NOT NULL DEFAULT 'Mains'` — Menu section (Starters, Mains, Desserts, Beverages).
- `price`: `DECIMAL(10, 2) NOT NULL CHECK(price >= 0)` — Current selling price (exact decimal).
- `is_available`: `BOOLEAN NOT NULL DEFAULT true` — Availability toggle (86'd items).
- `is_archived`: `BOOLEAN NOT NULL DEFAULT false` — Soft archive toggle for retired dishes.
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()` — Record creation timestamp.
- `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()` — Last modification timestamp.

### 3. `orders`
The central lifecycle entity representing a dining ticket.
- `id`: `SERIAL PRIMARY KEY` — Auto-incrementing ticket number.
- `table_number`: `VARCHAR(20) NOT NULL` — Table identifier (e.g., "12", "Patio-3").
- `status`: `order_status NOT NULL DEFAULT 'placed'` — Custom ENUM (`'placed'`, `'accepted'`, `'preparing'`, `'ready'`, `'served'`, `'cancelled'`).
- `primary_waiter_id`: `INTEGER NOT NULL REFERENCES users(id)` — Foreign key to the creating staff member.
- `is_archived`: `BOOLEAN NOT NULL DEFAULT false` — Archival flag to clear historical orders from the active queue.
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()` — Placement timestamp.
- `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()` — Last status or line change timestamp.

### 4. `order_lines`
Individual dishes ordered on a ticket.
- `id`: `SERIAL PRIMARY KEY` — Auto-incrementing line identifier.
- `order_id`: `INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE` — Foreign key to the parent order.
- `menu_item_id`: `INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT` — Foreign key to the catalog dish.
- `quantity`: `INTEGER NOT NULL CHECK(quantity > 0)` — Positive item quantity.
- `unit_price`: `DECIMAL(10, 2) NOT NULL CHECK(unit_price >= 0)` — Price snapshot at the time this line was ordered.
- `special_instructions`: `TEXT` — Preparation instructions (e.g., "extra spicy, dressing on the side").
- `is_voided`: `BOOLEAN NOT NULL DEFAULT false` — Void status toggle preserving audit integrity.
- `void_reason`: `TEXT NULL` — Mandatory explanation required when voiding an item.
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()` — Line creation timestamp.

### 5. `order_collaborators`
Junction table tracking secondary waiters assisting on an order.
- `order_id`: `INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE` — Target order.
- `user_id`: `INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE` — Collaborating staff member.
- `added_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()` — Assignment timestamp.
- `PRIMARY KEY (order_id, user_id)` — Composite primary key preventing duplicate assignments.

### 6. `order_history`
Append-only immutable audit log tracking every mutation.
- `id`: `SERIAL PRIMARY KEY` — Audit sequence ID.
- `order_id`: `INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE` — Target order.
- `action`: `VARCHAR(50) NOT NULL` — Action type (`'status_change'`, `'line_added'`, `'line_voided'`, `'collaborator_added'`, `'collaborator_removed'`, `'note_added'`).
- `old_value`: `TEXT` — Previous state (e.g., previous status).
- `new_value`: `TEXT` — New state (e.g., new status).
- `details`: `JSONB` — Structured event metadata (item names, void reasons, line quantities).
- `performed_by`: `INTEGER NOT NULL REFERENCES users(id)` — Staff member responsible for the change.
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()` — Immutable timestamp of the event.

### 7. `order_notes`
Chronological notes and special handling instructions attached to an order.
- `id`: `SERIAL PRIMARY KEY` — Note ID.
- `order_id`: `INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE` — Target order.
- `content`: `TEXT NOT NULL` — Note body.
- `created_by`: `INTEGER NOT NULL REFERENCES users(id)` — Staff member who authored the note.
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()` — Note creation timestamp.

### 8. `alert_acknowledgements`
Tracks dismissals of overdue orders to support timed re-alerting.
- `id`: `SERIAL PRIMARY KEY` — Acknowledgement ID.
- `order_id`: `INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE` — Overdue order.
- `acknowledged_by`: `INTEGER NOT NULL REFERENCES users(id)` — Staff member who acknowledged the warning.
- `acknowledged_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()` — Timestamp of acknowledgement.

---

## Which relationships are one-to-many, and which are many-to-many?

### One-to-Many Relationships (1:N)
- **`users` (waiters) → `orders`**: A waiter acts as the primary creator for many orders, but each order has exactly one primary waiter (`orders.primary_waiter_id`).
- **`orders` → `order_lines`**: An order contains one or many line items; each line belongs exclusively to one parent order (`order_lines.order_id`).
- **`orders` → `order_history`**: An order generates an append-only timeline of multiple audit records; each audit row belongs to one order (`order_history.order_id`).
- **`orders` → `order_notes`**: An order can have multiple chronological notes attached to it (`order_notes.order_id`).
- **`orders` → `alert_acknowledgements`**: An order that sits slow multiple times can be acknowledged multiple times over its lifecycle (`alert_acknowledgements.order_id`).
- **`menu_items` → `order_lines`**: A single menu item can appear across multiple order lines over time (`order_lines.menu_item_id`).
- **`users` → `order_history` / `order_notes`**: A staff member authors multiple audit entries and notes.

### Many-to-Many Relationships (M:N)
- **`orders` ↔ `users` (Collaborators)**:
  - An order can have multiple secondary waiters collaborating on it.
  - A waiter can collaborate on multiple active orders across the restaurant floor.
  - This is resolved via the junction table `order_collaborators` using the composite primary key `(order_id, user_id)`.

---

## Which constraints are enforced by the database, and which by application code — and why did you draw the line there?

### Database Enforced Constraints
1. **Primary & Unique Keys**: `id` auto-incrementing PKs; `UNIQUE(email)` on `users`.
2. **Foreign Key Integrity**:
   - `orders.primary_waiter_id REFERENCES users(id)` ensures orphaned orders cannot exist.
   - `order_lines.order_id REFERENCES orders(id) ON DELETE CASCADE` ensures clean order removal.
   - `order_lines.menu_item_id REFERENCES menu_items(id) ON DELETE RESTRICT` ensures menu items with historical sales cannot be hard-deleted from the database.
3. **Data Types & Custom ENUMs**: `user_role` (`'manager'`, `'waiter'`, `'admin'`) and `order_status` (`'placed'`, `'accepted'`, `'preparing'`, `'ready'`, `'served'`, `'cancelled'`) reject arbitrary text strings at the engine level.
4. **Range & Mathematical Checks**: `CHECK(price >= 0)`, `CHECK(unit_price >= 0)`, and `CHECK(quantity > 0)` prevent negative billing or nonsensical orders.
5. **Duplicate Junction Prevention**: `PRIMARY KEY (order_id, user_id)` on `order_collaborators` guarantees a waiter cannot be added twice to the same ticket.

### Application Enforced Rules
1. **Lifecycle State Machine**:
   - Legal forward progression: `placed → accepted → preparing → ready → served`.
   - Cancellation restriction: Cancellation is only permitted from `placed` or `accepted`. Once in `preparing` or beyond, cancellation is blocked with a human-readable explanation.
2. **Permission Scoping**:
   - Managers may act on all orders.
   - Waiters can only view and mutate orders where they are the primary waiter or registered as a collaborator.
   - Only managers can modify the menu catalog.
3. **Domain Pre-conditions**:
   - Adding a line or voiding a line is prohibited if the order is already in a closed state (`served` or `cancelled`).
   - A non-empty text reason is required to void a line item.
   - The primary waiter cannot be added as their own collaborator.

### Why draw the line there?
The database is the ultimate guardian of structural and relational invariants. Any invalid numerical value (e.g., negative price) or orphan record (e.g., an order line referencing a non-existent order) would corrupt reporting and financial calculations, regardless of what client or migration script touched the database.

Conversely, workflow state transitions, contextual permissions, and descriptive error feedback belong in application logic wrapped in database transactions (`BEGIN` with `SELECT ... FOR UPDATE`). Database triggers can enforce state transitions, but doing so produces cryptic SQL exception codes that are difficult to translate into user-friendly UI error notifications. Placing authorization and transition logic in Node.js keeps error handling expressive while row locks guarantee concurrency safety.

---

## What did you deliberately denormalise?

### 1. `order_lines.unit_price` (Price Snapshotting)
Instead of relying on a relational join to `menu_items.price` at query time, each `order_lines` record snapshots the exact `unit_price` when the line is created.

**Why**: Menu prices are volatile. If a manager raises the price of the Ribeye Steak from $28.00 to $34.00 on Friday afternoon, tables that ordered at lunch must still be billed at $28.00. Normalizing price by joining against `menu_items` would silently rewrite historical sales totals.

### 2. Dynamically Computed Order Total (Avoided Stored Denormalization)
Early on, it was tempting to add a `total_amount` column directly on the `orders` table. However, because order lines can be added at any point before serving and lines can be voided with reasons, maintaining a cached total column creates an active risk of data drift if any transaction fails to update both tables simultaneously. Instead, the running total is computed on the fly by summing active lines:
```sql
SUM(unit_price * quantity) WHERE is_voided = false
```
This guarantees that the bill and line items can never disagree.

---

## What would break first if this had 100x the data?

If order volume grew 100x (e.g., millions of historical orders and tens of millions of order lines):

1. **The N+1 Query in `orderModel.getOrders`**:
   - In `getOrders()`, the main query fetches 10 orders according to search/filter criteria. However, to populate lines and collaborators, the code loops over those 10 rows and executes two individual SQL queries per order (`SELECT FROM order_lines WHERE order_id = $1` and `SELECT FROM order_collaborators WHERE order_id = $1`).
   - While imperceptible on hundreds of orders, under high concurrency and load, making 21 roundtrips per page request will saturate the PostgreSQL connection pool.
   - *Fix*: Refactor into a single query using PostgreSQL `json_agg()` or `ARRAY_AGG()` to fold lines and collaborators directly into the order record in one scan.

2. **The Slow Orders Interval Query (`getSlowOrders`)**:
   - The alert system checks:
     ```sql
     WHERE o.status IN ('placed', 'accepted', 'preparing')
       AND o.is_archived = false
       AND o.created_at < NOW() - interval '30 minutes'
       AND NOT EXISTS (
         SELECT 1 FROM alert_acknowledgements aa
         WHERE aa.order_id = o.id AND aa.acknowledged_at > NOW() - interval '15 minutes'
       )
     ```
   - At 100x data, the `alert_acknowledgements` table will contain millions of rows. Without a composite index on `(order_id, acknowledged_at DESC)`, evaluating `NOT EXISTS` across active orders will degrade into sequential scans.
   - *Fix*: Add composite index `idx_alert_ack_lookup ON alert_acknowledgements(order_id, acknowledged_at DESC)`.

3. **Dashboard Real-Time Aggregations**:
   - The dashboard currently computes today's revenue, order counts, and 14-day history on the fly by scanning `orders` and joining `order_lines`.
   - At 100x data, scanning millions of order lines on every dashboard reload will cause high CPU and disk I/O.
   - *Fix*: Implement periodic rollup summary tables or PostgreSQL materialized views refreshed incrementally.
