import React, { useState, useEffect, useRef } from 'react';
import {
  AiRole,
  type AiMessageResponse,
  type AiThreadResponse,
  type PendingAction,
  type ActionExecutionResult,
} from '@personal-ai-assistant/shared';
import { apiClient } from '../lib/api-client';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Sparkles,
  Send,
  Plus,
  Bot,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  MessageSquare,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: AiRole;
  content: string;
  actionsExecuted?: ActionExecutionResult[];
  pendingConfirmation?: PendingAction;
  createdAt: string;
}

const SUGGESTED_PROMPTS = [
  'Plan my day tomorrow with optimal focus blocks',
  'What meetings do I have scheduled today?',
  'Schedule a strategy review tomorrow from 2pm to 3pm',
  'Add high-priority task: Finish quarterly budget by Friday',
  'Find available 1-hour slots for tomorrow afternoon',
];

export const AiChat: React.FC = () => {
  const [threads, setThreads] = useState<AiThreadResponse[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load threads on mount
  useEffect(() => {
    const loadThreads = async () => {
      try {
        const res = await apiClient.ai.listConversations();
        setThreads(res);
        if (res.length > 0 && !activeThreadId) {
          setActiveThreadId(res[0]?.id || null);
        }
      } catch (err) {
        console.error('Failed to load AI threads', err);
      }
    };
    loadThreads();
  }, []);

  // Load messages when activeThreadId changes
  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      return;
    }
    const loadMessages = async () => {
      try {
        const thread = await apiClient.ai.getConversation(activeThreadId);
        if (thread.messages) {
          const mapped: ChatMessage[] = thread.messages.map((m: AiMessageResponse) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt,
          }));
          setMessages(mapped);
        }
      } catch (err) {
        console.error('Failed to load thread messages', err);
      }
    };
    loadMessages();
  }, [activeThreadId]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `client-${Date.now()}`,
      role: AiRole.USER,
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);
    setError(null);

    try {
      const data = await apiClient.ai.chat({
        message: text,
        threadId: activeThreadId || undefined,
      });

      if (!activeThreadId && data.threadId) {
        setActiveThreadId(data.threadId);
        const threadsList = await apiClient.ai.listConversations();
        setThreads(threadsList);
      }

      const botMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: AiRole.ASSISTANT,
        content: data.reply,
        actionsExecuted: data.actionsExecuted,
        pendingConfirmation: data.pendingConfirmation,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMsg]);

      // If tools created/updated events or tasks, dispatch global refresh
      if (data.actionsExecuted && data.actionsExecuted.length > 0) {
        window.dispatchEvent(new CustomEvent('assistant:data-refresh'));
      }
    } catch (err: any) {
      setError(err.message || 'AI request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (actionId: string, confirmed: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.ai.chat({
        message: confirmed ? 'Yes, proceed.' : 'No, cancel that.',
        threadId: activeThreadId || undefined,
        confirmationResponse: {
          actionId,
          confirmed,
        },
      });

      const botMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: AiRole.ASSISTANT,
        content: data.reply,
        actionsExecuted: data.actionsExecuted,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMsg]);

      if (data.actionsExecuted && data.actionsExecuted.length > 0) {
        window.dispatchEvent(new CustomEvent('assistant:data-refresh'));
      }
    } catch (err: any) {
      setError(err.message || 'Action resolution failed');
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = () => {
    setActiveThreadId(null);
    setMessages([]);
  };

  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - 112px)',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
      }}
    >
      {/* Sidebar: Conversation Threads */}
      <div
        style={{
          width: '280px',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
          <Button size="sm" variant="primary" fullWidth onClick={startNewConversation}>
            <Plus size={16} />
            <span>New Conversation</span>
          </Button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: '0 8px',
            }}
          >
            History
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
            {threads.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '12px 8px' }}>
                No past conversations.
              </p>
            ) : (
              threads.map((t) => {
                const isActive = t.id === activeThreadId;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveThreadId(t.id)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      textAlign: 'left',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: isActive ? 'var(--bg-surface)' : 'transparent',
                      color: isActive ? 'var(--primary)' : 'var(--text-primary)',
                      fontWeight: isActive ? 600 : 400,
                      boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                    }}
                  >
                    <MessageSquare size={16} style={{ flexShrink: 0 }} />
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t.title || 'Conversation'}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Feed */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bot size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>AI Life Assistant</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Powered by tool-calling & calendar/task synchronization
              </span>
            </div>
          </div>
          <Badge variant="primary">Active</Badge>
        </div>

        {/* Message List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {messages.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                maxWidth: '540px',
                margin: '0 auto',
                padding: '20px',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                <Sparkles size={28} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
                How can I help you today?
              </h3>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-muted)',
                  marginBottom: '24px',
                  lineHeight: 1.5,
                }}
              >
                I can schedule events, prioritize tasks, detect conflicts, find open calendar slots,
                and draft daily plans in your local timezone.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                {SUGGESTED_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      textAlign: 'left',
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{prompt}</span>
                    <Sparkles size={14} color="var(--primary)" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === AiRole.USER;
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                  }}
                >
                  {!isUser && (
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Bot size={18} />
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div
                      style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: isUser ? 'var(--primary)' : 'var(--bg-secondary)',
                        color: isUser ? '#ffffff' : 'var(--text-primary)',
                        fontSize: '0.9rem',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {msg.content}
                    </div>

                    {/* Pending Confirmation Box */}
                    {msg.pendingConfirmation && (
                      <div
                        style={{
                          padding: '14px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <AlertCircle size={18} color="var(--danger)" />
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--danger)' }}>
                            Confirmation Required
                          </span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                          {msg.pendingConfirmation.description}
                        </p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() =>
                              handleConfirmAction(msg.pendingConfirmation!.actionId, true)
                            }
                          >
                            <CheckCircle size={15} /> Yes, Proceed
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              handleConfirmAction(msg.pendingConfirmation!.actionId, false)
                            }
                          >
                            <XCircle size={15} /> Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Executed Tools Actions Feedback */}
                    {msg.actionsExecuted && msg.actionsExecuted.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {msg.actionsExecuted.map((act, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: '0.75rem',
                              backgroundColor: 'rgba(16, 185, 129, 0.12)',
                              color: 'var(--success)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontWeight: 500,
                            }}
                          >
                            ✓ Executed: {act.tool}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary-light)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <User size={18} />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {loading && (
            <div style={{ display: 'flex', gap: '12px', alignSelf: 'flex-start' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bot size={18} />
              </div>
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-secondary)',
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Sparkles size={16} />
                <span>Assistant is thinking & checking your calendar...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {error && (
          <div
            style={{
              padding: '10px 16px',
              backgroundColor: 'var(--danger-light)',
              color: 'var(--danger)',
              fontSize: '0.85rem',
              borderTop: '1px solid var(--border-color)',
            }}
          >
            {error}
          </div>
        )}

        {/* Input Bar */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <input
            type="text"
            placeholder="Type your message, e.g. 'Plan my day tomorrow' or 'Reschedule meeting to 4pm'..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
            }}
          />

          <Button
            variant="primary"
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || loading}
          >
            <Send size={16} />
            <span>Send</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
