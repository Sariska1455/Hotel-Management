# Submission

## Links

- **GitHub repository:** https://github.com/Sariska1455/Hotel-Management
- **Live application:** <deployed URL>

## Notes for the reviewer

- **Seeded data:** The database is pre-seeded with realistic data including multiple users (1 Manager, 2 Waiters), 11 menu items across 4 categories, and 27 realistic orders spanning the past 14 days with full lifecycle histories, price snapshots, voided lines, notes, and collaborators.
- **Quick Demo Login:** On the login page, you can click the quick-login pills for **Manager Demo** or **Waiter Demo** to auto-populate credentials instantly.
- **Single-service deployment ready:** The backend server (`server.js`) can serve the built frontend assets (`frontend/dist`) directly when running in production, or both can be hosted independently.

## Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Manager | manager@restaurant.com | password123 |
| Waiter 1 (Bob) | waiter@restaurant.com | password123 |
| Waiter 2 (Charlie) | waiter2@restaurant.com | password123 |

## Stack

| Layer | What you used | Why |
|-------|---------------|-----|
| Frontend | React 18, Vite, Recharts, Lucide Icons, Vanilla CSS | Rapid rendering, type-safe API consumption, clean glassmorphism UI without framework lock-in, interactive analytics charts |
| Backend | Node.js, Express, JWT, express-validator, bcryptjs | Lightweight, fast asynchronous I/O, robust middleware architecture for authentication & role-based authorization |
| Database | PostgreSQL (pg pool, raw parameterized SQL) | ACID compliance, transactions (`BEGIN`/`COMMIT`/`ROLLBACK`) for lifecycle & history integrity, parameterized queries preventing SQL injection, native date/time interval arithmetic for slow order alerts |
| Hosting | Node.js / Docker ready (e.g. Render / Railway / Supabase Postgres) | Zero-friction deployment with unified build/start scripts |

## Goal checklist

| # | Goal | Status | Notes |
|---|------|--------|-------|
| 1 | Accounts and roles | Done | Role-based authorization enforced strictly on server (`authenticate` & `authorize('manager')` middlewares). Waiters cannot edit menu items or act on other waiters' orders unless added as collaborators. |
| 2 | Orders | Done | Orders created by table number. Primary waiter assigned on creation. Orders can be archived/restored by managers without destroying history. |
| 3 | Order lines | Done | Order lines record menuItemId, quantity, special instructions, and snapshot `unit_price` at the moment of addition. Running total computed server-side from non-voided items. Lines can be added anytime before order is Served. |
| 4 | Order lifecycle with rules | Done | State machine enforced: Placed → Accepted → Preparing → Ready → Served. Cancellation only permitted when Placed or Accepted. Voiding lines requires a non-empty reason and is permitted anytime before Served/Cancelled; voided lines are preserved with reasons. |
| 5 | Collaborators | Done | Primary waiter or managers can add/remove collaborators. Waiter order list automatically scopes to orders where they are primary or collaborator. |
| 6 | Finding orders | Done | Complete server-side filtering (search by table/waiter/ID, status, waiter, date), server-side sorting (by placed time, table, status), and server-side pagination with total count. |
| 7 | Acting on many menu items at once | Done | Bulk updates to prices and availability return per-item reports showing `success` or `rejected` with descriptive reasons (e.g., negative price, exceeding limit). Includes CSV export of today's orders. |
| 8 | A dashboard | Done | Server-computed headline numbers (Open orders, Orders today, Served today, Revenue today), status distribution, waiter revenue leaderboard, and 14-day orders/revenue trend chart. |
| 9 | History you cannot rewrite | Done | Append-only `order_history` table records every status transition (with old/new values), line added, line voided (with reason), note added, and collaborator modification. No update/delete endpoints exist for history. |
| 10 | Slow-order alerts | Done | Server queries orders open > 30 mins not reaching Ready. Real-time alert count badge in navigation. Acknowledging an alert suppresses it for 15 minutes via `alert_acknowledgements` table before re-triggering. |

## How much time did you actually spend?
Approximately 10–11 hours total, prioritizing server-side security, relational database design with transaction safety, and a polished user interface.

## What would you do next, with another 12 hours?
1. Real-time WebSocket or Server-Sent Events (SSE) push updates so kitchen state and alerts reflect instantly without polling.
2. Kitchen Display Screen (KDS) mode with large cards and kitchen station filtering (e.g., grill vs. salad station).
3. Split-billing and receipt printing / PDF export.

## What are you least happy with in this codebase, and why?
Polling intervals (15s for alerts, 30s for order status) are simple and robust, but a bidirectional WebSocket connection (e.g., Socket.io) would provide sub-second updates for busy dinner services.
