import { authStorage } from './auth-storage';
import type {
  UserProfile,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  EventResponse,
  CreateEventRequest,
  UpdateEventRequest,
  EventFilterQuery,
  TaskResponse,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskFilterQuery,
  DashboardSummary,
  AiChatRequest,
  AiChatResponse,
  AiThreadResponse,
  DailyPlanResponse,
  GoogleCalendarStatus,
  CalendarSyncResult,
  DeviceRegistrationRequest,
  DeviceResponse,
  NotificationPreferences,
  UpdateNotificationPreferencesRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  UpdateProfileRequest,
  DeleteAccountRequest,
  AccountExportResponse,
  PaginatedResponse,
} from '@personal-ai-assistant/shared';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class MobileApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, ...fetchOptions } = options;

    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') {
          searchParams.append(k, String(v));
        }
      }
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }

    // Mobile uses Bearer token from SecureStore
    const token = await authStorage.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(fetchOptions.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s mobile timeout

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({
          error: { message: `Request failed with status ${response.status}` },
        }));
        throw new ApiError(
          response.status,
          errorJson.error?.message || 'Request failed',
          errorJson.error?.details
        );
      }

      if (response.status === 204) {
        return undefined as T;
      }

      const json = await response.json();
      return json.data !== undefined ? json.data : json;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new ApiError(408, 'Request timed out. Please check your connection.');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // Authentication & Account
  auth = {
    login: (data: LoginRequest) => this.post<AuthResponse>('/auth/login', data),
    register: (data: RegisterRequest) => this.post<AuthResponse>('/auth/register', data),
    google: (idToken: string) => this.post<AuthResponse>('/auth/google', { idToken }),
    me: () => this.get<{ user: UserProfile }>('/auth/me'),
    logout: () => this.post<{ message: string }>('/auth/logout'),
    forgotPassword: (email: string) => this.post<{ success: boolean; message: string }>('/auth/forgot-password', { email }),
    resetPassword: (data: ResetPasswordRequest) => this.post<{ success: boolean; message: string }>('/auth/reset-password', data),
    updateProfile: (data: UpdateProfileRequest) => this.patch<{ user: UserProfile }>('/auth/profile', data),
    exportData: () => this.get<AccountExportResponse>('/auth/export-data'),
    deleteAccount: (data: DeleteAccountRequest) => this.request<{ success: boolean; message: string }>('/auth/account', {
      method: 'DELETE',
      body: JSON.stringify(data),
    }),
  };

  // Dashboard
  dashboard = {
    getSummary: () => this.get<DashboardSummary>('/dashboard/summary'),
  };

  // Events
  events = {
    list: (params?: EventFilterQuery) => this.request<PaginatedResponse<EventResponse>>('/events', { params }),
    get: (id: string) => this.get<EventResponse>(`/events/${id}`),
    create: (data: CreateEventRequest) => this.post<EventResponse>('/events', data),
    update: (id: string, data: UpdateEventRequest) => this.patch<EventResponse>(`/events/${id}`, data),
    delete: (id: string) => this.delete<void>(`/events/${id}`),
  };

  // Tasks
  tasks = {
    list: (params?: TaskFilterQuery) => this.request<PaginatedResponse<TaskResponse>>('/tasks', { params }),
    get: (id: string) => this.get<TaskResponse>(`/tasks/${id}`),
    create: (data: CreateTaskRequest) => this.post<TaskResponse>('/tasks', data),
    update: (id: string, data: UpdateTaskRequest) => this.patch<TaskResponse>(`/tasks/${id}`, data),
    complete: (id: string) => this.post<TaskResponse>(`/tasks/${id}/complete`),
    delete: (id: string) => this.delete<void>(`/tasks/${id}`),
  };

  // AI Assistant
  ai = {
    chat: (data: AiChatRequest) => this.post<AiChatResponse>('/ai/chat', data),
    listConversations: () => this.get<AiThreadResponse[]>('/ai/conversations'),
    getConversation: (id: string) => this.get<AiThreadResponse>(`/ai/conversations/${id}`),
    deleteConversation: (id: string) => this.delete<void>(`/ai/conversations/${id}`),
    getDailyPlan: (date?: string) => this.get<DailyPlanResponse>('/ai/daily-plan', { params: { date } }),
  };

  // Calendar Sync
  calendar = {
    getStatus: () => this.get<GoogleCalendarStatus>('/calendar/google/status'),
    getAuthUrl: () => this.get<{ authUrl: string }>('/calendar/google/auth-url'),
    disconnect: () => this.post<{ message: string }>('/calendar/google/disconnect'),
    sync: () => this.post<CalendarSyncResult>('/calendar/sync'),
  };

  // Push Notifications & Preferences
  notifications = {
    registerDevice: (data: DeviceRegistrationRequest) => this.post<DeviceResponse>('/notifications/devices', data),
    unregisterDevice: (token: string) => this.delete<void>(`/notifications/devices/${token}`),
    getPreferences: () => this.get<NotificationPreferences>('/notifications/preferences'),
    updatePreferences: (data: UpdateNotificationPreferencesRequest) => this.put<NotificationPreferences>('/notifications/preferences', data),
    sendTestPush: () => this.post<{ sent: number; failed: number }>('/notifications/test-push'),
  };
}

export const apiClient = new MobileApiClient(API_BASE);
