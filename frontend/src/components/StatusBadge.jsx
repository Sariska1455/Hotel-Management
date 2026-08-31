// ============================================================================
// StatusBadge — Animated order lifecycle status pill
// ============================================================================

const STATUS_CONFIG = {
  Placed: {
    label: 'Placed',
    bg: 'rgba(99, 102, 241, 0.15)',
    border: 'rgba(99, 102, 241, 0.4)',
    color: '#818cf8',
    dot: '#6366f1',
    pulse: false,
  },
  Accepted: {
    label: 'Accepted',
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.4)',
    color: '#fbbf24',
    dot: '#f59e0b',
    pulse: false,
  },
  Preparing: {
    label: 'Preparing',
    bg: 'rgba(251, 146, 60, 0.15)',
    border: 'rgba(251, 146, 60, 0.4)',
    color: '#fb923c',
    dot: '#f97316',
    pulse: true,
  },
  Ready: {
    label: 'Ready!',
    bg: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.4)',
    color: '#34d399',
    dot: '#10b981',
    pulse: true,
  },
  Served: {
    label: 'Served',
    bg: 'rgba(100, 116, 139, 0.15)',
    border: 'rgba(100, 116, 139, 0.3)',
    color: '#94a3b8',
    dot: '#64748b',
    pulse: false,
  },
  Cancelled: {
    label: 'Cancelled',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    dot: '#ef4444',
    pulse: false,
  },
};

const StatusBadge = ({ status, size = 'md' }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.Placed;
  const fontSize = size === 'sm' ? '0.72rem' : size === 'lg' ? '0.9rem' : '0.78rem';
  const padding = size === 'sm' ? '3px 8px' : size === 'lg' ? '6px 14px' : '4px 10px';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding,
        borderRadius: '20px',
        fontSize,
        fontWeight: '700',
        background: config.bg,
        border: `1px solid ${config.border}`,
        color: config.color,
        whiteSpace: 'nowrap',
        letterSpacing: '0.3px',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: config.dot,
          animation: config.pulse ? 'statusPulse 1.5s ease-in-out infinite' : 'none',
          flexShrink: 0,
        }}
      />
      {config.label}
    </span>
  );
};

export default StatusBadge;
