// ============================================================================
// Seed Data Script — Populates realistic initial data for demo/review
// ============================================================================
// Creates: users, menu items, orders across 14 days with varied statuses,
//          order lines, timeline history, collaborators, notes.
// ============================================================================
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('./config/db');
const bcrypt = require('bcryptjs');

const seedData = async () => {
  console.log('🌱 Starting Database Seeding...');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure 'admin' role exists in PostgreSQL enum
    try {
      await client.query("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin'");
    } catch (e) {
      // Ignore if already added
    }

    // ---- 1. Users ----
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('password123', salt);

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@restaurant.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'adminPassword123!';
    const adminHash = await bcrypt.hash(adminPassword, salt);

    const users = [
      { email: adminEmail, passwordHash: adminHash, name: process.env.ADMIN_NAME || 'Restaurant Owner', role: 'admin' },
      { email: 'manager@restaurant.com', passwordHash: hash, name: 'Alice Vance', role: 'manager' },
      { email: 'waiter@restaurant.com', passwordHash: hash, name: 'Bob Miller', role: 'waiter' },
      { email: 'waiter2@restaurant.com', passwordHash: hash, name: 'Charlie Davis', role: 'waiter' },
    ];

    const userIds = {};
    for (const u of users) {
      const { rows } = await client.query(
        `INSERT INTO users (email, password_hash, name, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
         RETURNING id`,
        [u.email, u.passwordHash, u.name, u.role],
      );
      userIds[u.email] = rows[0].id;
    }
    console.log('✅ Seeded users (including Admin from .env)');

    // ---- 2. Menu Items ----
    const menuItems = [
      { name: 'Paneer Tikka', desc: 'Tandoor-roasted cottage cheese with capsicum, onion, and fragrant Indian spices.', cat: 'Starters', price: 320 },
      { name: 'Samosa Chaat', desc: 'Crisp samosas topped with chickpea curry, yoghurt, tamarind chutney, and sev.', cat: 'Starters', price: 180 },
      { name: 'Tandoori Chicken', desc: 'Tender chicken marinated in yoghurt and spices, roasted in a traditional clay oven.', cat: 'Starters', price: 360 },
      { name: 'Butter Chicken', desc: 'Char-grilled chicken in a rich, creamy tomato and fenugreek gravy.', cat: 'Main Courses', price: 420 },
      { name: 'Paneer Butter Masala', desc: 'Soft paneer cubes in a velvety tomato-cashew gravy with aromatic spices.', cat: 'Main Courses', price: 380 },
      { name: 'Hyderabadi Veg Biryani', desc: 'Layered basmati rice, seasonal vegetables, saffron, mint, and whole spices; served with raita.', cat: 'Main Courses', price: 340 },
      { name: 'Dal Makhani', desc: 'Slow-cooked black lentils and kidney beans finished with butter and cream.', cat: 'Main Courses', price: 290 },
      { name: 'Gulab Jamun', desc: 'Warm milk dumplings soaked in cardamom-scented sugar syrup.', cat: 'Desserts', price: 140 },
      { name: 'Kesar Kulfi', desc: 'Traditional frozen milk dessert flavoured with saffron, pistachio, and cardamom.', cat: 'Desserts', price: 160 },
      { name: 'Masala Chai', desc: 'Freshly brewed Indian tea with milk, ginger, cardamom, and warming spices.', cat: 'Artisanal Drinks', price: 90 },
      { name: 'Mango Lassi', desc: 'A creamy yoghurt drink blended with ripe mango pulp and a touch of cardamom.', cat: 'Artisanal Drinks', price: 150 },
    ];

    const menuIds = {};
    for (const item of menuItems) {
      const { rows } = await client.query(
        `INSERT INTO menu_items (name, description, category, price, is_available)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [item.name, item.desc, item.cat, item.price],
      );
      if (rows.length > 0) {
        menuIds[item.name] = rows[0].id;
      } else {
        // Already exists, fetch id
        const { rows: existing } = await client.query(
          'SELECT id FROM menu_items WHERE name = $1', [item.name],
        );
        menuIds[item.name] = existing[0]?.id;
      }
    }
    console.log(`✅ Seeded ${menuItems.length} menu items`);

    // ---- 3. Demo Orders (spread across 14 days) ----
    const managerId = userIds['manager@restaurant.com'];
    const bobId = userIds['waiter@restaurant.com'];
    const charlieId = userIds['waiter2@restaurant.com'];

    // Helper to build timestamped orders
    const daysAgo = (d, h = 12, m = 0) => {
      const dt = new Date();
      dt.setDate(dt.getDate() - d);
      dt.setHours(h, m, 0, 0);
      return dt.toISOString();
    };

    // Order definitions: spread across 14 days for chart data
    const orderDefs = [
      // --- Today: 3 orders (1 placed, 1 preparing, 1 served) ---
      { table: '3', waiter: bobId, status: 'served', daysAgo: 0, h: 10, items: [['Butter Chicken', 2], ['Masala Chai', 2]], note: 'Guests loved the butter chicken' },
      { table: '7', waiter: bobId, status: 'preparing', daysAgo: 0, h: 11, items: [['Paneer Tikka', 1], ['Paneer Butter Masala', 2]], collabs: [charlieId] },
      { table: '12', waiter: charlieId, status: 'placed', daysAgo: 0, h: 12, items: [['Tandoori Chicken', 1], ['Samosa Chaat', 2]], note: 'VIP table — rush please' },

      // --- Yesterday: 3 served ---
      { table: '1', waiter: bobId, status: 'served', daysAgo: 1, h: 13, items: [['Butter Chicken', 1], ['Dal Makhani', 1], ['Masala Chai', 3]] },
      { table: '5', waiter: charlieId, status: 'served', daysAgo: 1, h: 14, items: [['Hyderabadi Veg Biryani', 2], ['Gulab Jamun', 2]] },
      { table: '9', waiter: charlieId, status: 'cancelled', daysAgo: 1, h: 15, items: [['Paneer Tikka', 2]], note: 'Guest left early' },

      // --- 2 days ago: 2 served ---
      { table: '2', waiter: bobId, status: 'served', daysAgo: 2, h: 12, items: [['Samosa Chaat', 3], ['Tandoori Chicken', 2], ['Masala Chai', 4]] },
      { table: '4', waiter: charlieId, status: 'served', daysAgo: 2, h: 18, items: [['Paneer Butter Masala', 1], ['Kesar Kulfi', 2]] },

      // --- 3 days ago: 3 served ---
      { table: '6', waiter: bobId, status: 'served', daysAgo: 3, h: 11, items: [['Butter Chicken', 3], ['Paneer Tikka', 2]] },
      { table: '8', waiter: charlieId, status: 'served', daysAgo: 3, h: 13, items: [['Dal Makhani', 2], ['Mango Lassi', 3]] },
      { table: '10', waiter: bobId, status: 'served', daysAgo: 3, h: 19, items: [['Hyderabadi Veg Biryani', 1], ['Gulab Jamun', 2]] },

      // --- 4 days ago: 2 served ---
      { table: '1', waiter: charlieId, status: 'served', daysAgo: 4, h: 12, items: [['Tandoori Chicken', 2], ['Masala Chai', 2]] },
      { table: '3', waiter: bobId, status: 'served', daysAgo: 4, h: 14, items: [['Paneer Butter Masala', 3], ['Samosa Chaat', 1]] },

      // --- 5 days ago: 1 served ---
      { table: '5', waiter: bobId, status: 'served', daysAgo: 5, h: 13, items: [['Butter Chicken', 2], ['Kesar Kulfi', 2], ['Masala Chai', 2]] },

      // --- 6 days ago: 3 served ---
      { table: '2', waiter: charlieId, status: 'served', daysAgo: 6, h: 12, items: [['Dal Makhani', 1], ['Mango Lassi', 2]] },
      { table: '7', waiter: bobId, status: 'served', daysAgo: 6, h: 15, items: [['Paneer Tikka', 1], ['Tandoori Chicken', 1]] },
      { table: '4', waiter: charlieId, status: 'served', daysAgo: 6, h: 18, items: [['Hyderabadi Veg Biryani', 2]] },

      // --- 7 days ago: 2 served ---
      { table: '9', waiter: bobId, status: 'served', daysAgo: 7, h: 13, items: [['Butter Chicken', 1], ['Gulab Jamun', 3]] },
      { table: '6', waiter: charlieId, status: 'served', daysAgo: 7, h: 17, items: [['Paneer Butter Masala', 2], ['Masala Chai', 4]] },

      // --- 8–13 days ago: 1-2 served each to fill chart ---
      { table: '1', waiter: bobId, status: 'served', daysAgo: 8, h: 12, items: [['Tandoori Chicken', 1], ['Dal Makhani', 1]] },
      { table: '3', waiter: charlieId, status: 'served', daysAgo: 9, h: 14, items: [['Samosa Chaat', 2], ['Masala Chai', 2]] },
      { table: '5', waiter: bobId, status: 'served', daysAgo: 9, h: 18, items: [['Butter Chicken', 2]] },
      { table: '2', waiter: charlieId, status: 'served', daysAgo: 10, h: 13, items: [['Paneer Tikka', 2], ['Mango Lassi', 1]] },
      { table: '7', waiter: bobId, status: 'served', daysAgo: 11, h: 12, items: [['Hyderabadi Veg Biryani', 1], ['Gulab Jamun', 2]] },
      { table: '4', waiter: charlieId, status: 'served', daysAgo: 12, h: 14, items: [['Butter Chicken', 1], ['Kesar Kulfi', 1]] },
      { table: '8', waiter: bobId, status: 'served', daysAgo: 13, h: 11, items: [['Tandoori Chicken', 2], ['Masala Chai', 3]] },
    ];

    // Lifecycle steps per status
    const lifecycleSteps = {
      placed: ['placed'],
      accepted: ['placed', 'accepted'],
      preparing: ['placed', 'accepted', 'preparing'],
      ready: ['placed', 'accepted', 'preparing', 'ready'],
      served: ['placed', 'accepted', 'preparing', 'ready', 'served'],
      cancelled: ['placed', 'cancelled'],
    };

    for (const def of orderDefs) {
      const createdAt = daysAgo(def.daysAgo, def.h, 0);
      const steps = lifecycleSteps[def.status];

      // Insert order at initial "placed" status, then update to final
      const { rows: [order] } = await client.query(
        `INSERT INTO orders (table_number, status, primary_waiter_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $4) RETURNING id`,
        [def.table, def.status, def.waiter, createdAt],
      );

      // Insert order lines
      for (const [itemName, qty] of def.items) {
        const menuId = menuIds[itemName];
        const price = menuItems.find(m => m.name === itemName)?.price || 0;
        if (menuId) {
          await client.query(
            `INSERT INTO order_lines (order_id, menu_item_id, quantity, unit_price, created_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [order.id, menuId, qty, price, createdAt],
          );
        }
      }

      // Insert timeline history
      let prevStatus = null;
      for (let i = 0; i < steps.length; i++) {
        const stepTime = new Date(new Date(createdAt).getTime() + i * 10 * 60000).toISOString();
        const actor = i === 0 ? def.waiter : managerId;
        await client.query(
          `INSERT INTO order_history (order_id, action, old_value, new_value, details, performed_by, created_at)
           VALUES ($1, 'status_change', $2, $3, $4, $5, $6)`,
          [
            order.id,
            prevStatus,
            steps[i],
            JSON.stringify({ old_status: prevStatus, new_status: steps[i] }),
            actor,
            stepTime,
          ],
        );
        prevStatus = steps[i];
      }

      // Add collaborators
      if (def.collabs) {
        for (const collabId of def.collabs) {
          await client.query(
            'INSERT INTO order_collaborators (order_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [order.id, collabId],
          );
          await client.query(
            `INSERT INTO order_history (order_id, action, details, performed_by, created_at)
             VALUES ($1, 'collaborator_added', $2, $3, $4)`,
            [
              order.id,
              JSON.stringify({ collaborator_id: collabId, collaborator_name: users.find(u => userIds[u.email] === collabId)?.name }),
              def.waiter,
              createdAt,
            ],
          );
        }
      }

      // Add notes
      if (def.note) {
        await client.query(
          'INSERT INTO order_notes (order_id, content, created_by, created_at) VALUES ($1, $2, $3, $4)',
          [order.id, def.note, def.waiter, createdAt],
        );
        await client.query(
          `INSERT INTO order_history (order_id, action, details, performed_by, created_at)
           VALUES ($1, 'note_added', $2, $3, $4)`,
          [order.id, JSON.stringify({ note: def.note }), def.waiter, createdAt],
        );
      }
    }
    console.log(`✅ Seeded ${orderDefs.length} demo orders with history`);

    await client.query('COMMIT');
    console.log('🎉 Seeding complete!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err);
  } finally {
    client.release();
    pool.end();
  }
};

if (require.main === module) {
  seedData();
}

module.exports = seedData;
