import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'
import { useTheme } from '@/hooks/useThemeColor'
import { activeCoachEngine } from '@/lib/coach'
import type { CoachChatContext, CoachChatMessage } from '@/lib/coach'
import { useRecoveryPresentation } from '@/utils/recovery'

const SUGGESTIONS = [
  'How was my week?',
  "Plan tomorrow's session",
  'Am I recovered enough to train?',
] as const

interface ChatMessage extends CoachChatMessage {
  id: string
}

export default function CoachScreen() {
  const router = useRouter()
  const theme = useTheme()
  const { snapshot } = useHealthSnapshot()
  const recoveryPresentation = useRecoveryPresentation({
    hrv: snapshot?.hrv ?? 0,
    restingHR: snapshot?.restingHeartRate ?? 0,
    sleepHours: snapshot?.sleepHours ?? 0,
    hrvBaseline: null,
    rhrBaseline: null,
    sleepGoalHours: 8,
  })

  const contextRef = useRef<CoachChatContext>({
    dateISO: new Date().toISOString(),
    snapshot: null,
    recovery: null,
  })
  contextRef.current = {
    dateISO: new Date().toISOString(),
    snapshot,
    recovery: snapshot ? recoveryPresentation : null,
  }

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesRef = useRef<ChatMessage[]>([])
  const scrollRef = useRef<ScrollView>(null)
  const generationRef = useRef(0)

  useEffect(() => {
    messagesRef.current = messages
    requestAnimationFrame(() =>
      scrollRef.current?.scrollToEnd({ animated: true }),
    )
  }, [messages])

  useEffect(() => {
    return () => {
      generationRef.current += 1
    }
  }, [])

  const firstAssistantId = useMemo(
    () => messages.find((message) => message.role === 'assistant')?.id,
    [messages],
  )

  const sendMessage = useCallback(
    async (rawText: string) => {
      const text = rawText.trim()
      if (!text || isStreaming) {
        return
      }

      const generation = generationRef.current + 1
      generationRef.current = generation
      setIsStreaming(true)
      setInput('')

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
      }
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
      }
      const history = [...messagesRef.current, userMessage].map(
        ({ role, content }) => ({ role, content }),
      )

      setMessages((current) => [...current, userMessage, assistantMessage])

      const coachContext = contextRef.current

      try {
        for await (const chunk of activeCoachEngine.chat(
          history,
          coachContext,
        )) {
          if (generationRef.current !== generation) {
            return
          }

          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMessage.id
                ? { ...message, content: message.content + chunk }
                : message,
            ),
          )
        }
      } catch {
        if (generationRef.current === generation) {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMessage.id
                ? { ...message, content: "I couldn't respond right now." }
                : message,
            ),
          )
        }
      } finally {
        if (generationRef.current === generation) {
          setIsStreaming(false)
        }
      }
    },
    [isStreaming],
  )

  const renderSuggestions = () => (
    <View style={styles.chips}>
      {SUGGESTIONS.map((suggestion) => (
        <Pressable
          key={suggestion}
          onPress={() => void sendMessage(suggestion)}
          disabled={isStreaming}
          style={({ pressed }) => [
            styles.chip,
            {
              backgroundColor: theme.accentInactive,
              borderColor: theme.border,
              opacity: pressed || isStreaming ? 0.7 : 1,
            },
          ]}
        >
          <Text style={[styles.chipText, { color: theme.accent }]}>
            {suggestion}
          </Text>
        </Pressable>
      ))}
    </View>
  )

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { borderBottomColor: theme.separator }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Coach</Text>
          <Text style={[styles.subtitle, { color: theme.subtitleText }]}>
            On-device guidance
          </Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={[
          styles.messagesContent,
          messages.length === 0 && styles.emptyMessagesContent,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: theme.accentInactive },
              ]}
            >
              <Ionicons name="chatbubbles" size={30} color={theme.accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              Ask your coach anything
            </Text>
            <Text style={[styles.emptyCopy, { color: theme.subtitleText }]}>
              Get practical training guidance from your health snapshot and
              recovery signals.
            </Text>
            {renderSuggestions()}
          </View>
        ) : (
          messages.map((message) => {
            const isUser = message.role === 'user'
            return (
              <View
                key={message.id}
                style={[
                  styles.messageRow,
                  isUser ? styles.userRow : styles.assistantRow,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    isUser ? styles.userBubble : styles.assistantBubble,
                    {
                      backgroundColor: isUser
                        ? theme.accent
                        : theme.cardBackground,
                      borderColor: isUser ? theme.accent : theme.border,
                    },
                  ]}
                >
                  {!isUser && message.id === firstAssistantId ? (
                    <Text
                      style={[styles.caption, { color: theme.subtitleText }]}
                    >
                      On-device AI
                    </Text>
                  ) : null}
                  <Text
                    style={[
                      styles.messageText,
                      { color: isUser ? theme.selectedText : theme.text },
                    ]}
                  >
                    {message.content || 'Thinking…'}
                  </Text>
                </View>
              </View>
            )
          })
        )}
      </ScrollView>

      <View style={[styles.inputWrap, { borderTopColor: theme.separator }]}>
        <View
          style={[
            styles.inputRow,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
            },
          ]}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask about training, recovery, or tomorrow…"
            placeholderTextColor={theme.subtitleText}
            editable={!isStreaming}
            style={[styles.input, { color: theme.text }]}
            returnKeyType="send"
            onSubmitEditing={() => void sendMessage(input)}
          />
          <Pressable
            onPress={() => void sendMessage(input)}
            disabled={isStreaming || input.trim().length === 0}
            style={({ pressed }) => [
              styles.sendButton,
              {
                backgroundColor: theme.accent,
                opacity:
                  pressed || isStreaming || input.trim().length === 0
                    ? 0.55
                    : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <Ionicons name="send" size={18} color={theme.selectedText} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    paddingBottom: 28,
    gap: 14,
  },
  emptyMessagesContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    gap: 14,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyCopy: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  messageRow: {
    flexDirection: 'row',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '84%',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  userBubble: {
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    borderBottomLeftRadius: 6,
  },
  caption: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  inputWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    minHeight: 38,
    fontSize: 15,
    fontWeight: '500',
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
