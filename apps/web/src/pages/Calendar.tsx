import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { EventResponse, CreateEventRequest } from '@personal-ai-assistant/shared';
import { apiClient } from '../lib/api-client';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EventModal } from '../components/events/EventModal';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Search,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  CheckCircle,
} from 'lucide-react';
import {
  formatDate,
  formatTime,
  getMonthMatrix,
  getWeekDays,
  isSameDay,
  isToday,
} from '../lib/date-utils';

type ViewMode = 'month' | 'week' | 'day' | 'agenda';

export const Calendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | 'local' | 'google'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventResponse | null>(null);
  const [initialDateForCreate, setInitialDateForCreate] = useState<Date | undefined>(undefined);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch a generous window around current date
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1).toISOString();
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0).toISOString();
      const res = await apiClient.events.list({ startDate: start, endDate: end });
      setEvents(res.data);
    } catch (err: any) {
      console.error('Failed to fetch events', err);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchEvents();

    const handleRefresh = () => fetchEvents();
    window.addEventListener('assistant:data-refresh', handleRefresh);
    return () => window.removeEventListener('assistant:data-refresh', handleRefresh);
  }, [fetchEvents]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncMessage(null);
      const res = await apiClient.calendar.sync();
      const result = res;
      setSyncMessage(
        `Sync complete: +${result.importedCount} imported, ${result.exportedCount} exported, ${result.updatedCount} updated, ${result.deletedCount} removed.`
      );
      await fetchEvents();
    } catch (err: any) {
      setSyncMessage(err.message || 'Sync failed. Ensure Google Calendar is connected.');
    } finally {
      setSyncing(false);
    }
  };

  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setDate(next.getDate() - 1);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setDate(next.getDate() + 1);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Filter events by search query and source
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      if (filterSource === 'local' && evt.googleEventId) return false;
      if (filterSource === 'google' && !evt.googleEventId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = evt.title.toLowerCase().includes(q);
        const matchesLoc = evt.location?.toLowerCase().includes(q);
        const matchesDesc = evt.description?.toLowerCase().includes(q);
        return matchesTitle || matchesLoc || matchesDesc;
      }
      return true;
    });
  }, [events, searchQuery, filterSource]);

  const getEventsForDay = (date: Date) => {
    return filteredEvents.filter((evt) => {
      const s = new Date(evt.startTime);
      return isSameDay(s, date);
    });
  };

  const handleCreateOrUpdate = async (data: CreateEventRequest) => {
    if (selectedEvent) {
      await apiClient.events.update(selectedEvent.id, data);
    } else {
      await apiClient.events.create(data);
    }
    await fetchEvents();
  };

  const handleDelete = async (id: string) => {
    await apiClient.events.delete(id);
    await fetchEvents();
  };

  const openCreateForDate = (date: Date) => {
    setSelectedEvent(null);
    setInitialDateForCreate(date);
    setModalOpen(true);
  };

  const openEditEvent = (evt: EventResponse, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(evt);
    setInitialDateForCreate(undefined);
    setModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header & View Controls */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {viewMode === 'month' &&
              formatDate(currentDate, { month: 'long', year: 'numeric' })}
            {viewMode === 'week' &&
              `Week of ${formatDate(getWeekDays(currentDate)[0] || currentDate, {
                month: 'short',
                day: 'numeric',
              })}, ${currentDate.getFullYear()}`}
            {(viewMode === 'day' || viewMode === 'agenda') &&
              formatDate(currentDate, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Button size="sm" variant="ghost" onClick={handlePrev} aria-label="Previous">
              <ChevronLeft size={16} />
            </Button>
            <Button size="sm" variant="secondary" onClick={handleToday}>
              Today
            </Button>
            <Button size="sm" variant="ghost" onClick={handleNext} aria-label="Next">
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          {/* View Mode Toggle */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--bg-secondary)',
              padding: '3px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
            }}
          >
            {(['month', 'week', 'day', 'agenda'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  fontWeight: viewMode === mode ? 600 : 500,
                  backgroundColor: viewMode === mode ? 'var(--bg-surface)' : 'transparent',
                  color: viewMode === mode ? 'var(--primary)' : 'var(--text-secondary)',
                  boxShadow: viewMode === mode ? 'var(--shadow-sm)' : 'none',
                  textTransform: 'capitalize',
                  transition: 'all 0.15s ease',
                }}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Sync Button */}
          <Button
            size="sm"
            variant="secondary"
            onClick={handleSync}
            loading={syncing}
            title="Sync with Google Calendar"
          >
            <RefreshCw size={15} />
            <span>Sync</span>
          </Button>

          {/* New Event Button */}
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setSelectedEvent(null);
              setInitialDateForCreate(new Date());
              setModalOpen(true);
            }}
          >
            <Plus size={16} />
            <span>New Event</span>
          </Button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncMessage && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle size={16} />
          <span>{syncMessage}</span>
        </div>
      )}

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
            minWidth: '240px',
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
            placeholder="Search events by title, notes, or location..."
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Source:</span>
          {(['all', 'local', 'google'] as const).map((source) => (
            <button
              key={source}
              onClick={() => setFilterSource(source)}
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: filterSource === source ? 600 : 500,
                backgroundColor: filterSource === source ? 'var(--primary-light)' : 'transparent',
                color: filterSource === source ? 'var(--primary)' : 'var(--text-secondary)',
                border: '1px solid',
                borderColor: filterSource === source ? 'var(--primary)' : 'var(--border-color)',
                textTransform: 'capitalize',
              }}
            >
              {source}
            </button>
          ))}
        </div>
      </div>

      {/* VIEW: MONTH */}
      {viewMode === 'month' && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
          }}
        >
          {/* Day of Week Headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              borderBottom: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              textAlign: 'center',
              fontWeight: 600,
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              padding: '10px 0',
            }}
          >
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Month Matrix Grid */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {getMonthMatrix(currentDate.getFullYear(), currentDate.getMonth()).map(
              (week, wIdx) => (
                <div
                  key={wIdx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    borderBottom: wIdx < 5 ? '1px solid var(--border-color)' : 'none',
                    minHeight: '110px',
                  }}
                >
                  {week.map((day, dIdx) => {
                    const isCurMonth = day.getMonth() === currentDate.getMonth();
                    const dayEvents = getEventsForDay(day);
                    const todayFlag = isToday(day);

                    return (
                      <div
                        key={dIdx}
                        onClick={() => openCreateForDate(day)}
                        style={{
                          borderRight: dIdx < 6 ? '1px solid var(--border-color)' : 'none',
                          padding: '8px',
                          backgroundColor: isCurMonth
                            ? todayFlag
                              ? 'rgba(99, 102, 241, 0.04)'
                              : 'transparent'
                            : 'var(--bg-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.8rem',
                              fontWeight: todayFlag ? 700 : 500,
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: todayFlag ? 'var(--primary)' : 'transparent',
                              color: todayFlag
                                ? '#ffffff'
                                : isCurMonth
                                ? 'var(--text-primary)'
                                : 'var(--text-muted)',
                            }}
                          >
                            {day.getDate()}
                          </span>
                        </div>

                        {/* Event Pills */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px' }}>
                          {dayEvents.slice(0, 3).map((evt) => (
                            <div
                              key={evt.id}
                              onClick={(e) => openEditEvent(evt, e)}
                              style={{
                                padding: '2px 6px',
                                borderRadius: '3px',
                                fontSize: '0.725rem',
                                fontWeight: 500,
                                backgroundColor: evt.googleEventId
                                  ? 'rgba(66, 133, 244, 0.15)'
                                  : 'var(--primary-light)',
                                color: evt.googleEventId ? '#1a73e8' : 'var(--primary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                borderLeft: `3px solid ${
                                  evt.googleEventId ? '#1a73e8' : 'var(--primary)'
                                }`,
                              }}
                            >
                              {!evt.isAllDay && (
                                <span style={{ fontWeight: 600, marginRight: '4px' }}>
                                  {formatTime(evt.startTime)}
                                </span>
                              )}
                              {evt.title}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', paddingLeft: '4px' }}>
                              +{dayEvents.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* VIEW: WEEK */}
      {viewMode === 'week' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '12px',
          }}
        >
          {getWeekDays(currentDate).map((day, idx) => {
            const dayEvents = getEventsForDay(day);
            const todayFlag = isToday(day);

            return (
              <div
                key={idx}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid',
                  borderColor: todayFlag ? 'var(--primary)' : 'var(--border-color)',
                  padding: '12px',
                  minHeight: '400px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '8px',
                    borderBottom: '1px solid var(--border-color)',
                    marginBottom: '10px',
                  }}
                >
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {formatDate(day, { weekday: 'short' })}
                  </span>
                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: todayFlag ? 700 : 600,
                      color: todayFlag ? 'var(--primary)' : 'inherit',
                    }}
                  >
                    {day.getDate()}
                  </span>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {dayEvents.length === 0 ? (
                    <div
                      onClick={() => openCreateForDate(day)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-muted)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px dashed var(--border-color)',
                      }}
                    >
                      + Add event
                    </div>
                  ) : (
                    dayEvents.map((evt) => (
                      <div
                        key={evt.id}
                        onClick={(e) => openEditEvent(evt, e)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: evt.googleEventId
                            ? 'rgba(66, 133, 244, 0.12)'
                            : 'var(--primary-light)',
                          borderLeft: `3px solid ${
                            evt.googleEventId ? '#1a73e8' : 'var(--primary)'
                          }`,
                          cursor: 'pointer',
                        }}
                      >
                        <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{evt.title}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {evt.isAllDay
                            ? 'All Day'
                            : `${formatTime(evt.startTime)} - ${formatTime(evt.endTime)}`}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW: DAY */}
      {viewMode === 'day' && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
              Schedule for {formatDate(currentDate, { weekday: 'long', month: 'long', day: 'numeric' })}
            </h2>
            <Button size="sm" variant="primary" onClick={() => openCreateForDate(currentDate)}>
              <Plus size={16} /> Add Event
            </Button>
          </div>

          {getEventsForDay(currentDate).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
              <CalendarIcon size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p style={{ fontSize: '0.95rem' }}>No events scheduled for this day.</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => openCreateForDate(currentDate)}
                style={{ marginTop: '12px' }}
              >
                + Schedule an event
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {getEventsForDay(currentDate).map((evt) => (
                <div
                  key={evt.id}
                  onClick={(e) => openEditEvent(evt, e)}
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-secondary)',
                    borderLeft: `4px solid ${evt.googleEventId ? '#1a73e8' : 'var(--primary)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{evt.title}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} />
                        {evt.isAllDay ? 'All Day' : `${formatTime(evt.startTime)} - ${formatTime(evt.endTime)}`}
                      </span>
                      {evt.location && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={14} />
                          {evt.location}
                        </span>
                      )}
                    </div>
                    {evt.description && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                        {evt.description}
                      </p>
                    )}
                  </div>
                  <Badge variant={evt.googleEventId ? 'secondary' : 'primary'}>
                    {evt.googleEventId ? 'Google Synced' : 'Local'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW: AGENDA */}
      {viewMode === 'agenda' && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            padding: '24px',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '20px' }}>
            Chronological Agenda
          </h2>

          {filteredEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
              <CalendarIcon size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p style={{ fontSize: '0.95rem' }}>No events found.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredEvents
                .slice()
                .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                .map((evt) => (
                  <div
                    key={evt.id}
                    onClick={(e) => openEditEvent(evt, e)}
                    style={{
                      padding: '14px 18px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-secondary)',
                      borderLeft: `4px solid ${evt.googleEventId ? '#1a73e8' : 'var(--primary)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                  >
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{evt.title}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {formatDate(evt.startTime, { weekday: 'short', month: 'short', day: 'numeric' })} •{' '}
                          {evt.isAllDay ? 'All Day' : `${formatTime(evt.startTime)} - ${formatTime(evt.endTime)}`}
                        </span>
                        {evt.location && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            📍 {evt.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant={evt.googleEventId ? 'secondary' : 'primary'}>
                      {evt.googleEventId ? 'Google Synced' : 'Local'}
                    </Badge>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <EventModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedEvent(null);
            setInitialDateForCreate(undefined);
          }}
          onSubmit={handleCreateOrUpdate}
          eventToEdit={selectedEvent}
          onDelete={handleDelete}
          initialDate={initialDateForCreate}
        />
      )}
    </div>
  );
};
