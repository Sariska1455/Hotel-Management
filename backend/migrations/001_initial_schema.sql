-- ============================================================================
-- Restaurant Orders System — Database Schema
-- ============================================================================
-- This file creates ALL tables for the application in one migration.
-- 
-- 💡 POSTGRESQL vs MONGODB — KEY DIFFERENCES FOR YOU:
-- In MongoDB, you just insert documents and the "schema" is implicit.
-- In PostgreSQL, you DEFINE the structure first (CREATE TABLE), and the 
-- database ENFORCES it — it will reject data that doesn't match.
-- This is called "schema-on-write" vs MongoDB's "schema-on-read".
-- ============================================================================

-- ============================================================================
-- STEP 1: Create custom ENUM types
-- ============================================================================
-- 💡 ENUM in PostgreSQL = a column that can ONLY have these specific values.
-- Like a dropdown menu for the database. If you try to insert 'random_status',
-- PostgreSQL will reject it with an error. In MongoDB, you'd have to validate
-- this in your application code.

CREATE TYPE user_role AS ENUM ('manager', 'waiter');

-- The order lifecycle: Placed → Accepted → Preparing → Ready → Served
-- Plus 'cancelled' as a terminal state
CREATE TYPE order_status AS ENUM (
  'placed', 
  'accepted', 
  'preparing', 
  'ready', 
  'served', 
  'cancelled'
);


-- ============================================================================
-- STEP 2: Users table
-- ============================================================================
-- 💡 SERIAL = auto-incrementing integer (like MongoDB's auto-generated _id,
-- but it's a simple number: 1, 2, 3, ...)
-- 
-- 💡 UNIQUE constraint = the database itself prevents duplicate emails.
-- In MongoDB, you'd create a unique index. Same concept, different syntax.
--
-- 💡 NOT NULL = this column MUST have a value. The database rejects inserts
-- without it. In MongoDB, nothing stops you from omitting a field.

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(255) NOT NULL,
  role          user_role    NOT NULL DEFAULT 'waiter',
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 💡 TIMESTAMPTZ = timestamp WITH timezone. Always use this over TIMESTAMP.
-- It stores the moment in UTC and converts to your local timezone on read.
-- This prevents timezone bugs when your server and database are in different zones.


-- ============================================================================
-- STEP 3: Menu Items table
-- ============================================================================
-- 💡 DECIMAL(10, 2) = a number with up to 10 digits, 2 after the decimal.
-- NEVER use FLOAT for money! FLOAT has rounding errors (0.1 + 0.2 ≠ 0.3).
-- DECIMAL stores exact values.
--
-- 💡 CHECK constraint = a rule the database enforces on every INSERT/UPDATE.
-- CHECK(price >= 0) means the database itself rejects negative prices.
-- This is what the assignment means by "constraints in the database."

CREATE TABLE menu_items (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  category      VARCHAR(100) NOT NULL DEFAULT 'Mains',
  price         DECIMAL(10, 2) NOT NULL CHECK(price >= 0),
  is_available  BOOLEAN NOT NULL DEFAULT true,
  is_archived   BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- STEP 4: Orders table
-- ============================================================================
-- 💡 REFERENCES = a FOREIGN KEY. It says "this column's value MUST exist 
-- in another table." If you try to create an order with primary_waiter_id = 999
-- and there's no user with id 999, PostgreSQL rejects it.
-- In MongoDB, nothing enforces this — you'd have to check in your app code.
--
-- 💡 This is a ONE-TO-MANY relationship: 
-- One user (waiter) → many orders. The foreign key lives on the "many" side.

CREATE TABLE orders (
  id                SERIAL PRIMARY KEY,
  table_number      VARCHAR(20) NOT NULL,
  status            order_status NOT NULL DEFAULT 'placed',
  primary_waiter_id INTEGER NOT NULL REFERENCES users(id),
  is_archived       BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 💡 INDEX = makes searching faster for specific columns.
-- Think of it like a book's index — instead of reading every page to find 
-- "chapter 5", you look it up in the index. Without this, PostgreSQL would 
-- scan every row (called a "sequential scan") to find orders by status.
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_primary_waiter ON orders(primary_waiter_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_table_number ON orders(table_number);


-- ============================================================================
-- STEP 5: Order Lines table
-- ============================================================================
-- 💡 unit_price is a SNAPSHOT of the menu item's price at the time this line 
-- was added. This is a deliberate DENORMALIZATION.
--
-- Why? The assignment says: "calculated by the server from the menu items' 
-- current prices at the time each line was added."
--
-- If we only stored menu_item_id and always looked up the current price,
-- then when a manager changes a burger from $12 to $15, all existing orders
-- would suddenly show the new price — that's wrong. The customer ordered 
-- when it was $12, so their bill should show $12.
--
-- 💡 ON DELETE RESTRICT = prevents deleting a menu item that's referenced 
-- by order lines. You can't accidentally delete "Burger" if orders reference it.

CREATE TABLE order_lines (
  id              SERIAL PRIMARY KEY,
  order_id        INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id    INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  quantity        INTEGER NOT NULL CHECK(quantity > 0),
  unit_price      DECIMAL(10, 2) NOT NULL CHECK(unit_price >= 0),
  special_instructions TEXT,
  is_voided       BOOLEAN NOT NULL DEFAULT false,
  void_reason     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_lines_order ON order_lines(order_id);


-- ============================================================================
-- STEP 6: Order Collaborators (junction table)
-- ============================================================================
-- 💡 This is a MANY-TO-MANY relationship:
-- - One order can have many collaborating waiters
-- - One waiter can collaborate on many orders
--
-- In MongoDB, you'd probably embed an array of waiter IDs in the order document.
-- In SQL, we use a "junction table" (also called "join table" or "bridge table")
-- with two foreign keys — one to each side of the relationship.
--
-- 💡 PRIMARY KEY (order_id, user_id) = a COMPOSITE primary key.
-- It means the combination must be unique — you can't add the same waiter 
-- to the same order twice. But one waiter can appear in many rows (different 
-- orders) and one order can appear in many rows (different waiters).

CREATE TABLE order_collaborators (
  order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (order_id, user_id)
);


-- ============================================================================
-- STEP 7: Order History (IMMUTABLE audit log)
-- ============================================================================
-- 💡 This table is APPEND-ONLY. The application will NEVER run UPDATE or 
-- DELETE on this table. This fulfills Goal 9: "Nothing in this timeline can 
-- be edited or deleted after the fact, including by managers."
--
-- We store the action type (status_change, line_added, line_voided, note_added,
-- collaborator_added) and the relevant details as JSONB.
--
-- 💡 JSONB in PostgreSQL = similar to a MongoDB document inside a SQL column!
-- It stores JSON data that you can query and index. We use it here for 
-- flexible "details" that vary by action type:
--   - status_change: { "old_status": "placed", "new_status": "accepted" }
--   - line_voided: { "line_id": 5, "reason": "customer changed mind" }
--   - line_added: { "line_id": 3, "menu_item": "Burger", "quantity": 2 }

CREATE TABLE order_history (
  id            SERIAL PRIMARY KEY,
  order_id      INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  action        VARCHAR(50) NOT NULL,
  old_value     TEXT,
  new_value     TEXT,
  details       JSONB,
  performed_by  INTEGER NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_history_order ON order_history(order_id);
CREATE INDEX idx_order_history_created ON order_history(created_at);


-- ============================================================================
-- STEP 8: Alert Acknowledgements
-- ============================================================================
-- 💡 When an order has been open too long, an alert appears.
-- When someone acknowledges it, we record it here.
-- If the order is STILL not ready after another interval, the alert returns.
-- We check: "Is there an acknowledgement newer than (now - recheck_interval)?"
-- If yes → alert is suppressed. If no → alert shows again.

CREATE TABLE alert_acknowledgements (
  id               SERIAL PRIMARY KEY,
  order_id         INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  acknowledged_by  INTEGER NOT NULL REFERENCES users(id),
  acknowledged_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_ack_order ON alert_acknowledgements(order_id);


-- ============================================================================
-- STEP 9: Order Notes
-- ============================================================================
-- 💡 Separate table for notes left on orders.
-- These are also part of the immutable timeline (Goal 9).

CREATE TABLE order_notes (
  id          SERIAL PRIMARY KEY,
  order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  created_by  INTEGER NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_notes_order ON order_notes(order_id);
