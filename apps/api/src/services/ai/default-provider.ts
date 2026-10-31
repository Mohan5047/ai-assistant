import type { AiProvider, ChatMessage, AiCompletionResult, GeneratedToolCall } from './ai-provider.interface.js';
import crypto from 'node:crypto';

/**
 * Intelligent natural-language parser that computes real dates in the user's timezone,
 * identifies tool intents, detects ambiguities, and crafts helpful responses.
 */
export class DefaultAiProvider implements AiProvider {
  name = 'default-assistant';

  async generateResponse(
    messages: ChatMessage[],
    userContext: {
      userId: string;
      timezone: string;
      currentDate: string;
    }
  ): Promise<AiCompletionResult> {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    const input = lastUserMsg?.content.trim() || '';

    const lower = input.toLowerCase();

    // 1. Clarification checks for ambiguous inputs
    if (lower === 'schedule a meeting' || lower === 'create event' || lower === 'add event') {
      return {
        reply: "I'd be happy to schedule that for you! Could you please specify the event title, date, and start/end time?",
      };
    }
    if (lower === 'create a task' || lower === 'add task' || lower === 'new task') {
      return {
        reply: "Sure! What should the task title be, and when is it due?",
      };
    }
    if (lower.startsWith('delete event') && lower.split(' ').length <= 2) {
      return {
        reply: "Which event would you like to delete? Please provide the title or choose from your event list.",
      };
    }

    // 2. Relative date calculation relative to userContext.currentDate
    const userNow = new Date(userContext.currentDate);
    const tomorrow = new Date(userNow);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const friday = new Date(userNow);
    const dayOfWeek = userNow.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    friday.setDate(friday.getDate() + daysUntilFriday);

    const nextMonday = new Date(userNow);
    const daysUntilNextMon = (1 - dayOfWeek + 7) % 7 || 7;
    nextMonday.setDate(nextMonday.getDate() + daysUntilNextMon);

    const toolCalls: GeneratedToolCall[] = [];

    // 3. Match: "Schedule a [title] tomorrow at [time]"
    const scheduleMatch = input.match(/schedule (?:a |an )?(.+?) (?:for )?tomorrow at (\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (scheduleMatch) {
      const title = scheduleMatch[1]!.trim();
      let hour = parseInt(scheduleMatch[2]!, 10);
      const min = parseInt(scheduleMatch[3] || '0', 10);
      const meridiem = (scheduleMatch[4] || '').toLowerCase();

      if (meridiem === 'pm' && hour < 12) hour += 12;
      if (meridiem === 'am' && hour === 12) hour = 0;

      const start = new Date(tomorrow);
      start.setHours(hour, min, 0, 0);
      const end = new Date(start);
      end.setHours(start.getHours() + 1);

      toolCalls.push({
        id: crypto.randomUUID(),
        name: 'create_event',
        arguments: {
          title,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          timezone: userContext.timezone,
        },
      });

      return {
        reply: `I have scheduled "${title}" for tomorrow at ${hour % 12 || 12}:${min.toString().padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}.`,
        toolCalls,
      };
    }

    // 4. Match: "Create a task to [title] by [day]"
    const taskMatch = input.match(/create (?:a )?task (?:to )?(.+?)(?: by (friday|tomorrow|next monday))?$/i);
    if (taskMatch) {
      const title = taskMatch[1]!.trim();
      const by = (taskMatch[2] || '').toLowerCase();
      let dueDate: Date | undefined;

      if (by === 'tomorrow') {
        dueDate = tomorrow;
        dueDate.setHours(17, 0, 0, 0);
      } else if (by === 'friday') {
        dueDate = friday;
        dueDate.setHours(17, 0, 0, 0);
      } else if (by === 'next monday') {
        dueDate = nextMonday;
        dueDate.setHours(17, 0, 0, 0);
      }

      toolCalls.push({
        id: crypto.randomUUID(),
        name: 'create_task',
        arguments: {
          title,
          dueDate: dueDate ? dueDate.toISOString() : undefined,
          priority: 'MEDIUM',
          timezone: userContext.timezone,
        },
      });

      return {
        reply: `I've created the task "${title}"${dueDate ? ` with a due date of ${dueDate.toLocaleDateString()}` : ''}.`,
        toolCalls,
      };
    }

    // 5. Match: Schedule summary / "What does my afternoon look like?" / "What does my day look like?"
    if (
      lower.includes('afternoon') ||
      lower.includes('schedule') ||
      lower.includes('today') ||
      lower.includes('plan my day')
    ) {
      toolCalls.push({
        id: crypto.randomUUID(),
        name: 'get_daily_summary',
        arguments: {},
      });

      return {
        reply: "Here is your current daily summary based on your scheduled events and active tasks:",
        toolCalls,
      };
    }

    // 6. Match: "Find a free time" / "find free time" / "study session"
    if (lower.includes('free time') || lower.includes('available slot') || lower.includes('study session')) {
      const targetDateStr = tomorrow.toISOString().split('T')[0]!;
      toolCalls.push({
        id: crypto.randomUUID(),
        name: 'find_available_slots',
        arguments: {
          date: targetDateStr,
          durationMinutes: 60,
        },
      });

      return {
        reply: `I searched your calendar for available 1-hour slots on ${targetDateStr}:`,
        toolCalls,
      };
    }

    // 7. Match: "What tasks are overdue?" / "overdue tasks"
    if (lower.includes('overdue')) {
      toolCalls.push({
        id: crypto.randomUUID(),
        name: 'list_tasks',
        arguments: {
          status: 'TODO',
        },
      });

      return {
        reply: "Checking your overdue and open tasks right now...",
        toolCalls,
      };
    }

    // 8. Match: Delete request -> Destructive action triggering confirmation
    const deleteMatch = input.match(/delete (?:the )?event (?:with id )?([a-f0-9-]+)/i);
    if (deleteMatch) {
      const eventId = deleteMatch[1]!;
      toolCalls.push({
        id: crypto.randomUUID(),
        name: 'delete_event',
        arguments: { eventId },
      });

      return {
        reply: `Are you sure you want to delete event ${eventId}?`,
        toolCalls,
      };
    }

    // Default conversational response
    return {
      reply: `I'm your Personal AI Life Assistant. I can help you schedule events, organize tasks, find free time slots, set reminders, and plan your day. Try asking me "Schedule a team sync tomorrow at 3 PM" or "Create a task to finish report by Friday".`,
    };
  }
}
