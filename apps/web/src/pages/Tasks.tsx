import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TaskStatus, TaskPriority, type TaskResponse, type CreateTaskRequest } from '@personal-ai-assistant/shared';
import { apiClient } from '../lib/api-client';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { TaskModal } from '../components/tasks/TaskModal';
import {
  CheckSquare,
  Plus,
  Search,
  Clock,
  AlertTriangle,
  Trash2,
  Edit2,
} from 'lucide-react';
import { formatDate, formatTime, isToday } from '../lib/date-utils';

type FilterTab = 'all' | 'today' | 'upcoming' | 'completed';

export const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [modalOpen, setModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskResponse | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.tasks.list({ limit: 100 });
      setTasks(res.data);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();

    const handleRefresh = () => fetchTasks();
    window.addEventListener('assistant:data-refresh', handleRefresh);
    return () => window.removeEventListener('assistant:data-refresh', handleRefresh);
  }, [fetchTasks]);

  const handleToggleComplete = async (task: TaskResponse) => {
    try {
      const nextStatus: TaskStatus = task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
      );
      if (nextStatus === TaskStatus.DONE) {
        await apiClient.tasks.complete(task.id);
      } else {
        await apiClient.tasks.update(task.id, { status: nextStatus });
      }
      await fetchTasks();
    } catch (err) {
      console.error('Failed to toggle task', err);
      await fetchTasks();
    }
  };

  const handleCreateOrUpdate = async (data: CreateTaskRequest) => {
    if (taskToEdit) {
      await apiClient.tasks.update(taskToEdit.id, data);
    } else {
      await apiClient.tasks.create(data);
    }
    await fetchTasks();
  };

  const handleDelete = async (id: string) => {
    await apiClient.tasks.delete(id);
    await fetchTasks();
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Tab filter
      if (activeTab === 'today') {
        if (!task.dueDate || !isToday(task.dueDate)) return false;
      } else if (activeTab === 'upcoming') {
        if (!task.dueDate) return false;
        const d = new Date(task.dueDate);
        const now = new Date();
        now.setHours(23, 59, 59, 999);
        if (d <= now || task.status === TaskStatus.DONE) return false;
      } else if (activeTab === 'completed') {
        if (task.status !== TaskStatus.DONE) return false;
      }

      // Priority filter
      if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && task.status !== statusFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesDesc = task.description?.toLowerCase().includes(q);
        return matchesTitle || matchesDesc;
      }

      return true;
    });
  }, [tasks, activeTab, priorityFilter, statusFilter, searchQuery]);

  const getPriorityBadgeVariant = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.URGENT:
      case TaskPriority.HIGH:
        return 'danger';
      case TaskPriority.MEDIUM:
        return 'warning';
      case TaskPriority.LOW:
      default:
        return 'secondary';
    }
  };

  const isTaskOverdue = (task: TaskResponse) => {
    if (task.status === TaskStatus.DONE || task.status === TaskStatus.CANCELLED || !task.dueDate) {
      return false;
    }
    return new Date(task.dueDate).getTime() < Date.now();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Task Management</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Organize, prioritize, and track your daily action items
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={() => {
            setTaskToEdit(null);
            setModalOpen(true);
          }}
        >
          <Plus size={16} />
          <span>New Task</span>
        </Button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '12px',
        }}
      >
        {[
          { id: 'all', label: 'All Tasks', count: tasks.length },
          {
            id: 'today',
            label: 'Today',
            count: tasks.filter((t) => t.dueDate && isToday(t.dueDate)).length,
          },
          {
            id: 'upcoming',
            label: 'Upcoming',
            count: tasks.filter((t) => t.dueDate && new Date(t.dueDate) > new Date() && t.status !== TaskStatus.DONE).length,
          },
          {
            id: 'completed',
            label: 'Completed',
            count: tasks.filter((t) => t.status === TaskStatus.DONE).length,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as FilterTab)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: activeTab === tab.id ? 600 : 500,
              backgroundColor: activeTab === tab.id ? 'var(--primary-light)' : 'transparent',
              color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>{tab.label}</span>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '2px 6px',
                borderRadius: '9999px',
                backgroundColor: activeTab === tab.id ? 'var(--primary)' : 'var(--bg-secondary)',
                color: activeTab === tab.id ? '#ffffff' : 'var(--text-muted)',
              }}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: 'var(--bg-surface)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: '220px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Search
            size={16}
            style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
            }}
          />
        </div>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
          }}
        >
          <option value="ALL">All Priorities</option>
          <option value={TaskPriority.LOW}>Low</option>
          <option value={TaskPriority.MEDIUM}>Medium</option>
          <option value={TaskPriority.HIGH}>High</option>
          <option value={TaskPriority.URGENT}>Urgent</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
          }}
        >
          <option value="ALL">All Statuses</option>
          <option value={TaskStatus.TODO}>To Do</option>
          <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
          <option value={TaskStatus.DONE}>Done</option>
          <option value={TaskStatus.CANCELLED}>Cancelled</option>
        </select>
      </div>

      {/* Task List */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading tasks...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            <CheckSquare size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p style={{ fontSize: '0.95rem' }}>No tasks found in this view.</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setTaskToEdit(null);
                setModalOpen(true);
              }}
              style={{ marginTop: '12px' }}
            >
              + Create a new task
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredTasks.map((task) => {
              const overdue = isTaskOverdue(task);
              const isCompleted = task.status === TaskStatus.DONE;

              return (
                <div
                  key={task.id}
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '16px',
                    backgroundColor: overdue ? 'rgba(239, 68, 68, 0.03)' : 'transparent',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={isCompleted}
                      onChange={() => handleToggleComplete(task)}
                      style={{
                        marginTop: '4px',
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer',
                        accentColor: 'var(--primary)',
                      }}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span
                        style={{
                          fontSize: '0.95rem',
                          fontWeight: 600,
                          textDecoration: isCompleted ? 'line-through' : 'none',
                          color: isCompleted
                            ? 'var(--text-muted)'
                            : overdue
                            ? 'var(--danger)'
                            : 'var(--text-primary)',
                        }}
                      >
                        {task.title}
                      </span>

                      {task.description && (
                        <p
                          style={{
                            fontSize: '0.85rem',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.4,
                          }}
                        >
                          {task.description}
                        </p>
                      )}

                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          gap: '12px',
                          marginTop: '4px',
                          fontSize: '0.75rem',
                        }}
                      >
                        {task.dueDate && (
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: overdue ? 'var(--danger)' : 'var(--text-muted)',
                              fontWeight: overdue ? 600 : 400,
                            }}
                          >
                            {overdue && <AlertTriangle size={13} />}
                            <Clock size={13} />
                            Due: {formatDate(task.dueDate)} {formatTime(task.dueDate)}
                          </span>
                        )}

                        <span
                          style={{
                            color: 'var(--text-muted)',
                            textTransform: 'capitalize',
                          }}
                        >
                          Status: {task.status.toLowerCase().replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Badge variant={getPriorityBadgeVariant(task.priority)}>
                      {task.priority}
                    </Badge>

                    <button
                      onClick={() => {
                        setTaskToEdit(task);
                        setModalOpen(true);
                      }}
                      style={{
                        padding: '6px',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-muted)',
                      }}
                      title="Edit Task"
                    >
                      <Edit2 size={16} />
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm(`Delete task "${task.title}"?`)) {
                          handleDelete(task.id);
                        }
                      }}
                      style={{
                        padding: '6px',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--danger)',
                      }}
                      title="Delete Task"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Task Modal */}
      {modalOpen && (
        <TaskModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setTaskToEdit(null);
          }}
          onSubmit={handleCreateOrUpdate}
          taskToEdit={taskToEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};
