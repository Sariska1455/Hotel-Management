// ============================================================================
// Menu Service — API Calls & Local Demo Fallback Data
// ============================================================================
import api from './api';

// Realistic Initial Seed Data for offline/demo testing
const INITIAL_DEMO_MENU = [
  {
    id: 1,
    name: 'Paneer Tikka',
    description: 'Tandoor-roasted cottage cheese with capsicum, onion, and fragrant Indian spices.',
    category: 'Starters',
    price: 320,
    is_available: true,
    is_archived: false
  },
  {
    id: 2,
    name: 'Samosa Chaat',
    description: 'Crisp samosas topped with chickpea curry, yoghurt, tamarind chutney, and sev.',
    category: 'Starters',
    price: 180,
    is_available: true,
    is_archived: false
  },
  {
    id: 3,
    name: 'Tandoori Chicken',
    description: 'Tender chicken marinated in yoghurt and spices, roasted in a traditional clay oven.',
    category: 'Starters',
    price: 360,
    is_available: true,
    is_archived: false
  },
  {
    id: 4,
    name: 'Butter Chicken',
    description: 'Char-grilled chicken in a rich, creamy tomato and fenugreek gravy.',
    category: 'Main Courses',
    price: 420,
    is_available: true,
    is_archived: false
  },
  {
    id: 5,
    name: 'Paneer Butter Masala',
    description: 'Soft paneer cubes in a velvety tomato-cashew gravy with aromatic spices.',
    category: 'Main Courses',
    price: 380,
    is_available: true,
    is_archived: false
  },
  {
    id: 6,
    name: 'Hyderabadi Veg Biryani',
    description: 'Layered basmati rice, seasonal vegetables, saffron, mint, and whole spices; served with raita.',
    category: 'Main Courses',
    price: 340,
    is_available: false,
    is_archived: false
  },
  {
    id: 7,
    name: 'Gulab Jamun',
    description: 'Warm milk dumplings soaked in cardamom-scented sugar syrup.',
    category: 'Desserts',
    price: 140,
    is_available: true,
    is_archived: false
  },
  {
    id: 8,
    name: 'Masala Chai',
    description: 'Freshly brewed Indian tea with milk, ginger, cardamom, and warming spices.',
    category: 'Artisanal Drinks',
    price: 90,
    is_available: true,
    is_archived: false
  }
];

const getStoredLocalMenu = () => {
  // Versioned key ensures existing demo users receive the Indian menu too.
  const stored = localStorage.getItem('corkboard_demo_menu_inr_v1');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      // ignore
    }
  }
  localStorage.setItem('corkboard_demo_menu_inr_v1', JSON.stringify(INITIAL_DEMO_MENU));
  return INITIAL_DEMO_MENU;
};

const saveStoredLocalMenu = (menu) => {
  localStorage.setItem('corkboard_demo_menu_inr_v1', JSON.stringify(menu));
};

const isDemoMode = () => {
  const token = localStorage.getItem('token');
  return !token || token.startsWith('demo-jwt-token');
};

export const menuService = {
  // Fetch all menu items
  getMenuItems: async ({ category = 'All', search = '', includeArchived = false } = {}) => {
    if (isDemoMode()) {
      let items = getStoredLocalMenu();
      if (!includeArchived) {
        items = items.filter(i => !i.is_archived);
      }
      if (category && category !== 'All') {
        items = items.filter(i => i.category === category);
      }
      if (search) {
        const query = search.toLowerCase();
        items = items.filter(i => i.name.toLowerCase().includes(query) || i.description.toLowerCase().includes(query));
      }
      return items;
    }

    try {
      const response = await api.get('/menu-items', {
        params: { category, search, includeArchived }
      });
      return response.data.data;
    } catch (err) {
      // Fallback if backend API is offline
      let items = getStoredLocalMenu();
      if (!includeArchived) items = items.filter(i => !i.is_archived);
      if (category && category !== 'All') items = items.filter(i => i.category === category);
      if (search) {
        const query = search.toLowerCase();
        items = items.filter(i => i.name.toLowerCase().includes(query) || i.description.toLowerCase().includes(query));
      }
      return items;
    }
  },

  // Create menu item
  createMenuItem: async (itemData) => {
    if (isDemoMode()) {
      const items = getStoredLocalMenu();
      const newItem = {
        id: Date.now(),
        ...itemData,
        price: parseFloat(itemData.price),
        is_available: itemData.is_available !== undefined ? itemData.is_available : true,
        is_archived: false
      };
      items.push(newItem);
      saveStoredLocalMenu(items);
      return newItem;
    }

    try {
      const response = await api.post('/menu-items', itemData);
      return response.data.data;
    } catch (err) {
      const items = getStoredLocalMenu();
      const newItem = {
        id: Date.now(),
        ...itemData,
        price: parseFloat(itemData.price),
        is_available: itemData.is_available !== undefined ? itemData.is_available : true,
        is_archived: false
      };
      items.push(newItem);
      saveStoredLocalMenu(items);
      return newItem;
    }
  },

  // Update menu item
  updateMenuItem: async (id, updateData) => {
    if (isDemoMode()) {
      const items = getStoredLocalMenu();
      const index = items.findIndex(i => i.id === Number(id));
      if (index !== -1) {
        items[index] = {
          ...items[index],
          ...updateData,
          price: updateData.price !== undefined ? parseFloat(updateData.price) : items[index].price
        };
        saveStoredLocalMenu(items);
        return items[index];
      }
      throw new Error('Item not found');
    }

    try {
      const response = await api.put(`/menu-items/${id}`, updateData);
      return response.data.data;
    } catch (err) {
      const items = getStoredLocalMenu();
      const index = items.findIndex(i => i.id === Number(id));
      if (index !== -1) {
        items[index] = {
          ...items[index],
          ...updateData,
          price: updateData.price !== undefined ? parseFloat(updateData.price) : items[index].price
        };
        saveStoredLocalMenu(items);
        return items[index];
      }
      throw new Error('Item not found');
    }
  },

  // Bulk update menu items (Goal 7)
  bulkUpdateMenuItems: async ({ itemIds, price, is_available }) => {
    if (isDemoMode()) {
      const items = getStoredLocalMenu();
      const results = [];

      for (const id of itemIds) {
        const item = items.find(i => i.id === Number(id));
        if (!item) {
          results.push({ id, name: `Item #${id}`, status: 'rejected', reason: 'Menu item not found' });
          continue;
        }

        if (price !== undefined && price !== null && (isNaN(price) || parseFloat(price) < 0)) {
          results.push({
            id,
            name: item.name,
            status: 'rejected',
            reason: `Invalid price (₹${price}). Price cannot be negative.`
          });
          continue;
        }

        if (price !== undefined && price !== null && parseFloat(price) > 100000) {
          results.push({
            id,
            name: item.name,
            status: 'rejected',
            reason: `Price (₹${price}) exceeds safety limit of ₹100,000.00`
          });
          continue;
        }

        if (price !== undefined && price !== null) item.price = parseFloat(price);
        if (is_available !== undefined && is_available !== null) item.is_available = is_available;

        results.push({ id, name: item.name, status: 'success', item });
      }

      saveStoredLocalMenu(items);

      const totalSuccess = results.filter(r => r.status === 'success').length;
      const totalRejected = results.filter(r => r.status === 'rejected').length;

      return {
        success: true,
        summary: { totalProcessed: itemIds.length, totalSuccess, totalRejected },
        data: results
      };
    }

    try {
      const response = await api.patch('/menu-items/bulk', { itemIds, price, is_available });
      return response.data;
    } catch (err) {
      const items = getStoredLocalMenu();
      const results = [];

      for (const id of itemIds) {
        const item = items.find(i => i.id === Number(id));
        if (!item) {
          results.push({ id, name: `Item #${id}`, status: 'rejected', reason: 'Menu item not found' });
          continue;
        }

        if (price !== undefined && price !== null && (isNaN(price) || parseFloat(price) < 0)) {
          results.push({
            id,
            name: item.name,
            status: 'rejected',
            reason: `Invalid price (₹${price}). Price cannot be negative.`
          });
          continue;
        }

        if (price !== undefined && price !== null && parseFloat(price) > 100000) {
          results.push({
            id,
            name: item.name,
            status: 'rejected',
            reason: `Price (₹${price}) exceeds safety limit of ₹100,000.00`
          });
          continue;
        }

        if (price !== undefined && price !== null) item.price = parseFloat(price);
        if (is_available !== undefined && is_available !== null) item.is_available = is_available;

        results.push({ id, name: item.name, status: 'success', item });
      }

      saveStoredLocalMenu(items);

      const totalSuccess = results.filter(r => r.status === 'success').length;
      const totalRejected = results.filter(r => r.status === 'rejected').length;

      return {
        success: true,
        summary: { totalProcessed: itemIds.length, totalSuccess, totalRejected },
        data: results
      };
    }
  }
};
