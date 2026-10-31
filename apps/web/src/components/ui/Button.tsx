import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  children,
  disabled,
  style,
  ...props
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
        };
      case 'danger':
        return {
          backgroundColor: 'var(--danger)',
          color: '#ffffff',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: 'var(--primary)',
          border: '1px solid var(--primary)',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'var(--text-secondary)',
        };
      case 'primary':
      default:
        return {
          backgroundColor: 'var(--primary)',
          color: '#ffffff',
        };
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'sm':
        return { padding: '6px 12px', fontSize: '0.85rem' };
      case 'lg':
        return { padding: '12px 24px', fontSize: '1.05rem' };
      case 'md':
      default:
        return { padding: '9px 18px', fontSize: '0.95rem' };
    }
  };

  return (
    <button
      disabled={disabled || loading}
      style={{
        display: fullWidth ? 'flex' : 'inline-flex',
        width: fullWidth ? '100%' : 'auto',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontWeight: 500,
        borderRadius: 'var(--radius-sm)',
        transition: 'all 0.15s ease',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.6 : 1,
        ...getVariantStyles(),
        ...getSizeStyles(),
        ...style,
      }}
      {...props}
    >
      {loading && (
        <span
          style={{
            width: '14px',
            height: '14px',
            border: '2px solid currentColor',
            borderRightColor: 'transparent',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'spin 0.75s linear infinite',
          }}
        />
      )}
      {children}
    </button>
  );
};
