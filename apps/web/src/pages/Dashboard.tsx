import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api-client';
import { TaskStatus, type DashboardSummary, type TaskResponse, type EventResponse } from '@personal-ai-assistant/shared';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import {
  Calendar,
  CheckSquare,
  Clock,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { formatTime, formatDate } from '../lib/date-utils';
import { Link } from 'react-router';
import { EventModal } from '../components/events/EventModal';
import { TaskModal } from '../components/tasks/TaskModal';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addEventOpen, setAddEventOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.dashboard.getSummary();
      setSummary(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();

    const handleRefresh = () => fetchDashboard();
    window.addEventListener('assistant:data-refresh', handleRefresh);
    return () => window.removeEventListener('assistant:data-refresh', handleRefresh);
  }, [fetchDashboard]);

  const handleToggleTask = async (task: TaskResponse) => {
    try {
      const nextStatus = task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;
      await apiClient.tasks.update(task.id, { status: nextStatus });
      fetchDashboard();
    } catch (err) {
      console.error('Failed to update task status', err);
    }
  };

  const todayStr = formatDate(new Date(), {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Greeting Banner */}
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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
            {user?.displayName || 'there'}!
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {todayStr} • Timezone: {user?.timezone || 'UTC'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button size="sm" variant="secondary" onClick={() => setAddTaskOpen(true)}>
            <Plus size={16} />
            <span>Add Task</span>
          </Button>
          <Button size="sm" variant="primary" onClick={() => setAddEventOpen(true)}>
            <Plus size={16} />
            <span>Add Event</span>
          </Button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '14px',
            backgroundColor: 'var(--danger-light)',
            color: 'var(--danger)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Daily AI Briefing Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--primary)" />
            <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Daily AI Briefing
            </h2>
          </div>
          <Badge variant="primary">AI Generated</Badge>
        </div>
        {loading ? (
          <Skeleton height="36px" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {summary?.dailyBriefing ? (
              <>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {summary.dailyBriefing.greeting}
                </p>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {summary.dailyBriefing.summary}
                </p>
                {summary.dailyBriefing.focusTip && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--primary)', fontStyle: 'italic', marginTop: '4px' }}>
                    💡 Focus Tip: {summary.dailyBriefing.focusTip}
                  </p>
                )}
              </>
            ) : (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                No daily briefing available yet. Create tasks or schedule events to get tailored insights!
              </p>
            )}
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Today's Events
              </p>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '4px' }}>
                {loading ? <Skeleton width="40px" height="32px" /> : summary?.todayEvents.length ?? 0}
              </h3>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(99, 102, 241, 0.12)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Calendar size={20} />
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Tasks Due Today
              </p>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '4px' }}>
                {loading ? <Skeleton width="40px" height="32px" /> : summary?.todayTasks?.length ?? 0}
              </h3>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckSquare size={20} />
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Overdue Tasks
              </p>
              <h3
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  marginTop: '4px',
                  color: (summary?.overdueTasks?.length ?? 0) > 0 ? 'var(--danger)' : 'inherit',
                }}
              >
                {loading ? <Skeleton width="40px" height="32px" /> : summary?.overdueTasks?.length ?? 0}
              </h3>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={20} />
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Completed Today
              </p>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '4px', color: 'var(--success)' }}>
                {loading ? <Skeleton width="40px" height="32px" /> : summary?.counts?.tasksCompletedToday ?? 0}
              </h3>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={20} />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Left Column: Today's Schedule & Upcoming Events */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Today's Schedule */}
          <Card
            title="Today's Schedule"
            action={
              <Link to="/calendar" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Full Calendar <ArrowRight size={14} />
              </Link>
            }
          >
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Skeleton height="48px" />
                <Skeleton height="48px" />
              </div>
            ) : !summary?.todayEvents.length ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                <Clock size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                <p style={{ fontSize: '0.9rem' }}>No events scheduled for today.</p>
                <Button size="sm" variant="ghost" onClick={() => setAddEventOpen(true)} style={{ marginTop: '8px' }}>
                  + Schedule an event
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {summary.todayEvents.map((evt) => (
                  <div
                    key={evt.id}
                    style={{
                      padding: '12px 14px',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderLeft: '4px solid var(--primary)',
                    }}
                  >
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{evt.title}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {evt.isAllDay ? 'All Day' : `${formatTime(evt.startTime)} - ${formatTime(evt.endTime)}`}
                        {evt.location && ` • ${evt.location}`}
                      </p>
                    </div>
                    {evt.googleEventId && <Badge variant="secondary">Google Sync</Badge>}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Upcoming Events */}
          <Card title="Upcoming Next Few Days">
            {loading ? (
              <Skeleton height="48px" />
            ) : !summary?.upcomingEvents.length ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No upcoming events in the next week.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {summary.upcomingEvents.slice(0, 4).map((evt) => (
                  <div
                    key={evt.id}
                    style={{
                      padding: '10px 12px',
                      borderBottom: '1px solid var(--border-color)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{evt.title}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {formatDate(evt.startTime, { month: 'short', day: 'numeric' })} at {formatTime(evt.startTime)}
                      </p>
                    </div>
                    <Badge variant="secondary">{evt.isAllDay ? 'All Day' : 'Timed'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Overdue Tasks & Today's Tasks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Overdue Tasks */}
          {(summary?.overdueTasks?.length ?? 0) > 0 && (
            <Card
              title="Overdue Tasks"
              action={<Badge variant="danger">{summary?.overdueTasks?.length} Overdue</Badge>}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {summary?.overdueTasks?.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      padding: '10px 14px',
                      backgroundColor: 'var(--danger-light)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="checkbox"
                        checked={task.status === TaskStatus.DONE}
                        onChange={() => handleToggleTask(task)}
                      />
                      <div>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--danger)' }}>
                          {task.title}
                        </span>
                        {task.dueDate && (
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Due: {formatDate(task.dueDate)}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="danger">{task.priority}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Today's Tasks */}
          <Card
            title="Tasks Due Today"
            action={
              <Link to="/tasks" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                All Tasks <ArrowRight size={14} />
              </Link>
            }
          >
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Skeleton height="40px" />
                <Skeleton height="40px" />
              </div>
            ) : !summary?.todayTasks?.length ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                <CheckSquare size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                <p style={{ fontSize: '0.9rem' }}>No tasks scheduled for today.</p>
                <Button size="sm" variant="ghost" onClick={() => setAddTaskOpen(true)} style={{ marginTop: '8px' }}>
                  + Add your first task
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {summary.todayTasks.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="checkbox"
                        checked={task.status === TaskStatus.DONE}
                        onChange={() => handleToggleTask(task)}
                      />
                      <span
                        style={{
                          fontSize: '0.875rem',
                          textDecoration: task.status === TaskStatus.DONE ? 'line-through' : 'none',
                          color: task.status === TaskStatus.DONE ? 'var(--text-muted)' : 'var(--text-primary)',
                        }}
                      >
                        {task.title}
                      </span>
                    </div>
                    <Badge
                      variant={
                        task.priority === 'URGENT' || task.priority === 'HIGH'
                          ? 'danger'
                          : task.priority === 'MEDIUM'
                          ? 'warning'
                          : 'secondary'
                      }
                    >
                      {task.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {addEventOpen && (
        <EventModal
          isOpen={addEventOpen}
          onClose={() => setAddEventOpen(false)}
          onSubmit={async (data) => {
            await apiClient.events.create(data);
            fetchDashboard();
          }}
        />
      )}

      {addTaskOpen && (
        <TaskModal
          isOpen={addTaskOpen}
          onClose={() => setAddTaskOpen(false)}
          onSubmit={async (data) => {
            await apiClient.tasks.create(data);
            fetchDashboard();
          }}
        />
      )}
    </div>
  );
};
