export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface EventFilterQuery extends PaginationQuery {
  startDate?: string;
  endDate?: string;
  status?: string;
  source?: string;
  search?: string;
  sortBy?: 'startTime' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface DashboardSummary {
  todayEvents: import('./event.types.js').EventResponse[];
  upcomingEvents: import('./event.types.js').EventResponse[];
  todayTasks: import('./task.types.js').TaskResponse[];
  overdueTasks: import('./task.types.js').TaskResponse[];
  counts: {
    todayTotal: number;
    upcomingTotal: number;
    thisWeekTotal: number;
    tasksTodoTotal: number;
    tasksOverdueTotal: number;
    tasksCompletedToday: number;
    upcomingRemindersTotal: number;
  };
  dailyBriefing?: {
    greeting: string;
    summary: string;
    focusTip: string;
  };
}
