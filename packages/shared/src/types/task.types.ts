export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

export interface TaskResponse {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  timezone: string;
  eventId: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  timezone?: string;
  eventId?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  timezone?: string;
  eventId?: string | null;
}

export interface TaskFilterQuery {
  page?: number;
  limit?: number;
  status?: TaskStatus | string;
  priority?: TaskPriority | string;
  dueDateFrom?: string;
  dueDateTo?: string;
  search?: string;
  sortBy?: 'dueDate' | 'priority' | 'createdAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}
