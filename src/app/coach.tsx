import { Ionicons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ScreenHeader } from '@/components/common/ScreenHeader'
import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { HealthDateRoute } from '@/components/health/HealthDateRoute'
import { Layout, Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useColorScheme } from '@/hooks/useColorScheme'
import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'
import { useTheme } from '@/hooks/useThemeColor'
import { activeCoachEngine } from '@/lib/coach'
import type { CoachChatContext, CoachChatMessage } from '@/lib/coach'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
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
  return (
    <HealthDateRoute>
      {(date) => <CoachForDate key={localDateKey(date)} date={date} />}
    </HealthDateRoute>
  )
}

function CoachForDate({ date }: { date: Date }) {
  const theme = useTheme()
  const colorScheme = useColorScheme()
  const { snapshot } = useHealthSnapshot(date)
  const recovery = useRecoveryPresentation({
    hrv: snapshot?.hrv ?? null,
    restingHR: snapshot?.restingHeartRate ?? null,
    sleepHours: snapshot?.sleepHours ?? null,
    hrvBaseline: null,
    rhrBaseline: null,
    sleepGoalHours: 8,
  })

  const context: CoachChatContext = {
    dateISO: snapshot?.date ?? localDateKey(date),
    snapshot,
    recovery,
  }
  const contextRef = useRef(context)
  contextRef.current = context

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
          accessibilityRole="button"
          accessibilityState={{ disabled: isStreaming }}
          style={({ pressed }) => [
            styles.chip,
            {
              backgroundColor: theme.accentInactive,
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
    <SafeAreaView
      testID="coach-screen"
      edges={['top', 'left', 'right']}
      style={[styles.container, { backgroundColor: theme.homeBackground }]}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader
          title="Coach"
          subtitle={`On-device · ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
        />

        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={[
            styles.messagesContent,
            messages.length === 0 && styles.emptyMessagesContent,
          ]}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <View
                style={[
                  styles.emptyIcon,
                  { backgroundColor: theme.cardSurface },
                ]}
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={30}
                  color={theme.text}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                Ask your coach anything
              </Text>
              <Text style={[styles.emptyCopy, { color: theme.subtitleText }]}>
                Practical guidance from this day’s health snapshot and recovery
                signals. Your health data stays on your device.
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
                          : theme.cardSurface,
                      },
                    ]}
                  >
                    {!isUser && message.id === firstAssistantId ? (
                      <Text
                        selectable
                        style={[styles.caption, { color: theme.subtitleText }]}
                      >
                        On-device AI
                      </Text>
                    ) : null}
                    <Text
                      selectable
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

        <SafeAreaView edges={['bottom']} style={styles.composerSafe}>
          <View style={styles.inputWrap}>
            <View
              style={[
                styles.inputRow,
                {
                  backgroundColor: theme.cardSurface,
                  borderColor: theme.border,
                },
              ]}
            >
              <TextInput
                testID="coach-input"
                accessibilityLabel="Message your coach"
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
                accessibilityState={{
                  disabled: isStreaming || input.trim().length === 0,
                }}
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
                <Ionicons
                  name="arrow-up"
                  size={22}
                  color={theme.selectedText}
                />
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    padding: Layout.gutter,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  emptyMessagesContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.lg,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...Typography.headingLg,
    textAlign: 'center',
  },
  emptyCopy: {
    ...Typography.bodyMd,
    textAlign: 'center',
    maxWidth: 440,
  },
  chips: {
    width: '100%',
    maxWidth: 440,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  chip: {
    borderRadius: Radii.lg,
    borderCurve: 'continuous',
    minHeight: Layout.controlSize,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    justifyContent: 'center',
  },
  chipText: {
    ...Typography.labelLg,
    textAlign: 'center',
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
    maxWidth: '92%',
    borderRadius: Radii.xl,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  userBubble: {
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    borderBottomLeftRadius: 6,
  },
  caption: {
    ...Typography.labelMd,
    marginBottom: Spacing.xs,
  },
  messageText: {
    ...Typography.bodyMd,
  },
  composerSafe: {
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
  },
  inputWrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingLeft: Spacing.lg,
    paddingRight: 6,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    minHeight: 48,
    fontSize: Typography.bodyMd.fontSize,
    fontWeight: '400',
  },
  sendButton: {
    width: Layout.controlSize,
    height: Layout.controlSize,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
