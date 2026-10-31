export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
}

export interface GeneratedToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface AiCompletionResult {
  reply: string;
  toolCalls?: GeneratedToolCall[];
}

export interface AiProvider {
  name: string;
  generateResponse(
    messages: ChatMessage[],
    userContext: {
      userId: string;
      timezone: string;
      currentDate: string;
    }
  ): Promise<AiCompletionResult>;
}
