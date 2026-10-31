import crypto from 'node:crypto';
import { getPrismaClient } from '../../config/index.js';
import { AppError } from '../../middleware/index.js';
import { HTTP_STATUS } from '@personal-ai-assistant/shared';
import type {
  AiChatResponse,
  AiThreadResponse,
  AiMessageResponse,
  PendingAction,
  ActionExecutionResult,
} from '@personal-ai-assistant/shared';
import { DefaultAiProvider } from './default-provider.js';
import { executeToolCall, AI_TOOLS } from './tools.js';
import { logger } from '../../utils/index.js';

const aiProvider = new DefaultAiProvider();

// In-memory pending confirmation store with 10-minute expiry
const pendingConfirmations = new Map<string, { userId: string; action: PendingAction; expiresAt: number }>();

function cleanExpiredConfirmations() {
  const now = Date.now();
  for (const [id, entry] of pendingConfirmations.entries()) {
    if (entry.expiresAt < now) {
      pendingConfirmations.delete(id);
    }
  }
}

export async function handleChatMessage(
  userId: string,
  data: {
    message: string;
    threadId?: string;
    confirmationResponse?: {
      actionId: string;
      confirmed: boolean;
    };
  }
): Promise<AiChatResponse> {
  const prisma = getPrismaClient();
  cleanExpiredConfirmations();

  // 1. Resolve or create AI Thread
  let threadId = data.threadId;
  if (!threadId) {
    const newThread = await prisma.aiThread.create({
      data: {
        userId,
        title: data.message.slice(0, 50),
      },
    });
    threadId = newThread.id;
  } else {
    const existing = await prisma.aiThread.findFirst({
      where: { id: threadId, userId },
    });
    if (!existing) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, 'THREAD_NOT_FOUND', 'Conversation thread not found');
    }
  }

  // 2. Handle Pending Confirmation if supplied
  if (data.confirmationResponse) {
    const { actionId, confirmed } = data.confirmationResponse;
    const pending = pendingConfirmations.get(actionId);

    if (!pending || pending.userId !== userId) {
      throw new AppError(HTTP_STATUS.BAD_REQUEST, 'INVALID_ACTION_ID', 'Pending action expired or invalid');
    }

    pendingConfirmations.delete(actionId);

    if (!confirmed) {
      const cancelReply = `Cancelled action: ${pending.action.description}`;
      await prisma.aiMessage.create({
        data: {
          threadId,
          role: 'ASSISTANT',
          content: cancelReply,
        },
      });

      return {
        threadId,
        reply: cancelReply,
      };
    }

    // Execute the confirmed action
    const execRes = await executeToolCall(userId, pending.action.tool, pending.action.parameters);
    const resultMsg = execRes.success
      ? `Successfully executed: ${pending.action.description}`
      : `Action failed: ${execRes.error}`;

    await prisma.aiMessage.create({
      data: {
        threadId,
        role: 'ASSISTANT',
        content: resultMsg,
        toolCalls: [pending.action as any],
        toolResults: [execRes as any],
      },
    });

    return {
      threadId,
      reply: resultMsg,
      actionsExecuted: [
        {
          tool: pending.action.tool,
          success: execRes.success,
          message: resultMsg,
          data: execRes.data,
        },
      ],
    };
  }

  // 3. Save incoming user message
  await prisma.aiMessage.create({
    data: {
      threadId,
      role: 'USER',
      content: data.message,
    },
  });

  // 4. Load recent context
  const history = await prisma.aiMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: 'asc' },
    take: 10,
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const timezone = user?.timezone || 'UTC';

  const chatMessages = history.map((m) => ({
    role: m.role.toLowerCase() as any,
    content: m.content,
  }));

  // 5. Generate AI completion
  const completion = await aiProvider.generateResponse(chatMessages, {
    userId,
    timezone,
    currentDate: new Date().toISOString(),
  });

  const actionsExecuted: ActionExecutionResult[] = [];
  let pendingAction: PendingAction | undefined;

  // 6. Process tool calls
  if (completion.toolCalls && completion.toolCalls.length > 0) {
    for (const toolCall of completion.toolCalls) {
      const toolDef = AI_TOOLS[toolCall.name];

      // If destructive, trigger confirmation flow!
      if (toolDef?.isDestructive) {
        const actionId = crypto.randomUUID();
        pendingAction = {
          actionId,
          tool: toolCall.name,
          description: `Delete ${toolCall.name.replace('delete_', '')} (${JSON.stringify(toolCall.arguments)})`,
          parameters: toolCall.arguments,
          impact: 'destructive',
        };

        pendingConfirmations.set(actionId, {
          userId,
          action: pendingAction,
          expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
        });
      } else {
        // Execute non-destructive tool immediately
        const execRes = await executeToolCall(userId, toolCall.name, toolCall.arguments);
        actionsExecuted.push({
          tool: toolCall.name,
          success: execRes.success,
          message: execRes.error ? `Failed: ${execRes.error}` : 'Success',
          data: execRes.data,
        });
      }
    }
  }

  // 7. Save assistant response
  await prisma.aiMessage.create({
    data: {
      threadId,
      role: 'ASSISTANT',
      content: completion.reply,
      toolCalls: completion.toolCalls ? (completion.toolCalls as any) : undefined,
      toolResults: actionsExecuted.length > 0 ? (actionsExecuted as any) : undefined,
    },
  });

  return {
    threadId,
    reply: completion.reply,
    actionsExecuted: actionsExecuted.length > 0 ? actionsExecuted : undefined,
    pendingConfirmation: pendingAction,
  };
}

export async function listConversations(userId: string): Promise<AiThreadResponse[]> {
  const prisma = getPrismaClient();

  const threads = await prisma.aiThread.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    take: 30,
  });

  return threads.map((t) => ({
    id: t.id,
    userId: t.userId,
    title: t.title,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    messages: t.messages.map((m) => ({
      id: m.id,
      threadId: m.threadId,
      role: m.role as any,
      content: m.content,
      toolCalls: m.toolCalls,
      toolResults: m.toolResults,
      createdAt: m.createdAt.toISOString(),
    })),
  }));
}

export async function getConversationById(userId: string, threadId: string): Promise<AiThreadResponse> {
  const prisma = getPrismaClient();

  const thread = await prisma.aiThread.findFirst({
    where: { id: threadId, userId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!thread) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'THREAD_NOT_FOUND', 'Conversation not found');
  }

  return {
    id: thread.id,
    userId: thread.userId,
    title: thread.title,
    createdAt: thread.createdAt.toISOString(),
    updatedAt: thread.updatedAt.toISOString(),
    messages: thread.messages.map((m) => ({
      id: m.id,
      threadId: m.threadId,
      role: m.role as any,
      content: m.content,
      toolCalls: m.toolCalls,
      toolResults: m.toolResults,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

export async function deleteConversation(userId: string, threadId: string): Promise<void> {
  const prisma = getPrismaClient();

  const thread = await prisma.aiThread.findFirst({
    where: { id: threadId, userId },
  });

  if (!thread) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'THREAD_NOT_FOUND', 'Conversation not found');
  }

  await prisma.aiThread.delete({ where: { id: threadId } });
}
