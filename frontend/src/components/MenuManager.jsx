// ============================================================================
// Indian restaurant menu management component (Goal 1 & Goal 7 Bulk Actions)
// ============================================================================
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { menuService } from '../services/menuService';
import { 
  Plus, 
  Search, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  SlidersHorizontal, 
  Archive, 
  Sparkles, 
  Check, 
  AlertTriangle,
  Utensils,
  Wine,
  Flame,
  Coffee,
  X,
  Layers
} from 'lucide-react';

const CATEGORIES = [
  'All',
  'Beverages',
  'Starters',
  'Main Course — North Indian',
  'Rice & Biryani',
  'Indian Breads',
  'Thali',
  'Sides',
  'Desserts',
  'Jain Specials',
];

const formatIndianRupees = (price) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR'
}).format(Number(price));

const CategoryIcon = ({ cat }) => {
  switch (cat) {
    case 'Beverages':                 return <Wine size={16} />;
    case 'Starters':                  return <Flame size={16} />;
    case 'Main Course — North Indian': return <Utensils size={16} />;
    case 'Rice & Biryani':            return <Layers size={16} />;
    case 'Indian Breads':             return <Coffee size={16} />;
    case 'Thali':                     return <Sparkles size={16} />;
    case 'Sides':                     return <Check size={16} />;
    case 'Desserts':                  return <Coffee size={16} />;
    case 'Jain Specials':             return <Sparkles size={16} />;
    default:                          return <Sparkles size={16} />;
  }
};

const MenuManager = () => {
  const { isManager, isWaiter } = useAuth();

  // Menu State
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);

  // Bulk Selection State (Goal 7)
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkPriceInput, setBulkPriceInput] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [batchReport, setBatchReport] = useState(null); // Goal 7 per-item report modal

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('Main Courses');
  const [formPrice, setFormPrice] = useState('');
  const [formAvailable, setFormAvailable] = useState(true);
  const [formError, setFormError] = useState('');

  // Load Menu Items
  const loadMenu = async () => {
    setLoading(true);
    try {
      const data = await menuService.getMenuItems({
        category: activeCategory,
        search: searchQuery,
        includeArchived
      });
      setItems(data);
    } catch (err) {
      console.error('Failed to load menu:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, [activeCategory, searchQuery, includeArchived]);

  // Handle Item Checkbox Toggle (Manager Bulk Mode)
  const toggleSelectItem = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(i => i.id));
    }
  };

  // Quick Single Item Availability Toggle
  const handleToggleAvailability = async (item) => {
    if (!isManager) return;
    try {
      const updated = await menuService.updateMenuItem(item.id, {
        is_available: !item.is_available
      });
      setItems(items.map(i => i.id === item.id ? updated : i));
    } catch (err) {
      alert('Failed to update availability: ' + err.message);
    }
  };

  // Open Modal for Add or Edit
  const openModal = (item = null) => {
    if (!isManager) return;
    setEditingItem(item);
    if (item) {
      setFormName(item.name);
      setFormDesc(item.description || '');
      setFormCategory(item.category || 'Main Courses');
      setFormPrice(item.price);
      setFormAvailable(item.is_available);
    } else {
      setFormName('');
      setFormDesc('');
      setFormCategory('Main Courses');
      setFormPrice('');
      setFormAvailable(true);
    }
    setFormError('');
    setIsModalOpen(true);
  };

  // Save Item (Add or Edit)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) {
      setFormError('Dish name is required');
      return;
    }
    if (isNaN(formPrice) || parseFloat(formPrice) < 0) {
      setFormError('Price must be a positive number');
      return;
    }

    try {
      const payload = {
        name: formName,
        description: formDesc,
        category: formCategory,
        price: parseFloat(formPrice),
        is_available: formAvailable
      };

      if (editingItem) {
        await menuService.updateMenuItem(editingItem.id, payload);
      } else {
        await menuService.createMenuItem(payload);
      }

      setIsModalOpen(false);
      loadMenu();
    } catch (err) {
      setFormError(err.message || 'Failed to save menu item');
    }
  };

  // Goal 7: Execute Bulk Action
  const handleBulkAction = async (actionType) => {
    if (selectedIds.length === 0) return;
    setBulkProcessing(true);

    let priceValue = undefined;
    let availableValue = undefined;

    if (actionType === 'set_price') {
      priceValue = bulkPriceInput;
    } else if (actionType === 'mark_available') {
      availableValue = true;
    } else if (actionType === 'mark_unavailable') {
      availableValue = false;
    }

    try {
      const res = await menuService.bulkUpdateMenuItems({
        itemIds: selectedIds,
        price: priceValue,
        is_available: availableValue
      });

      setBatchReport(res);
      setSelectedIds([]);
      setBulkPriceInput('');
      loadMenu();
    } catch (err) {
      alert('Bulk action error: ' + err.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  return (
    <div className="page-container" style={{ position: 'relative' }}>

      {/* Header Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: '600',
            background: 'rgba(217, 119, 6, 0.15)',
            color: '#fbbf24',
            border: '1px solid rgba(217, 119, 6, 0.3)',
            marginBottom: '8px'
          }}>
            <Sparkles size={14} />
            Culinary Selection
          </span>
          <h1 style={{ 
            fontFamily: "'Playfair Display', serif", 
            fontSize: '2.4rem', 
            fontWeight: '700', 
            color: '#ffffff',
            letterSpacing: '-0.5px'
          }}>
            Indian Restaurant Menu
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            {isManager 
              ? 'Manage dish offerings, adjust prices, toggle live stock, or perform bulk price updates.' 
              : 'Explore the live culinary menu and item availability for table ordering.'}
          </p>
        </div>

        {/* Manager Add Dish Button */}
        {isManager && (
          <button
            onClick={() => openModal()}
            style={{
              padding: '12px 22px',
              background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
              border: 'none',
              borderRadius: '12px',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 20px rgba(217, 119, 6, 0.35)',
              transition: 'all 0.25s ease'
            }}
          >
            <Plus size={18} />
            <span>Add New Dish</span>
          </button>
        )}
      </div>

      {/* Category Pills & Search Controls */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        borderRadius: '20px',
        padding: '1.25rem',
        marginBottom: '2rem',
        backdropFilter: 'blur(16px)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>

          {/* Categories */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontSize: '0.88rem',
                  fontWeight: '600',
                  border: activeCategory === cat ? '1px solid #d97706' : '1px solid var(--border-light)',
                  background: activeCategory === cat ? 'rgba(217, 119, 6, 0.2)' : 'rgba(255,255,255,0.03)',
                  color: activeCategory === cat ? '#fbbf24' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                <CategoryIcon cat={cat} />
                <span>{cat}</span>
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', width: '280px' }}>
            <input
              type="text"
              placeholder="Search dishes or ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="custom-input"
              style={{ paddingLeft: '38px', height: '42px', fontSize: '0.88rem' }}
            />
            <Search size={16} className="input-icon" style={{ left: '12px' }} />
          </div>

        </div>

        {/* Manager Options Row */}
        {isManager && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px dashed var(--border-light)',
            fontSize: '0.85rem'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
                style={{ accentColor: '#d97706' }}
              />
              <Archive size={14} />
              <span>Show Archived Menu Items</span>
            </label>

            <button
              onClick={selectAll}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fbbf24',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Layers size={14} />
              <span>{selectedIds.length === items.length ? 'Deselect All' : 'Select All for Bulk Action'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Menu Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div className="spinner" style={{ margin: '0 auto', width: '36px', height: '36px' }}></div>
          <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>Preparing Indian menu...</p>
        </div>
      ) : items.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          background: 'var(--bg-card)',
          borderRadius: '20px',
          border: '1px dashed var(--border-light)'
        }}>
          <Utensils size={48} color="var(--text-subtle)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.2rem', color: '#ffffff', marginBottom: '4px' }}>No Dishes Found</h3>
          <p style={{ color: 'var(--text-muted)' }}>Try selecting a different category or search term.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.5rem',
          paddingBottom: selectedIds.length > 0 ? '100px' : '0'
        }}>
          {items.map(item => (
            <div
              key={item.id}
              style={{
                background: 'var(--bg-card)',
                border: selectedIds.includes(item.id) 
                  ? '2px solid #d97706' 
                  : '1px solid var(--border-light)',
                borderRadius: '18px',
                padding: '1.5rem',
                position: 'relative',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                opacity: !item.is_available ? 0.75 : 1,
                boxShadow: selectedIds.includes(item.id) 
                  ? '0 0 25px rgba(217, 119, 6, 0.25)' 
                  : '0 4px 20px rgba(0,0,0,0.3)'
              }}
            >
              {/* Manager Selection Checkbox */}
              {isManager && (
                <div style={{ position: 'absolute', top: '14px', left: '14px' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => toggleSelectItem(item.id)}
                    style={{
                      width: '18px',
                      height: '18px',
                      accentColor: '#d97706',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              )}

              {/* Category & Status Pill */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                paddingLeft: isManager ? '26px' : '0'
              }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--text-subtle)',
                  background: 'rgba(255,255,255,0.05)',
                  padding: '3px 8px',
                  borderRadius: '6px'
                }}>
                  {item.category || 'Mains'}
                </span>

                {/* Stock Status Badge */}
                <div
                  onClick={() => handleToggleAvailability(item)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: isManager ? 'pointer' : 'default',
                    background: item.is_available ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: item.is_available ? '#34d399' : '#f87171',
                    border: item.is_available ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                    transition: 'all 0.2s ease'
                  }}
                  title={isManager ? 'Click to toggle availability' : ''}
                >
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: item.is_available ? '#10b981' : '#ef4444'
                  }}></span>
                  <span>{item.is_available ? 'In Stock' : 'Sold Out'}</span>
                </div>
              </div>

              {/* Item Title & Description */}
              <h3 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '8px',
                lineHeight: '1.3'
              }}>
                {item.name}
              </h3>

              <p style={{
                color: 'var(--text-muted)',
                fontSize: '0.88rem',
                lineHeight: '1.45',
                minHeight: '40px',
                marginBottom: '1.25rem'
              }}>
                {item.description || 'Prepared fresh to order by our executive kitchen team.'}
              </p>

              {/* Price & Actions Row */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-light)'
              }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', display: 'block' }}>Price</span>
                  <span style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '1.4rem',
                    fontWeight: '800',
                    color: '#fbbf24'
                  }}>
                    {formatIndianRupees(item.price)}
                  </span>
                </div>

                {/* Manager Edit Button */}
                {isManager && (
                  <button
                    onClick={() => openModal(item)}
                    style={{
                      padding: '8px 14px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '10px',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Edit3 size={14} color="#fbbf24" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Floating Manager Bulk Action Drawer (Goal 7) */}
      {isManager && selectedIds.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '750px',
          background: 'rgba(22, 25, 34, 0.95)',
          backdropFilter: 'blur(24px)',
          border: '1px solid #d97706',
          borderRadius: '20px',
          padding: '1rem 1.5rem',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(217, 119, 6, 0.3)',
          zIndex: 900,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          animation: 'slideUpFade 0.4s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              background: '#d97706',
              color: '#ffffff',
              fontWeight: '800',
              fontSize: '0.85rem',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {selectedIds.length}
            </span>
            <span style={{ fontWeight: '700', color: '#ffffff', fontSize: '0.95rem' }}>
              Items Selected for Bulk Action
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Price Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="number"
                step="0.50"
                placeholder="New ₹ Price"
                value={bulkPriceInput}
                onChange={(e) => setBulkPriceInput(e.target.value)}
                style={{
                  width: '120px',
                  padding: '8px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  outline: 'none'
                }}
              />
              <button
                onClick={() => handleBulkAction('set_price')}
                disabled={bulkProcessing || !bulkPriceInput}
                style={{
                  padding: '8px 14px',
                  background: '#d97706',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Apply Price
              </button>
            </div>

            {/* Toggle Status Buttons */}
            <button
              onClick={() => handleBulkAction('mark_available')}
              disabled={bulkProcessing}
              style={{
                padding: '8px 14px',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '10px',
                color: '#34d399',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Mark In Stock
            </button>

            <button
              onClick={() => handleBulkAction('mark_unavailable')}
              disabled={bulkProcessing}
              style={{
                padding: '8px 14px',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '10px',
                color: '#f87171',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Mark Sold Out
            </button>
          </div>
        </div>
      )}

      {/* Goal 7: Per-Item Batch Execution Report Modal */}
      {batchReport && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(12px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-light)',
            borderRadius: '24px',
            padding: '2rem',
            width: '100%',
            maxWidth: '550px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            animation: 'slideUpFade 0.3s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#fbbf24', fontWeight: '700' }}>
                  Goal 7 Compliance Report
                </span>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.6rem', color: '#ffffff' }}>
                  Batch Action Execution Results
                </h2>
              </div>
              <button
                onClick={() => setBatchReport(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Summary Stat Pills */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem' }}>
              <div style={{
                flex: 1,
                padding: '10px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#34d399' }}>
                  {batchReport.summary.totalSuccess}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Succeeded</div>
              </div>

              <div style={{
                flex: 1,
                padding: '10px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#f87171' }}>
                  {batchReport.summary.totalRejected}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rejected</div>
              </div>
            </div>

            {/* Per-Item Breakdown List */}
            <div style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '6px' }}>
              {batchReport.data.map((itemResult, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    marginBottom: '8px',
                    background: itemResult.status === 'success' ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.08)',
                    border: itemResult.status === 'success' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}
                >
                  {itemResult.status === 'success' ? (
                    <CheckCircle2 size={18} color="#34d399" style={{ marginTop: '2px', flexShrink: 0 }} />
                  ) : (
                    <AlertTriangle size={18} color="#f87171" style={{ marginTop: '2px', flexShrink: 0 }} />
                  )}
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#ffffff' }}>
                      {itemResult.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: itemResult.status === 'success' ? '#34d399' : '#f87171' }}>
                      {itemResult.status === 'success' ? 'Successfully updated' : itemResult.reason}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setBatchReport(null)}
              className="submit-btn"
              style={{ marginTop: '1.5rem' }}
            >
              Dismiss Report
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Dish Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(12px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-light)',
            borderRadius: '24px',
            padding: '2.5rem',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            animation: 'slideUpFade 0.3s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.6rem', color: '#ffffff' }}>
                {editingItem ? 'Edit Dish' : 'Add New Dish'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            {formError && (
              <div className="alert-box alert-error" style={{ marginBottom: '1rem' }}>
                <AlertTriangle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit}>
              <div className="input-group">
                <label className="input-label">Dish Name</label>
                <input
                  type="text"
                  className="custom-input"
                  placeholder="e.g. Chole Bhature"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={{ paddingLeft: '14px' }}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Category</label>
                <select
                  className="custom-input"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  style={{ paddingLeft: '14px', cursor: 'pointer' }}
                >
                  <option value="Starters">Starters</option>
                  <option value="Main Courses">Main Courses</option>
                  <option value="Desserts">Desserts</option>
                  <option value="Artisanal Drinks">Artisanal Drinks</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="custom-input"
                  placeholder="250"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  style={{ paddingLeft: '14px' }}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Culinary Description</label>
                <textarea
                  className="custom-input"
                  rows={3}
                  placeholder="Describe ingredients, cooking technique, or pairing recommendations..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  style={{ paddingLeft: '14px', resize: 'vertical' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ffffff', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={formAvailable}
                    onChange={(e) => setFormAvailable(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#d97706' }}
                  />
                  <span>Mark as currently available for ordering</span>
                </label>
              </div>

              <button type="submit" className="submit-btn">
                <span>{editingItem ? 'Update Menu Item' : 'Add to Menu'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default MenuManager;
