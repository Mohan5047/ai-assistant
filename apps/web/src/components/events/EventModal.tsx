import React, { useState, useEffect } from 'react';
import type { EventResponse, CreateEventRequest } from '@personal-ai-assistant/shared';
import { Modal } from '../ui/Modal';
import { Input, Textarea } from '../ui/Input';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateEventRequest) => Promise<void>;
  eventToEdit?: EventResponse | null;
  onDelete?: (id: string) => Promise<void>;
  initialDate?: Date;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  eventToEdit,
  onDelete,
  initialDate,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [isAllDay, setIsAllDay] = useState(false);
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (eventToEdit) {
      setTitle(eventToEdit.title);
      setDescription(eventToEdit.description || '');
      setLocation(eventToEdit.location || '');
      const s = new Date(eventToEdit.startTime);
      const e = new Date(eventToEdit.endTime);
      setStartDate(s.toISOString().split('T')[0] || '');
      setStartTime(s.toTimeString().slice(0, 5));
      setEndDate(e.toISOString().split('T')[0] || '');
      setEndTime(e.toTimeString().slice(0, 5));
      setIsAllDay(eventToEdit.isAllDay);
      setTimezone(eventToEdit.timezone);
    } else {
      const baseDate = initialDate || new Date();
      const dateStr = baseDate.toISOString().split('T')[0] || '';
      setTitle('');
      setDescription('');
      setLocation('');
      setStartDate(dateStr);
      setStartTime('09:00');
      setEndDate(dateStr);
      setEndTime('10:00');
      setIsAllDay(false);
      setTimezone(user?.timezone || 'UTC');
    }
    setError(null);
  }, [eventToEdit, isOpen, initialDate, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const startIso = isAllDay
        ? new Date(`${startDate}T00:00:00Z`).toISOString()
        : new Date(`${startDate}T${startTime}:00`).toISOString();

      const endIso = isAllDay
        ? new Date(`${endDate || startDate}T23:59:59Z`).toISOString()
        : new Date(`${endDate || startDate}T${endTime}:00`).toISOString();

      if (!isAllDay && new Date(endIso) <= new Date(startIso)) {
        setError('End time must be after start time');
        setLoading(false);
        return;
      }

      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        startTime: startIso,
        endTime: endIso,
        timezone,
        isAllDay,
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={eventToEdit ? 'Edit Event' : 'Create New Event'}
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--danger-light)',
              color: 'var(--danger)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              marginBottom: '14px',
            }}
          >
            {error}
          </div>
        )}

        <Input
          label="Title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Strategy Review"
          autoFocus
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
          {!isAllDay && (
            <Input
              label="Start Time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
          {!isAllDay && (
            <Input
              label="End Time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <input
            type="checkbox"
            id="all-day-check"
            checked={isAllDay}
            onChange={(e) => setIsAllDay(e.target.checked)}
          />
          <label htmlFor="all-day-check" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            All-day event
          </label>
        </div>

        <Input
          label="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Conference Room A / Zoom"
        />

        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional notes or agenda..."
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: eventToEdit && onDelete ? 'space-between' : 'flex-end',
            marginTop: '20px',
            gap: '12px',
          }}
        >
          {eventToEdit && onDelete && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={async () => {
                if (window.confirm(`Are you sure you want to delete "${eventToEdit.title}"?`)) {
                  await onDelete(eventToEdit.id);
                  onClose();
                }
              }}
            >
              Delete
            </Button>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              {eventToEdit ? 'Save Changes' : 'Create Event'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
