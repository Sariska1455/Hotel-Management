# Architecture

## What are the moving pieces, and how do they talk to each other?

The system is built as a modular client-server web application split cleanly into three primary tiers:

1. **Frontend (Browser Client)**:
   - Built with React 18, Vite, Lucide Icons, and Recharts.
   - Manages client-side routing via React Router across views for Orders, Order Details, Menu Management, Staff Management, Slow Order Alerts, and the Dashboard.
   - Centralizes authentication in an `AuthContext` (storing JWT tokens and user metadata in `localStorage`) and global alert notifications in an `AlertContext`.
   - Communicates with the backend exclusively over HTTP/REST using the browser's native `fetch` API wrapped in a centralized API service module (`frontend/src/services/api.js`). All authenticated requests attach the JWT via the `Authorization: Bearer <token>` header.

2. **Backend (API Service)**:
   - Built with Node.js and Express.
   - Modularized into declarative route handlers (`/api/auth`, `/api/orders`, `/api/menu-items`, `/api/alerts`, `/api/dashboard`, `/api/users`), request validation middleware using `express-validator`, and JWT authentication/authorization middleware (`authenticate`, `authorize`).
   - Domain logic and database operations are encapsulated in model files (`orderModel.js`, `menuModel.js`, `userModel.js`) executing raw SQL queries via a connection pool.
   - In production, the Express server also serves the compiled static assets (`frontend/dist`) with an SPA fallback route, allowing the entire application to be hosted as a single deployable unit or separated cleanly across CDNs.

3. **Database (Relational Persistence)**:
   - PostgreSQL database managing relational integrity with strict schemas.
   - Enforces domain safety through custom ENUMs (`order_status`, `user_role`), foreign key constraints, `CHECK` constraints (e.g., non-negative prices and positive quantities), composite keys, and explicit row-level transaction locking (`BEGIN` / `SELECT ... FOR UPDATE` / `COMMIT` / `ROLLBACK`).

```
[ Browser (React SPA) ]
         │
         │  HTTP / JSON + JWT (Authorization: Bearer)
         ▼
[ Node.js / Express API Server ]
    ├── Auth & Role Middlewares (JWT verify, role check)
    ├── Routes & Express-Validator (payload hygiene)
    └── Models (orderModel, menuModel, userModel)
         │
         │  pg Connection Pool (Raw Parameterized SQL + Transactions)
         ▼
[ PostgreSQL Database ]
    ├── Tables (users, orders, order_lines, order_collaborators, etc.)
    ├── Enums, Foreign Keys & Check Constraints
    └── Append-Only Audit Log (order_history)
```

---

## Where does each piece run?

- **Frontend Client**: Runs entirely inside the user's browser (Chrome, Firefox, Safari, Edge). The production build consists of pre-compiled static HTML, CSS, and JS bundles.
- **Backend API**: Runs in a Node.js runtime environment (tested on Node v18/v20). In deployment, this is hosted on a containerized cloud host or platform like Render or Railway.
- **Database**: Runs on a managed PostgreSQL instance (e.g., Supabase Postgres or Render Postgres) accessible via SSL connection strings (`DATABASE_URL`).

---

## What is the request path for one representative user action, end to end?

Let's trace **voiding an order line with a mandatory reason** (`PATCH /api/orders/:id/lines/:lineId/void`), which touches security, concurrency, audit logging, and dynamic recalculations:

1. **User Interaction (Browser)**:
   - A waiter viewing Table 4's order in `OrderDetailPage.jsx` clicks the "Void" button next to "Ribeye Steak".
   - The UI displays the `VoidLineModal.jsx` dialog demanding a non-empty explanation.
   - The waiter enters *"Customer changed their mind before cooking started"* and submits.

2. **Network Dispatch**:
   - The frontend API client issues an HTTP `PATCH` to `/api/orders/42/lines/15/void` with JSON body `{"reason": "Customer changed their mind before cooking started"}` and HTTP header `Authorization: Bearer <token>`.

3. **Authentication & Route Ingress**:
   - The Express server receives the request.
   - The `authenticate` middleware intercepts it, parses the bearer token, verifies the cryptographic signature with `JWT_SECRET`, and attaches `req.user = { id: 2, role: 'waiter', ... }` to the request object.
   - The route handler in `backend/src/routes/orders.js` parses the integer parameters `orderId = 42` and `lineId = 15`.

4. **Model Execution & Transaction Isolation**:
   - The route calls `orderModel.voidLine(42, 15, reason, req.user.id, req.user.role)`.
   - A dedicated PostgreSQL client is checked out from `pool.connect()`.
   - A database transaction begins: `BEGIN`.
   - **Row-level lock**: The model executes `SELECT * FROM orders WHERE id = $1 FOR UPDATE`. This serializes concurrent operations on order 42 and blocks race conditions.
   - **State machine check**: Verifies `status NOT IN ('served', 'cancelled')`. If the order were closed, it rolls back and responds with HTTP 400.
   - **Permission verification**: `checkPermission()` runs. If the user is not a manager, it verifies that `primary_waiter_id = 2` OR a row exists in `order_collaborators` matching `order_id = 42 AND user_id = 2`.
   - **Line verification**: Looks up the line in `order_lines`. Verifies it exists, belongs to order 42, and is not already voided.

5. **Data Mutation & Audit Trail**:
   - Executes soft voiding: `UPDATE order_lines SET is_voided = true, void_reason = $1 WHERE id = $2`. The original record is retained intact.
   - Appends an audit event to the immutable log:
     ```sql
     INSERT INTO order_history (order_id, action, details, performed_by)
     VALUES (42, 'line_voided', '{"line_id": 15, "menu_item": "Ribeye Steak", "reason": "..."}', 2);
     ```
   - Bumps order timestamp: `UPDATE orders SET updated_at = NOW() WHERE id = 42`.
   - Commits transaction: `COMMIT`.
   - Client is released back to the pool via `finally { client.release(); }`.

6. **Response Preparation**:
   - The backend executes `getOrderById(42)`, dynamically recalculating the running total by summing only lines where `is_voided = false`.
   - Formats the full order payload (order details, active/voided lines, collaborator list, and the complete audit timeline).
   - Returns HTTP 200 with `{ success: true, data: order }`.

7. **Client Re-render**:
   - React receives the updated payload, updates local component state, renders the line item in a struck-through void style displaying the reason, updates the headline running total, and adds the new audit event into the immutable activity timeline.

---

## What did you decide *not* to build, and why?

1. **WebSockets / Socket.io for Real-Time Push**:
   - *Why omitted*: While real-time updates are convenient, establishing and maintaining persistent WebSocket connections adds significant architectural complexity (heartbeats, sticky sessions for load balancing, reconnection fallbacks, and socket state synchronization). Furthermore, managed serverless/free tiers frequently terminate idle socket connections. Polling intervals (15 seconds for the alert counter badge, 30 seconds for order status views) achieved the exact requirements of Goal 10 with robust, stateless HTTP requests that never fail on hosting restarts.

2. **Client-Side Filtering and In-Memory Pagination**:
   - *Why omitted*: It is tempting to fetch all orders once on application load and let React handle searching, filtering, and sorting in memory. However, Goal 6 strictly mandates server-side operations, and in a production restaurant processing hundreds of tickets daily, downloading the full order database to mobile browser devices degrades memory, burns mobile data, and introduces stale state bugs.

3. **Complex Heavy ORM (Prisma / TypeORM / Sequelize)**:
   - *Why omitted*: ORMs create an unnecessary abstraction layer over SQL. They frequently obscure raw query performance, make row-level locking (`FOR UPDATE`) awkward to express, and add substantial build bundle weight. Using the native `pg` driver with parameterized queries provided 100% clarity over transaction boundaries, query plans, and PostgreSQL interval calculations.

4. **Visual Floor-Plan / Drag-and-Drop Table Canvas**:
   - *Why omitted*: The core prompt emphasizes bulletproof order lifecycles, immutable audit logs, permission enforcement, and batch processing. Spending time building an interactive 2D canvas table designer would have diverted effort from database transaction safety, edge-case validation, and strict API access controls.
