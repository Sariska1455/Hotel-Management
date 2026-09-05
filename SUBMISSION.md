# Submission

## Links

- **GitHub repository:** https://github.com/Sariska1455/Hotel-Management
- **Live application:** https://hotel-management-five-coral.vercel.app

## Notes for the reviewer

- **Dynamic Staff Management (Restaurant Owner Role):** Instead of relying on hardcoded demo staff credentials, I introduced an additional administrative role: the **Restaurant Owner (Admin)**. The Owner has access to a dedicated Staff Management portal (`/staff`) to dynamically create and delete credentials for Managers and Waiters directly in PostgreSQL with Bcrypt password hashing. Soft deletion (`deleted_at`) is implemented so deactivating staff never breaks historical order foreign keys or audit trail attribution.
- **Real Deployed Data:** The deployed server is live with 10 catalog dishes across categories (Starters, Mains, Desserts, Beverages) and live orders tested over the course of 1 day across the full order lifecycle (Placed → Accepted → Preparing → Ready → Served / Cancelled), complete with price snapshots, voided items with reasons, notes, and multi-waiter collaborations.
- **Free-Tier Host Note:** The backend is hosted on Render's free tier. If the service has been idle, the initial API call may take approximately 30–50 seconds to wake up the container. Once spun up, requests are fast and responsive.

## Demo credentials

| Role | Email | Password | What this account does |
|------|-------|----------|------------------------|
| **Owner (Admin)** | `admin@restaurant.com` | `adminPassword123!` | Manages staff credentials; creates and deactivates Manager and Waiter accounts. |
| **Manager** | `manager@restaurant.com` | `Sariska` | Full menu management, bulk pricing/availability actions, views all orders, archives orders, views full analytics dashboard. |
| **Waiter 1 (Khushi)** | `waiter1@restaurant.com` | `Khushi` | Creates orders, adds lines, advances order lifecycle, voids lines with reasons, collaborates with other waiters. |
| **Waiter 2 (Happy)** | `waiter2@restaurant.com` | `Happy` | Collaborator on shared tables; creates and manages assigned floor orders. |

## Stack

| Layer | What was used | Why |
|-------|---------------|-----|
| Frontend | React 18, Vite, Recharts, Lucide Icons, Vanilla CSS | Fast HMR, clean glassmorphic aesthetic without CSS framework bloat, responsive interactive order management, real-time analytics charts. |
| Backend | Node.js, Express, JWT, express-validator, bcryptjs | Asynchronous, lightweight REST API architecture with declarative middleware for JWT authentication and strict role-based authorization guards. |
| Database | PostgreSQL (`pg` connection pool, raw parameterized SQL) | Relational ACID compliance, explicit transaction boundaries (`BEGIN` / `FOR UPDATE` / `COMMIT`), strict `CHECK` constraints, custom ENUMs, and native interval arithmetic for slow order alerts. |
| Hosting | Vercel (Frontend) + Render (Backend) + Cloud PostgreSQL | Reliable distributed cloud deployment with environment-isolated secrets and clean SPA routing. |

## Goal checklist

| # | Goal | Status | Notes |
|---|------|--------|-------|
| 1 | Accounts and roles | Done | Three distinct roles (Owner, Manager, Waiter) enforced strictly on the server via `authenticate` and `authorize(...)` middlewares. Waiters cannot edit menu items, change prices, or access orders outside their assigned floor or collaborations. The Owner dynamically manages staff credentials in PostgreSQL. |
| 2 | Orders | Done | Orders are created by table number with the primary waiter automatically assigned on creation. Managers can archive and restore tickets without destroying historical data. |
| 3 | Order lines | Done | 10 menu items currently active in catalog. Each order line captures `menu_item_id`, quantity, special instructions, and snapshots `unit_price` at the moment of addition. Running totals are computed server-side from active (non-voided) lines. Lines can be appended anytime before the order reaches Served. |
| 4 | Order lifecycle with rules | Done | Finite state machine enforced on the backend: Placed → Accepted → Preparing → Ready → Served. Cancellation is strictly limited to Placed or Accepted states. Any line can be voided with a mandatory text reason while the order remains open; voided lines remain preserved in the record for auditability. |
| 5 | Collaborators | Done | The primary waiter or a manager can add and remove collaborating waiters. Waiters automatically see a scoped order list displaying all orders where they are the primary waiter or registered collaborator. |
| 6 | Finding orders | Done | Fully server-side SQL execution for search (table number, waiter name), multi-criteria filtering (status, waiter, date), multi-column sorting (creation time, table, status), and offset pagination with total matching record counts. Zero client-side array filtering. |
| 7 | Acting on many menu items at once | Done | Bulk updates to menu item prices and availability report per-item results (`success` vs. `rejected` with descriptive reasons like negative price) rather than failing the entire batch. Includes CSV export streaming today's orders with line summaries, totals, and statuses. |
| 8 | A dashboard | Done | Server-computed headline metrics: open orders, orders placed today, orders served today, and revenue today. Includes status distribution breakdowns, waiter revenue leaderboards, and an interactive 14-day chronological orders trend chart. |
| 9 | History you cannot rewrite | Done | Append-only `order_history` table records every lifecycle transition (with previous and new values), line additions, line voidings (with required reasons), notes, and collaborator changes. No update or delete endpoints exist for audit records. |
| 10 | Slow-order alerts | Done | Server evaluates orders open > 30 minutes that have not reached Ready using PostgreSQL interval arithmetic. Includes an alert counter badge in the navigation. Acknowledging an alert suppresses it for 15 minutes via `alert_acknowledgements` before automatically re-triggering. |

## How much time did you actually spend?

Approximately 12 hours total, spread across backend architecture, relational schema design with transaction isolation, developing the dynamic Owner staff management feature, testing the application over 1 day on the live deployment, and writing thorough engineering documentation.

## What would you do next, with another 12 hours?
I will further test the website for its proper functioning as instead of quantity of different features I will focus on the quality of existing ones. 

## What are you least happy with in this codebase, and why?

While periodic HTTP polling (15s for alerts, 30s for order detail views) is robust, stateless, and free-tier friendly, true real-time WebSockets would eliminate polling latency during high-speed dinner rushes. Additionally, the cold-start delay (~40s) on Render's free tier can be noticeable on the first request after idle time.
