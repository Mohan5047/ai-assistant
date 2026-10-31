import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'secondary';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
}) => {
  const getStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: 'var(--primary-light)', color: 'var(--primary)' };
      case 'success':
        return { backgroundColor: 'var(--success-light)', color: 'var(--success)' };
      case 'warning':
        return { backgroundColor: 'var(--warning-light)', color: 'var(--warning)' };
      case 'danger':
        return { backgroundColor: 'var(--danger-light)', color: 'var(--danger)' };
      case 'secondary':
      case 'neutral':
      default:
        return { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' };
    }
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        borderRadius: '9999px',
        padding: size === 'sm' ? '2px 8px' : '4px 12px',
        fontSize: size === 'sm' ? '0.7rem' : '0.8rem',
        ...getStyles(),
      }}
    >
      {children}
    </span>
  );
};
