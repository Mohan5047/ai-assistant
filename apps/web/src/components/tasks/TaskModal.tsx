import React, { useState, useEffect } from 'react';
import { TaskStatus, TaskPriority, type TaskResponse, type CreateTaskRequest } from '@personal-ai-assistant/shared';
import { Modal } from '../ui/Modal';
import { Input, Textarea, Select } from '../ui/Input';
import { Button } from '../ui/Button';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskRequest) => Promise<void>;
  taskToEdit?: TaskResponse | null;
  onDelete?: (id: string) => Promise<void>;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  taskToEdit,
  onDelete,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setStatus(taskToEdit.status);
      setPriority(taskToEdit.priority);
      if (taskToEdit.dueDate) {
        const d = new Date(taskToEdit.dueDate);
        setDueDate(d.toISOString().split('T')[0] || '');
        setDueTime(d.toTimeString().slice(0, 5));
      } else {
        setDueDate('');
        setDueTime('');
      }
    } else {
      setTitle('');
      setDescription('');
      setStatus(TaskStatus.TODO);
      setPriority(TaskPriority.MEDIUM);
      setDueDate('');
      setDueTime('');
    }
    setError(null);
  }, [taskToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let dueIso: string | undefined = undefined;
      if (dueDate) {
        const timePart = dueTime || '23:59';
        dueIso = new Date(`${dueDate}T${timePart}:00`).toISOString();
      }

      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        dueDate: dueIso,
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={taskToEdit ? 'Edit Task' : 'Create New Task'}
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
          placeholder="e.g. Prepare quarterly report"
          autoFocus
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            options={[
              { value: TaskPriority.LOW, label: 'Low' },
              { value: TaskPriority.MEDIUM, label: 'Medium' },
              { value: TaskPriority.HIGH, label: 'High' },
              { value: TaskPriority.URGENT, label: 'Urgent' },
            ]}
          />

          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
            options={[
              { value: TaskStatus.TODO, label: 'To Do' },
              { value: TaskStatus.IN_PROGRESS, label: 'In Progress' },
              { value: TaskStatus.DONE, label: 'Done' },
              { value: TaskStatus.CANCELLED, label: 'Cancelled' },
            ]}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Input
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <Input
            label="Due Time"
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            disabled={!dueDate}
          />
        </div>

        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional context, checklist, or acceptance criteria..."
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: taskToEdit && onDelete ? 'space-between' : 'flex-end',
            marginTop: '20px',
            gap: '12px',
          }}
        >
          {taskToEdit && onDelete && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={async () => {
                if (window.confirm(`Are you sure you want to delete "${taskToEdit.title}"?`)) {
                  await onDelete(taskToEdit.id);
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
              {taskToEdit ? 'Save Changes' : 'Create Task'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
