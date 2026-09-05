# Decisions

Log the decisions that actually shaped this codebase — the ones where a real alternative existed and you picked one. At least five entries. For each: what you chose, what you rejected, and why. At least one entry must be a decision you later reversed — say what changed your mind.

---

## Decision 1: Database Layer Architecture

- **Chose:** Raw parameterized SQL queries via `pg.Pool` with explicit transaction controls (`BEGIN` / `COMMIT` / `ROLLBACK`).
- **Rejected:** Heavy Node.js Object-Relational Mappers (Prisma, TypeORM, or Sequelize).
- **Why:** The challenge revolves around strict concurrency, data integrity, and custom relational queries. ORMs abstract away SQL execution, making low-level database features—such as explicit row-level locks (`SELECT ... FOR UPDATE`), PostgreSQL custom ENUMs, and native interval math (`NOW() - interval '30 minutes'`)—cumbersome and opaque. Raw parameterized SQL ensures that every database roundtrip is predictable, transactions are bounded with surgical precision, and SQL injection is completely prevented by separating query structure from user parameters.

---

## Decision 2: Order Running Total Calculation

- **Chose:** Dynamic server-side computation on demand by aggregating active lines (`SUM(unit_price * quantity) WHERE is_voided = false`).
- **Rejected:** Persisting a denormalized `total_amount` column on the `orders` table.
- **Why:** In restaurant order workflows, order lines can be appended at any time before serving, quantities can change, and individual lines can be voided with reasons. Persisting a cached total creates an inevitable risk of data drift—if an error occurs midway through voiding an item or adding a line, the stored total can easily desynchronize from the actual sum of line items. Computing the running total on the server guarantees that the ticket total and itemized breakdown can never disagree.
- **Later reversed:** During the initial schema design in Session 1, I originally placed a `total DECIMAL(10, 2) DEFAULT 0` column directly on the `orders` table to make sorting by order value straightforward. However, when writing the transaction logic for line voiding in Session 2, I realized that keeping this column synchronized across line additions, line voiding, and concurrent updates required multi-table transactional triggers or error-prone double-writes. I removed the column from the database, updated the model to calculate the total dynamically on fetch, and eliminated the possibility of drift bugs.

---

## Decision 3: Overdue Order Detection & Alert Cooldowns

- **Chose:** Stateless PostgreSQL interval queries using an `alert_acknowledgements` table and date arithmetic (`created_at < NOW() - interval '30 minutes'`).
- **Rejected:** Background in-memory Node.js timers (`setTimeout` / `setInterval`) or external job queues (Redis + BullMQ).
- **Why:** In-memory timers running inside the Node process are lost whenever the server restarts, crashes, or sleeps on a free-tier hosting platform. Redis and background worker queues add substantial infrastructure overhead and external dependencies for a single requirement. By writing a clean SQL query that identifies overdue orders and verifies that no acknowledgement has been logged within the last 15 minutes, overdue alerts remain completely accurate across server restarts, multi-instance scaling, and deployment restarts without any external operational dependencies.

---

## Decision 4: Line Item Voiding Strategy

- **Chose:** In-place soft-voiding using an `is_voided` boolean flag and `void_reason` text column directly on `order_lines`, coupled with an append-only event in `order_history`.
- **Rejected:** Hard-deleting the row (`DELETE FROM order_lines`) or moving voided lines into a separate `voided_lines` archive table.
- **Why:** The specification states: *"voiding marks the line rather than deleting it, so the order's original record stays intact."* Hard-deleting rows destroys audit trails and prevents restaurant managers from analyzing waste or accidental ordering patterns. Moving voided lines to a separate table breaks the order's sequential item timeline and complicates bill rendering. Keeping the row in place preserves the ticket's history while excluding it from the running total calculation.

---

## Decision 5: Staff Account Deactivation

- **Chose:** Soft-deletion using a `deleted_at TIMESTAMPTZ` column on the `users` table, backed by a partial index (`WHERE deleted_at IS NULL`).
- **Rejected:** Hard-deleting staff rows from the database or using `ON DELETE SET NULL` on foreign keys.
- **Why:** Staff members (waiters and managers) are deeply foreign-keyed across the entire schema: as `primary_waiter_id` on orders, `user_id` on collaborators, `performed_by` on immutable audit logs, and `created_by` on order notes. If a waiter leaves the restaurant and their account is deleted, hard deletion would either cascade and wipe out historical orders and revenue, or set references to `NULL`, which violates Goal 9 (*"History you cannot rewrite"*) by erasing who performed past actions. Soft-deletion instantly revokes authentication privileges while preserving complete historical attribution forever.
