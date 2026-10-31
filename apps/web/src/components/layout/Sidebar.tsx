import React from 'react';
import { NavLink } from 'react-router';
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Bot,
  Settings,
  Sparkles,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/calendar', label: 'Calendar', icon: Calendar },
    { to: '/tasks', label: 'Tasks', icon: CheckSquare },
    { to: '/ai', label: 'AI Assistant', icon: Bot, badge: 'AI' },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      style={{
        width: '240px',
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
      }}
    >
      <div
        style={{
          padding: '24px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--primary)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Sparkles size={20} />
        </div>
        <div>
          <h1 style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Life Assistant
          </h1>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Personal AI</span>
        </div>
      </div>

      <nav style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                fontWeight: isActive ? 600 : 500,
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Icon size={18} />
                <span style={{ fontSize: '0.9rem' }}>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    backgroundColor: 'var(--primary)',
                    color: '#ffffff',
                    padding: '2px 6px',
                    borderRadius: '9999px',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div
        style={{
          padding: '16px',
          borderTop: '1px solid var(--border-color)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          textAlign: 'center',
        }}
      >
        Personal AI Life Assistant v2.0
      </div>
    </aside>
  );
};
