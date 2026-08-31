// ============================================================================
// Seed Data Script — Populates realistic initial menu items and test accounts
// ============================================================================
const pool = require('./config/db');
const bcrypt = require('bcryptjs');

const seedData = async () => {
  console.log('🌱 Starting Database Seeding...');

  try {
    // 1. Create Default Users (1 Manager, 2 Waiters)
    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('password123', salt);

    const usersToInsert = [
      { email: 'manager@restaurant.com', name: 'Alice Vance', role: 'manager' },
      { email: 'waiter@restaurant.com', name: 'Bob Miller', role: 'waiter' },
      { email: 'waiter2@restaurant.com', name: 'Charlie Davis', role: 'waiter' }
    ];

    for (const u of usersToInsert) {
      await pool.query(
        `INSERT INTO users (email, password_hash, name, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO NOTHING`,
        [u.email, defaultPasswordHash, u.name, u.role]
      );
    }
    console.log('✅ Seeded users (manager@restaurant.com, waiter@restaurant.com)');

    // 2. Create Initial Menu Items
    const menuItems = [
      // Starters
      {
        name: 'Paneer Tikka',
        description: 'Tandoor-roasted cottage cheese with capsicum, onion, and fragrant Indian spices.',
        category: 'Starters',
        price: 320,
        is_available: true
      },
      {
        name: 'Samosa Chaat',
        description: 'Crisp samosas topped with chickpea curry, yoghurt, tamarind chutney, and sev.',
        category: 'Starters',
        price: 180,
        is_available: true
      },
      {
        name: 'Tandoori Chicken',
        description: 'Tender chicken marinated in yoghurt and spices, roasted in a traditional clay oven.',
        category: 'Starters',
        price: 360,
        is_available: true
      },

      // Chef Specials / Mains
      {
        name: 'Butter Chicken',
        description: 'Char-grilled chicken in a rich, creamy tomato and fenugreek gravy.',
        category: 'Main Courses',
        price: 420,
        is_available: true
      },
      {
        name: 'Paneer Butter Masala',
        description: 'Soft paneer cubes in a velvety tomato-cashew gravy with aromatic spices.',
        category: 'Main Courses',
        price: 380,
        is_available: true
      },
      {
        name: 'Hyderabadi Veg Biryani',
        description: 'Layered basmati rice, seasonal vegetables, saffron, mint, and whole spices; served with raita.',
        category: 'Main Courses',
        price: 340,
        is_available: true
      },
      {
        name: 'Dal Makhani',
        description: 'Slow-cooked black lentils and kidney beans finished with butter and cream.',
        category: 'Main Courses',
        price: 290,
        is_available: true
      },

      // Desserts
      {
        name: 'Gulab Jamun',
        description: 'Warm milk dumplings soaked in cardamom-scented sugar syrup.',
        category: 'Desserts',
        price: 140,
        is_available: true
      },
      {
        name: 'Kesar Kulfi',
        description: 'Traditional frozen milk dessert flavoured with saffron, pistachio, and cardamom.',
        category: 'Desserts',
        price: 160,
        is_available: true
      },

      // Beverages
      {
        name: 'Masala Chai',
        description: 'Freshly brewed Indian tea with milk, ginger, cardamom, and warming spices.',
        category: 'Artisanal Drinks',
        price: 90,
        is_available: true
      },
      {
        name: 'Mango Lassi',
        description: 'A creamy yoghurt drink blended with ripe mango pulp and a touch of cardamom.',
        category: 'Artisanal Drinks',
        price: 150,
        is_available: true
      }
    ];

    for (const item of menuItems) {
      await pool.query(
        `INSERT INTO menu_items (name, description, category, price, is_available)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [item.name, item.description, item.category, item.price, item.is_available]
      );
    }
    console.log(`✅ Seeded ${menuItems.length} Indian menu items.`);

    console.log('🎉 Seeding complete successfully!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    pool.end();
  }
};

if (require.main === module) {
  seedData();
}

module.exports = seedData;
