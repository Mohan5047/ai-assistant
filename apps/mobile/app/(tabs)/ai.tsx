import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { AiMessageResponse } from '@personal-ai-assistant/shared';
import { useTheme } from '../../src/context/ThemeContext';
import { apiClient } from '../../src/lib/api-client';

interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, any>;
    result?: Record<string, any>;
  }>;
  createdAt: string;
}

const SUGGESTIONS = [
  'What is on my schedule today?',
  'Plan my day effectively',
  'Add task: Review sprint goals due tomorrow',
  'Schedule a meeting with Alex tomorrow at 3pm',
];

export default function AiAssistantScreen() {
  const { colors } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);

  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'initial',
      role: 'ASSISTANT',
      content:
        "Hello! I'm your Personal AI Assistant. How can I help you organize your schedule, events, or tasks today?",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSend = async (messageText?: string) => {
    const text = (messageText || inputText).trim();
    if (!text || sending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'USER',
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setSending(true);

    try {
      const response = await apiClient.ai.chat({
        message: text,
        threadId: conversationId,
      });

      if (response.threadId) {
        setConversationId(response.threadId);
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'ASSISTANT',
        content: response.reply,
        toolCalls: response.actionsExecuted?.map((a) => ({
          name: a.tool,
          arguments: {},
          result: a,
        })),
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'ASSISTANT',
        content: `Sorry, I encountered an issue: ${err.message || 'Failed to process request.'}`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  };

  const handleSuggestionPress = (prompt: string) => {
    handleSend(prompt);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.aiAvatar, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="sparkles" size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>AI Assistant</Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              Natural language life assistant
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => {
            setConversationId(undefined);
            setMessages([
              {
                id: 'new',
                role: 'ASSISTANT',
                content: 'Started a fresh conversation. How can I assist you?',
                createdAt: new Date().toISOString(),
              },
            ]);
          }}
          style={styles.newChatBtn}
        >
          <Ionicons name="refresh-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        {/* Messages Feed */}
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.messagesScroll}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((m) => {
            const isUser = m.role === 'USER';
            return (
              <View
                key={m.id}
                style={[
                  styles.messageRow,
                  isUser ? styles.messageRowUser : styles.messageRowAssistant,
                ]}
              >
                {!isUser && (
                  <View style={[styles.botIcon, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="sparkles" size={14} color={colors.primary} />
                  </View>
                )}
                <View
                  style={[
                    styles.bubble,
                    isUser
                      ? [styles.bubbleUser, { backgroundColor: colors.primary }]
                      : [styles.bubbleAssistant, { backgroundColor: colors.surface, borderColor: colors.border }],
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      { color: isUser ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {m.content}
                  </Text>

                  {/* Render tool executions */}
                  {m.toolCalls && m.toolCalls.length > 0 && (
                    <View style={styles.toolsContainer}>
                      {m.toolCalls.map((tc, idx) => (
                        <View key={idx} style={[styles.toolChip, { backgroundColor: colors.surfaceSubtle }]}>
                          <Ionicons name="construct-outline" size={12} color={colors.primary} />
                          <Text style={[styles.toolName, { color: colors.textSecondary }]}>
                            Executed: {tc.name}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          {sending && (
            <View style={[styles.messageRow, styles.messageRowAssistant]}>
              <View style={[styles.botIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="sparkles" size={14} color={colors.primary} />
              </View>
              <View style={[styles.bubble, styles.bubbleAssistant, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Suggestion Chips */}
        {messages.length <= 2 && (
          <View style={styles.suggestionsWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionRow}>
              {SUGGESTIONS.map((prompt, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => handleSuggestionPress(prompt)}
                >
                  <Text style={[styles.chipText, { color: colors.text }]}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input Bar */}
        <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            placeholder="Ask AI anything..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            style={[styles.textInput, { color: colors.text }]}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              { backgroundColor: inputText.trim() ? colors.primary : colors.surfaceSubtle },
            ]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || sending}
          >
            <Ionicons
              name="send"
              size={18}
              color={inputText.trim() ? '#FFFFFF' : colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aiAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 11,
  },
  newChatBtn: {
    padding: 6,
  },
  keyboardContainer: {
    flex: 1,
  },
  messagesScroll: {
    padding: 16,
    paddingBottom: 24,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 6,
    alignItems: 'flex-end',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAssistant: {
    justifyContent: 'flex-start',
  },
  botIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '82%',
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  toolsContainer: {
    marginTop: 8,
    gap: 4,
  },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  toolName: {
    fontSize: 11,
    fontWeight: '600',
  },
  suggestionsWrapper: {
    paddingVertical: 8,
  },
  suggestionRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    fontSize: 14,
    paddingHorizontal: 8,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
