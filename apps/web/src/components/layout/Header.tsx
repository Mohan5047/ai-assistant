import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../ui/Button';
import { Sun, Moon, Plus, LogOut, User } from 'lucide-react';
import { formatDate } from '../../lib/date-utils';

interface HeaderProps {
  onQuickAddEvent?: () => void;
  onQuickAddTask?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onQuickAddEvent, onQuickAddTask }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const todayStr = formatDate(new Date(), {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header
      style={{
        height: '64px',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {todayStr}
        </span>
        <span
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            backgroundColor: 'var(--bg-secondary)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {user?.timezone || 'UTC'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Quick Add Dropdown */}
        <div style={{ position: 'relative' }}>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setQuickAddOpen((prev) => !prev)}
            aria-label="Quick Add"
          >
            <Plus size={16} />
            <span>Quick Add</span>
          </Button>

          {quickAddOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '8px',
                width: '160px',
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border-color)',
                overflow: 'hidden',
                zIndex: 110,
              }}
            >
              <button
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  textAlign: 'left',
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)',
                  display: 'block',
                }}
                onClick={() => {
                  setQuickAddOpen(false);
                  onQuickAddEvent?.();
                }}
              >
                + New Event
              </button>
              <button
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  textAlign: 'left',
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)',
                  borderTop: '1px solid var(--border-color)',
                  display: 'block',
                }}
                onClick={() => {
                  setQuickAddOpen(false);
                  onQuickAddTask?.();
                }}
              >
                + New Task
              </button>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          style={{
            padding: '8px',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* User Profile Menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              {user?.displayName ? user.displayName[0]?.toUpperCase() : <User size={16} />}
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user?.displayName || 'User'}</span>
          </button>

          {menuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '8px',
                width: '180px',
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border-color)',
                overflow: 'hidden',
                zIndex: 110,
              }}
            >
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user?.displayName}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.email}</p>
              </div>
              <button
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  textAlign: 'left',
                  fontSize: '0.85rem',
                  color: 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
              >
                <LogOut size={16} />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
