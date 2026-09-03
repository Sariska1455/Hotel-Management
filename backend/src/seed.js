// ============================================================================
// Reset & Seed Script — Restora Restaurant Management System
// ============================================================================
// This script:
//   1. Wipes ALL orders, order lines, history, notes, collaborators
//   2. Wipes ALL existing menu items
//   3. Keeps admin, manager, and waiter accounts (recreates if missing)
//   4. Seeds the full Restora menu (pure vegetarian Indian cuisine)
// ============================================================================
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('./config/db');
const bcrypt = require('bcryptjs');

const seedData = async () => {
  console.log('🌱 Starting Restora Reset & Seed...');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Ensure 'admin' role exists ──────────────────────────────────────────
    try {
      await client.query("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin'");
    } catch (e) { /* already exists */ }

    // ── 1. WIPE all order-related data (respecting FK order) ───────────────
    await client.query('DELETE FROM order_history');
    await client.query('DELETE FROM order_notes');
    await client.query('DELETE FROM order_collaborators');
    await client.query('DELETE FROM order_lines');
    await client.query('DELETE FROM orders');
    console.log('✅ Cleared all orders and history');

    // ── 2. WIPE all menu items ─────────────────────────────────────────────
    await client.query('DELETE FROM menu_items');
    // Reset the sequence so IDs start from 1
    await client.query("SELECT setval(pg_get_serial_sequence('menu_items', 'id'), 1, false)");
    console.log('✅ Cleared all menu items');

    // ── 3. Provision core staff accounts (admin + manager + waiter) ────────
    const salt = await bcrypt.genSalt(10);
    const defaultHash = await bcrypt.hash('password123', salt);

    const adminEmail    = process.env.ADMIN_EMAIL    || 'admin@restora.in';
    const adminPassword = process.env.ADMIN_PASSWORD || 'adminPassword123!';
    const adminHash     = await bcrypt.hash(adminPassword, salt);
    const adminName     = process.env.ADMIN_NAME     || 'Restaurant Owner';

    const coreUsers = [
      { email: adminEmail,              passwordHash: adminHash,   name: adminName,        role: 'admin'   },
      { email: 'manager@restora.in',    passwordHash: defaultHash, name: 'Priya Sharma',   role: 'manager' },
      { email: 'waiter@restora.in',     passwordHash: defaultHash, name: 'Ravi Kumar',     role: 'waiter'  },
    ];

    for (const u of coreUsers) {
      await client.query(
        `INSERT INTO users (email, password_hash, name, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE
           SET name = EXCLUDED.name,
               password_hash = EXCLUDED.password_hash,
               role = EXCLUDED.role,
               deleted_at = NULL`,
        [u.email, u.passwordHash, u.name, u.role],
      );
    }
    console.log('✅ Core staff accounts ready (admin, manager, waiter)');

    // ── 4. Full Restora Menu ───────────────────────────────────────────────
    const menu = [
      // ── Beverages ──────────────────────────────────────────────────────
      { name: 'Masala Chai',        desc: 'Classic Indian spiced tea brewed with ginger, cardamom, and fresh milk.',                                               cat: 'Beverages',               price: 40  },
      { name: 'Ginger Tea',         desc: 'Strong black tea infused with freshly crushed ginger — warming and invigorating.',                                      cat: 'Beverages',               price: 45  },
      { name: 'Cold Coffee',        desc: 'Rich blended coffee with chilled milk and ice cream — a café-style classic.',                                            cat: 'Beverages',               price: 90  },
      { name: 'Sweet Lassi',        desc: 'Thick chilled yoghurt blended with sugar and a pinch of cardamom.',                                                     cat: 'Beverages',               price: 80  },
      { name: 'Masala Chaas',       desc: 'Salted buttermilk tempered with cumin, green chilli, and fresh coriander — a digestive cooler.',                        cat: 'Beverages',               price: 60  },
      { name: 'Fresh Lime Soda',    desc: 'Chilled sparkling water with freshly squeezed lime, sugar, and a pinch of black salt.',                                 cat: 'Beverages',               price: 70  },
      { name: 'Mango Lassi',        desc: 'Creamy yoghurt drink blended with ripe Alphonso mango pulp and a whisper of cardamom.',                                 cat: 'Beverages',               price: 100 },

      // ── Starters ───────────────────────────────────────────────────────
      { name: 'Paneer Tikka',       desc: 'Tandoor-roasted cottage cheese marinated in spiced yoghurt, served with mint chutney and pickled onion.',              cat: 'Starters',                price: 220 },
      { name: 'Hara Bhara Kebab',   desc: 'Spinach and pea patties bound with paneer, pan-seared golden, with a coriander dip.',                                  cat: 'Starters',                price: 180 },
      { name: 'Veg Seekh Kebab',    desc: 'Spiced mixed vegetable and lentil kebabs flame-grilled on skewers; served with green chutney.',                         cat: 'Starters',                price: 190 },
      { name: 'Chilli Paneer',      desc: 'Indo-Chinese crispy cottage cheese tossed with capsicum, onion, soy, and chilli sauce.',                                cat: 'Starters',                price: 210 },
      { name: 'Crispy Corn',        desc: 'Sweet corn kernels fried golden, tossed with spices, lime, and chopped herbs.',                                         cat: 'Starters',                price: 170 },
      { name: 'Veg Manchurian',     desc: 'Crispy vegetable dumplings in a tangy, spicy Manchurian sauce — a crowd favourite.',                                    cat: 'Starters',                price: 180 },
      { name: 'Tandoori Mushroom',  desc: 'Button mushrooms marinated in spiced yoghurt and roasted in a clay oven; served with chutney.',                         cat: 'Starters',                price: 220 },
      { name: 'Dahi Ke Kebab',      desc: 'Melt-in-the-mouth hung curd kebabs with cashew and raisin filling; lightly pan-seared.',                               cat: 'Starters',                price: 200 },

      // ── Main Course — North Indian ──────────────────────────────────────
      { name: 'Paneer Butter Masala',   desc: 'Soft paneer in a velvety tomato-cashew gravy with butter and cream — the timeless Punjabi classic.',              cat: 'Main Course — North Indian', price: 240 },
      { name: 'Shahi Paneer',           desc: 'Cottage cheese in a rich, aromatic Mughlai-style gravy of cashew, cream, and whole spices.',                      cat: 'Main Course — North Indian', price: 230 },
      { name: 'Kadai Paneer',           desc: 'Paneer and capsicum stir-fried in a robust kadai spice blend of coriander, cumin, and Kashmiri chilli.',           cat: 'Main Course — North Indian', price: 240 },
      { name: 'Palak Paneer',           desc: 'Creamed spinach gravy with soft paneer cubes, tempered with garlic and a touch of cream.',                         cat: 'Main Course — North Indian', price: 230 },
      { name: 'Paneer Tikka Masala',    desc: 'Tandoor-charred paneer tikka finished in a smoky, spiced tomato-onion masala gravy.',                              cat: 'Main Course — North Indian', price: 250 },
      { name: 'Dal Makhani',            desc: 'Black lentils slow-cooked overnight on charcoal, finished with pure ghee and aged cream.',                         cat: 'Main Course — North Indian', price: 190 },
      { name: 'Dal Tadka',              desc: 'Yellow lentils tempered with ghee, cumin, dried red chilli, garlic, and fresh coriander.',                         cat: 'Main Course — North Indian', price: 160 },
      { name: 'Chole Masala',           desc: 'Amritsari-style chickpeas slow-cooked in a robust spiced gravy with fried onion and tea-leaf depth.',              cat: 'Main Course — North Indian', price: 170 },
      { name: 'Rajma Masala',           desc: 'Hearty kidney beans in a tangy, deeply spiced tomato-onion gravy — comfort food at its finest.',                   cat: 'Main Course — North Indian', price: 180 },
      { name: 'Mix Veg Curry',          desc: 'Seasonal vegetables simmered in a home-style masala gravy with fresh tomatoes and whole spices.',                  cat: 'Main Course — North Indian', price: 190 },
      { name: 'Veg Kolhapuri',          desc: 'Fiery Maharashtrian-style mixed vegetables in a bold coconut-based masala paste.',                                 cat: 'Main Course — North Indian', price: 210 },
      { name: 'Malai Kofta',            desc: 'Delicate paneer and potato dumplings in a mild, creamy tomato-cashew sauce.',                                      cat: 'Main Course — North Indian', price: 240 },

      // ── Rice & Biryani ─────────────────────────────────────────────────
      { name: 'Steamed Rice',       desc: 'Fluffy long-grain basmati rice steamed to perfection — pairs with any curry.',                                          cat: 'Rice & Biryani',          price: 120 },
      { name: 'Jeera Rice',         desc: 'Fragrant basmati rice tempered with cumin seeds and a touch of ghee.',                                                  cat: 'Rice & Biryani',          price: 140 },
      { name: 'Veg Pulao',          desc: 'Basmati rice cooked with seasonal vegetables and whole spices in a light vegetable stock.',                             cat: 'Rice & Biryani',          price: 160 },
      { name: 'Veg Biryani',        desc: 'Slow-dum cooked basmati rice layered with spiced vegetables, saffron, and fried onion; served with raita.',            cat: 'Rice & Biryani',          price: 220 },
      { name: 'Paneer Biryani',     desc: 'Fragrant dum biryani with marinated paneer tikka, caramelised onion, and fresh mint.',                                  cat: 'Rice & Biryani',          price: 250 },
      { name: 'Kashmiri Pulao',     desc: 'Saffron rice cooked with dried fruits, nuts, and aromatic Kashmiri spices — mildly sweet and fragrant.',               cat: 'Rice & Biryani',          price: 200 },

      // ── Indian Breads ──────────────────────────────────────────────────
      { name: 'Tandoori Roti',      desc: 'Whole wheat flatbread baked in a clay oven — light, slightly charred, and wholesome.',                                  cat: 'Indian Breads',           price: 25  },
      { name: 'Butter Roti',        desc: 'Soft whole wheat roti brushed generously with salted butter, straight off the tawa.',                                   cat: 'Indian Breads',           price: 35  },
      { name: 'Plain Naan',         desc: 'Leavened white bread baked in a traditional tandoor — pillowy and slightly charred.',                                   cat: 'Indian Breads',           price: 50  },
      { name: 'Butter Naan',        desc: 'Soft tandoor-baked naan slathered with rich salted butter.',                                                            cat: 'Indian Breads',           price: 60  },
      { name: 'Garlic Naan',        desc: 'Tandoor naan topped with roasted garlic, butter, and fresh coriander.',                                                 cat: 'Indian Breads',           price: 80  },
      { name: 'Cheese Naan',        desc: 'Tandoor naan stuffed with melted processed cheese — indulgent and crowd-pleasing.',                                     cat: 'Indian Breads',           price: 110 },
      { name: 'Laccha Paratha',     desc: 'Multi-layered whole wheat paratha brushed with ghee — flaky, buttery, and served piping hot.',                          cat: 'Indian Breads',           price: 70  },
      { name: 'Stuffed Aloo Paratha', desc: 'Whole wheat paratha stuffed with spiced mashed potato, served with white butter and pickle.',                        cat: 'Indian Breads',           price: 100 },

      // ── Thali ──────────────────────────────────────────────────────────
      { name: 'Mini Veg Thali',     desc: 'A wholesome mini thali — 1 vegetable, dal, rice, 1 roti, and a small sweet.',                                          cat: 'Thali',                   price: 180 },
      { name: 'Punjabi Thali',      desc: 'A hearty Punjabi spread — 2 vegetables, dal makhani, rice, 2 rotis, salad, raita, and papad.',                         cat: 'Thali',                   price: 280 },
      { name: 'Special Veg Thali',  desc: '2 vegetables, dal, rice, 2 rotis, salad, raita, papad, sweet & pickle — the complete Restora experience.',             cat: 'Thali',                   price: 350 },
      { name: 'Jain Thali',         desc: 'A no-root-vegetable thali — 2 Jain curries, Jain dal, rice, 2 rotis, papad, and a sweet.',                            cat: 'Thali',                   price: 300 },

      // ── Sides ──────────────────────────────────────────────────────────
      { name: 'Boondi Raita',       desc: 'Chilled yoghurt with crispy boondi pearls, cumin, and fresh coriander.',                                               cat: 'Sides',                   price: 90  },
      { name: 'Mix Veg Raita',      desc: 'Fresh yoghurt with grated cucumber, carrot, and beetroot; lightly spiced with roasted cumin.',                          cat: 'Sides',                   price: 100 },
      { name: 'Green Salad',        desc: 'Crisp cucumber, tomato, onion, and carrot with a lemon-chaat masala dressing.',                                         cat: 'Sides',                   price: 80  },
      { name: 'Onion Salad',        desc: 'Thinly sliced onion rings with lemon juice, green chilli, and a dash of chaat masala.',                                 cat: 'Sides',                   price: 50  },
      { name: 'Roasted Papad',      desc: 'Crispy urad dal papad roasted over an open flame — light and addictive.',                                               cat: 'Sides',                   price: 30  },
      { name: 'Masala Papad',       desc: 'Roasted papad topped with chopped tomato, onion, green chilli, and a drizzle of tamarind chutney.',                    cat: 'Sides',                   price: 60  },

      // ── Desserts ───────────────────────────────────────────────────────
      { name: 'Gulab Jamun (2 pcs)',   desc: 'Warm soft khoya dumplings soaked in cardamom and rose water syrup; served with a scoop of ice cream.',              cat: 'Desserts',                price: 80  },
      { name: 'Rasmalai (2 pcs)',      desc: 'Soft cottage cheese patties soaked in chilled saffron-cardamom milk; garnished with pistachios.',                   cat: 'Desserts',                price: 120 },
      { name: 'Gajar Ka Halwa',        desc: 'Slow-cooked carrot pudding with pure ghee, milk, sugar, and crushed cardamom; garnished with cashews.',             cat: 'Desserts',                price: 110 },
      { name: 'Kesar Kulfi',           desc: 'Traditional frozen milk dessert flavoured with saffron, pistachio, and cardamom — denser and richer than ice cream.', cat: 'Desserts',             price: 100 },
      { name: 'Rabri',                 desc: 'Thickened reduced milk sweetened with sugar and cardamom; served chilled with slivered almonds and rose petals.',   cat: 'Desserts',                price: 130 },
      { name: 'Moong Dal Halwa',       desc: 'Rich and aromatic split moong dal slow-cooked in ghee with sugar, saffron, and dry fruits — a Rajasthani gem.',    cat: 'Desserts',                price: 120 },

      // ── Jain Specials ──────────────────────────────────────────────────
      { name: 'Jain Paneer Masala',    desc: 'No-onion, no-garlic, no-root-vegetable cottage cheese curry in a spiced tomato-cashew gravy.',                      cat: 'Jain Specials',           price: 240 },
      { name: 'Jain Mix Veg',          desc: 'Seasonal above-ground vegetables cooked in a Jain-approved spiced tomato gravy — pure and flavourful.',             cat: 'Jain Specials',           price: 200 },
      { name: 'Jain Dal Tadka',        desc: 'Yellow lentils tempered with ghee and cumin, strictly no onion or garlic — clean and wholesome.',                   cat: 'Jain Specials',           price: 170 },
      { name: 'Jain Veg Biryani',      desc: 'Aromatic dum biryani prepared without onion, garlic, or root vegetables — lightly spiced and fragrant.',            cat: 'Jain Specials',           price: 220 },
      { name: 'Jain Special Thali',    desc: 'Complete Jain meal — 2 Jain curries, Jain dal, rice, 2 rotis, papad, raita (no onion/garlic/root veg).',           cat: 'Jain Specials',           price: 300 },
    ];

    for (const item of menu) {
      await client.query(
        `INSERT INTO menu_items (name, description, category, price, is_available)
         VALUES ($1, $2, $3, $4, true)`,
        [item.name, item.desc, item.cat, item.price],
      );
    }
    console.log(`✅ Seeded ${menu.length} menu items across 9 categories`);

    // ── 5. No demo orders — day one fresh ─────────────────────────────────
    console.log('ℹ️  No demo orders — Restora opens clean today.');

    await client.query('COMMIT');
    console.log('🎉 Restora reset complete! Brand new, ready to serve.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Reset failed:', err);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
};

if (require.main === module) {
  seedData();
}

module.exports = seedData;
