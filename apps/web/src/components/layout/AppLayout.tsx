import React, { useState } from 'react';
import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { EventModal } from '../events/EventModal';
import { TaskModal } from '../tasks/TaskModal';
import { apiClient } from '../../lib/api-client';

export const AppLayout: React.FC = () => {
  const [quickAddEventOpen, setQuickAddEventOpen] = useState(false);
  const [quickAddTaskOpen, setQuickAddTaskOpen] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header
          onQuickAddEvent={() => setQuickAddEventOpen(true)}
          onQuickAddTask={() => setQuickAddTaskOpen(true)}
        />
        <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>

      {quickAddEventOpen && (
        <EventModal
          isOpen={quickAddEventOpen}
          onClose={() => setQuickAddEventOpen(false)}
          onSubmit={async (data) => {
            await apiClient.events.create(data);
            // Dispatch a custom event so active pages can refresh
            window.dispatchEvent(new CustomEvent('assistant:data-refresh'));
          }}
        />
      )}

      {quickAddTaskOpen && (
        <TaskModal
          isOpen={quickAddTaskOpen}
          onClose={() => setQuickAddTaskOpen(false)}
          onSubmit={async (data) => {
            await apiClient.tasks.create(data);
            window.dispatchEvent(new CustomEvent('assistant:data-refresh'));
          }}
        />
      )}
    </div>
  );
};
