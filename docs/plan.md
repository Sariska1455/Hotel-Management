# Plan

## How did you break the work into sessions?

I structured the project into six distinct, focused sessions budgeted over approximately 10 to 11 hours:

- **Session 1: Data Foundations, Migrations & Authentication (~2.5 hours)**
  - Configured PostgreSQL connection pool (`pg.Pool`) and environment setup.
  - Authored the foundational migration (`001_initial_schema.sql`) defining all core tables, ENUM types, check constraints, foreign keys, and indexes.
  - Implemented bcrypt password hashing, JWT authentication middleware, and RBAC authorization guards (`authenticate`, `authorize`).
  - Built comprehensive seed script (`seed.js`) generating realistic restaurant data (manager, waiters, categorized menu items, and 14 days of realistic order lifecycle data).

- **Session 2: Core Order Lifecycle, Transactions & Audit Trails (~2.5 hours)**
  - Implemented order creation, table number mapping, and primary waiter assignment.
  - Built order line handling with immutable price snapshotting (`unit_price` captured from current menu price).
  - Enforced the state transition machine (`placed → accepted → preparing → ready → served`, with cancellation only permitted from `placed` or `accepted`) using database transactions with row-level locking (`SELECT ... FOR UPDATE`).
  - Created the append-only audit trail (`order_history`) recording all status transitions, line additions, line voiding with required reasons, and collaborator updates.

- **Session 3: Complex Querying, Filtering, Bulk Actions & Export (~2.0 hours)**
  - Built server-side search, filtering (by table, status, waiter, and date), multi-column sorting, and offset-based pagination in `orderModel.getOrders` (Goal 6).
  - Implemented bulk menu item price and availability updates reporting per-item success and failure outcomes rather than all-or-nothing batch failure (Goal 7).
  - Built the CSV export endpoint streaming today's orders with formatted line details, status, and revenue (Goal 7).

- **Session 4: Alerts Engine & Dashboard Analytics (~1.5 hours)**
  - Implemented slow-order alert detection querying orders open >30 minutes not reaching Ready using SQL interval arithmetic.
  - Built alert acknowledgement cooldown mechanism (`alert_acknowledgements`), suppressing alerts for 15 minutes before re-triggering (Goal 10).
  - Implemented server-side dashboard metrics: open orders, today's orders, today's served orders, today's revenue, status breakdowns, and a 14-day chronological orders trend (Goal 8).

- **Session 5: Frontend Interface & Role-Based Workflows (~1.5 hours)**
  - Built single-page application structure in React 18 with Vite, Lucide Icons, and Recharts.
  - Implemented glassmorphic, responsive design system in pure CSS.
  - Built interactive order detail views, line addition modals, voiding modals requiring justification text, collaborator management pills, and real-time polling alert badges.
  - Created quick-login demo pill shortcuts for effortless testing by reviewers.

- **Session 6: Polish, Edge-Case Hardening & Deployment Preparation (~1.0 hour)**
  - Added soft-deletion for staff accounts (`003_add_user_soft_deletion.sql`) to ensure that deactivating a waiter never breaks historical foreign-keyed order timelines.
  - Verified error handling on illegal transitions (e.g. attempting to cancel an order already in `preparing` status).
  - Configured Express to serve the production frontend bundle (`frontend/dist`) with client-side SPA routing fallbacks for seamless single-service cloud deployment.

---

## What order did you build in, and why that order?

I built strictly **Database First → Backend API & Transaction Invariants → Frontend UI**.

### Why this order:
1. **Data Integrity Dictates Everything**: In a system where financial totals, lifecycle state machines, and immutable audit logs are the primary requirements, the database schema is the source of truth. Attempting to build a UI before locking down constraints (e.g., `DECIMAL(10, 2)` instead of float, `CHECK(price >= 0)`, and row locks on status transitions) leads to constant UI refactoring when API contracts change.
2. **Deterministic API Contracts**: Once PostgreSQL tables, ENUMs, and transaction boundaries were verified via automated SQL queries and seed scripts, Express route handlers could be built with clear, unambiguous request/response payloads.
3. **UI as a Consumer, Not an Enforcer**: The brief explicitly required server-side enforcement of all permissions, pagination, and lifecycle rules. By finishing the backend first, the React UI was built purely as a presentation and interaction layer that surfaces server-enforced rules and server-generated error messages directly to the user.

---

## What did you estimate versus what it actually took?

| Task Area | Estimated Time | Actual Time | Difference & Explanation |
|---|---|---|---|
| Schema, DB setup & Seed Data | 1.5 hours | 2.5 hours | +1.0 hour. Crafting realistic multi-day seed data with historical order timelines, price snapshots, and voided lines took more manual tuning than planned. |
| Order Lifecycle & Concurrency | 2.0 hours | 2.5 hours | +0.5 hour. Implementing row-level locking (`SELECT ... FOR UPDATE`) and ensuring every mutation wrote to `order_history` with complete JSON details required careful transaction nesting. |
| Server-Side Filtering & Bulk Updates | 1.5 hours | 2.0 hours | +0.5 hour. Writing dynamic SQL string building for multi-field filtering and per-item bulk validation reports took slightly longer than generic CRUD. |
| Slow Order Alerts & Dashboard | 1.0 hour | 1.5 hours | +0.5 hour. Tuning the interval arithmetic query for alerts with the 15-minute acknowledgement suppression required testing multiple edge cases. |
| Frontend UI & Components | 2.0 hours | 1.5 hours | -0.5 hour. Vite and React allowed very rapid component composition and styling. |
| Testing, Polish & Deployment | 1.0 hour | 1.0 hour | On estimate. Focused on verifying illegal state rejections and soft-deletion behavior. |
| **Total** | **~9.0 hours** | **~11.0 hours** | **+2.0 hours overall** |

The main delta came from taking the extra time to ensure transactional safety, clean relational constraints, and writing a comprehensive seed script that gives reviewers a rich, living application upon first login.

---

## What did you cut when you ran short?

1. **WebSockets for Live Alert Pushes**:
   - I initially wanted real-time push updates via Socket.io for alerts and order status changes.
   - When time became tight, I cut WebSockets in favor of lightweight, periodic HTTP polling (15s for the alerts badge, 30s for order detail views). This gave 95% of the real-time feel with zero deployment fragility or websocket disconnection overhead.

2. **Full Kitchen Display System (KDS) Grid View**:
   - I considered building a dedicated full-screen "Kitchen Mode" with high-contrast tickets and station routing (Grill vs. Salad).
   - I cut this stretch feature to ensure the 10 mandatory core requirements—especially server-side filtering, immutable history, and per-item bulk update reporting—were implemented flawlessly.

3. **Receipt Printing / Split-Check Billing**:
   - Cut receipt thermal printing simulation and check-splitting calculations to preserve focus on order lifecycle integrity and reviewer documentation.
