export enum AiRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
  TOOL = 'TOOL',
}

export interface AiMessageResponse {
  id: string;
  threadId: string;
  role: AiRole;
  content: string;
  toolCalls: any | null;
  toolResults: any | null;
  createdAt: string;
}

export interface AiThreadResponse {
  id: string;
  userId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: AiMessageResponse[];
}

export interface PendingAction {
  actionId: string;
  tool: string;
  description: string;
  parameters: Record<string, any>;
  impact: 'low' | 'high' | 'destructive';
}

export interface AiChatRequest {
  message: string;
  threadId?: string;
  confirmationResponse?: {
    actionId: string;
    confirmed: boolean;
  };
}

export interface ActionExecutionResult {
  tool: string;
  success: boolean;
  message: string;
  data?: any;
}

export interface AiChatResponse {
  threadId: string;
  reply: string;
  actionsExecuted?: ActionExecutionResult[];
  pendingConfirmation?: PendingAction;
}

export interface TimeSlot {
  start: string;
  end: string;
  durationMinutes: number;
}

export interface DailyPlanResponse {
  date: string;
  timezone: string;
  fixedCommitments: Array<{
    id: string;
    title: string;
    start: string;
    end: string;
    source: string;
  }>;
  tasksToSchedule: Array<{
    id: string;
    title: string;
    priority: string;
    dueDate?: string | null;
    estimatedMinutes?: number;
  }>;
  availableSlots: TimeSlot[];
  suggestedSchedule: Array<{
    taskId?: string;
    title: string;
    start: string;
    end: string;
    type: 'task' | 'break' | 'event';
  }>;
  explanation: string;
}
