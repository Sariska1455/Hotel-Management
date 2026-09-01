// ============================================================================
// Staff & Team Management Page (Admin / Owner Only)
// ============================================================================
// Enables the restaurant owner/admin to:
// - View all registered staff accounts
// - Provision new login credentials for Managers and Waiters
// - Delete staff accounts
// ============================================================================
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/userService';
import {
  Users,
  UserPlus,
  Shield,
  UtensilsCrossed,
  Crown,
  Search,
  Trash2,
  AlertCircle,
  CheckCircle,
  X,
  Mail,
  Lock,
  User,
  ShieldCheck,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';

const StaffManagementPage = () => {
  const { user: currentUser, isAdmin } = useAuth();

  // State
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // New Staff Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'waiter',
  });

  // Delete Confirm State
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch staff list
  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await userService.getStaff();
      setStaff(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load staff accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchStaff();
    }
  }, [isAdmin]);

  // Handle Create Staff
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalLoading(true);

    try {
      await userService.createStaff(formData);
      setSuccessMsg(`Account for ${formData.name} (${formData.role}) created successfully!`);
      setIsModalOpen(false);
      setFormData({ name: '', email: '', password: '', role: 'waiter' });
      fetchStaff();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to create user account');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle Delete Staff
  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);

    try {
      await userService.deleteStaff(userToDelete.id);
      setSuccessMsg(`Account for ${userToDelete.name} has been removed.`);
      setUserToDelete(null);
      fetchStaff();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user account');
      setUserToDelete(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
        <Shield size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
        <h2>Access Restricted</h2>
        <p>Only the restaurant Owner / Administrator can manage staff accounts.</p>
      </div>
    );
  }

  // Filtered staff list
  const filteredStaff = staff.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const managerCount = staff.filter((s) => s.role === 'manager').length;
  const waiterCount = staff.filter((s) => s.role === 'waiter').length;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
      
      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Crown size={22} color="#f59e0b" />
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: '#f8fafc' }}>
              Staff & Team Management
            </h1>
          </div>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>
            Administered by Owner. Create and manage login credentials for restaurant staff.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => {
            setModalError('');
            setIsModalOpen(true);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0.65rem 1.25rem',
            background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
            borderRadius: '8px',
            color: '#fff',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <UserPlus size={18} />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(34, 197, 94, 0.15)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          color: '#86efac',
          padding: '0.85rem 1.25rem',
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5',
          padding: '0.85rem 1.25rem',
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {/* Total Staff */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            background: 'rgba(59, 130, 246, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#60a5fa'
          }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>Total Users</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc' }}>{staff.length}</div>
          </div>
        </div>

        {/* Managers */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            background: 'rgba(168, 85, 247, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#c084fc'
          }}>
            <Shield size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>Managers</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc' }}>{managerCount}</div>
          </div>
        </div>

        {/* Waiters */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            background: 'rgba(245, 158, 11, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fbbf24'
          }}>
            <UtensilsCrossed size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>Waiters</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc' }}>{waiterCount}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        background: 'rgba(30, 41, 59, 0.5)',
        padding: '1rem',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        marginBottom: '1.5rem'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search staff by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem 0.55rem 2.25rem',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: '0.88rem'
            }}
          />
        </div>

        {/* Role Filters */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'all', label: 'All Roles' },
            { id: 'manager', label: 'Managers' },
            { id: 'waiter', label: 'Waiters' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id)}
              style={{
                padding: '0.5rem 0.9rem',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: 600,
                background: roleFilter === tab.id ? '#d97706' : 'rgba(255, 255, 255, 0.05)',
                color: roleFilter === tab.id ? '#ffffff' : '#94a3b8'
              }}
            >
              {tab.label}
            </button>
          ))}

          <button
            onClick={fetchStaff}
            title="Refresh list"
            style={{
              padding: '0.5rem',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'transparent',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Staff Table / Cards */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.6)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
            Loading staff members...
          </div>
        ) : filteredStaff.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <Users size={36} color="#64748b" style={{ marginBottom: '0.75rem' }} />
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0' }}>No staff found</div>
            <p style={{ fontSize: '0.85rem' }}>No accounts matched your search or filters.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(15, 23, 42, 0.4)',
                  color: '#94a3b8',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  <th style={{ padding: '1rem 1.25rem' }}>Staff Member</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Email Address</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Role</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Added Date</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((member) => {
                  const isCurrent = member.id === currentUser?.id;
                  const isMemberAdmin = member.role === 'admin';

                  return (
                    <tr
                      key={member.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Name & Avatar */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: member.role === 'admin'
                              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                              : member.role === 'manager'
                              ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)'
                              : 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '0.9rem'
                          }}>
                            {member.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem' }}>
                              {member.name}
                              {isCurrent && (
                                <span style={{
                                  marginLeft: '8px',
                                  fontSize: '0.65rem',
                                  padding: '2px 6px',
                                  background: 'rgba(59, 130, 246, 0.2)',
                                  color: '#60a5fa',
                                  borderRadius: '4px'
                                }}>
                                  You
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td style={{ padding: '1rem 1.25rem', color: '#cbd5e1', fontSize: '0.88rem' }}>
                        {member.email}
                      </td>

                      {/* Role Badge */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {member.role === 'admin' ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#34d399',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}>
                            <Crown size={12} /> Owner / Admin
                          </span>
                        ) : member.role === 'manager' ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            background: 'rgba(168, 85, 247, 0.15)',
                            color: '#c084fc',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}>
                            <Shield size={12} /> Manager
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#fbbf24',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}>
                            <UtensilsCrossed size={12} /> Waiter
                          </span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td style={{ padding: '1rem 1.25rem', color: '#94a3b8', fontSize: '0.82rem' }}>
                        {new Date(member.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        {!isMemberAdmin && !isCurrent ? (
                          <button
                            onClick={() => setUserToDelete(member)}
                            title="Delete staff credentials"
                            style={{
                              padding: '6px 10px',
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              borderRadius: '6px',
                              color: '#f87171',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.75rem',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <Trash2 size={14} />
                            <span>Delete</span>
                          </button>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Protected</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE STAFF MODAL */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            position: 'relative'
          }}>
            {/* Modal Close */}
            <button
              onClick={() => setIsModalOpen(false)}
              style={{
                position: 'absolute',
                right: '1.25rem',
                top: '1.25rem',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            {/* Modal Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
              <UserPlus size={22} color="#d97706" />
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#f8fafc' }}>
                Provision New Staff
              </h2>
            </div>
            <p style={{ margin: '0 0 1.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
              Create a login account for a new Manager or Waiter.
            </p>

            {/* Modal Error */}
            {modalError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                padding: '0.75rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                marginBottom: '1rem'
              }}>
                <AlertCircle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCreateSubmit}>
              {/* Full Name */}
              <div style={{ marginBottom: '1.1rem' }}>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.82rem', marginBottom: '6px' }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. David Ross"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem 0.65rem 2.25rem',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>
              </div>

              {/* Email */}
              <div style={{ marginBottom: '1.1rem' }}>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.82rem', marginBottom: '6px' }}>
                  Email Address (Login Username)
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="email"
                    required
                    placeholder="waiter@restaurant.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem 0.65rem 2.25rem',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>
              </div>

              {/* Initial Password */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.82rem', marginBottom: '6px' }}>
                  Initial Password (at least 6 characters)
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 2.5rem 0.65rem 2.25rem',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '0.88rem'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Role Selector */}
              <div style={{ marginBottom: '1.75rem' }}>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.82rem', marginBottom: '8px' }}>
                  Assign Role
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {/* Waiter Card */}
                  <div
                    onClick={() => setFormData({ ...formData, role: 'waiter' })}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: formData.role === 'waiter' ? '2px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: formData.role === 'waiter' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(15, 23, 42, 0.5)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <UtensilsCrossed size={20} color={formData.role === 'waiter' ? '#f59e0b' : '#94a3b8'} style={{ margin: '0 auto 4px' }} />
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: formData.role === 'waiter' ? '#fbbf24' : '#cbd5e1' }}>
                      Waiter
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Create & act on orders</div>
                  </div>

                  {/* Manager Card */}
                  <div
                    onClick={() => setFormData({ ...formData, role: 'manager' })}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: formData.role === 'manager' ? '2px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: formData.role === 'manager' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(15, 23, 42, 0.5)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <ShieldCheck size={20} color={formData.role === 'manager' ? '#a855f7' : '#94a3b8'} style={{ margin: '0 auto 4px' }} />
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: formData.role === 'manager' ? '#c084fc' : '#cbd5e1' }}>
                      Manager
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Menu & all orders</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.88rem'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  style={{
                    padding: '0.65rem 1.5rem',
                    background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    cursor: modalLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {modalLoading ? <div className="spinner"></div> : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {userToDelete && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            maxWidth: '420px',
            width: '100%',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              color: '#ef4444'
            }}>
              <Trash2 size={24} />
            </div>

            <h3 style={{ margin: '0 0 0.5rem', color: '#f8fafc', fontSize: '1.25rem' }}>
              Remove Staff Account?
            </h3>
            <p style={{ margin: '0 0 1.5rem', color: '#94a3b8', fontSize: '0.88rem' }}>
              Are you sure you want to delete <strong style={{ color: '#f1f5f9' }}>{userToDelete.name}</strong> ({userToDelete.email})? They will no longer be able to log in.
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                style={{
                  padding: '0.65rem 1.25rem',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                style={{
                  padding: '0.65rem 1.25rem',
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  cursor: deleteLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {deleteLoading ? <div className="spinner"></div> : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StaffManagementPage;
