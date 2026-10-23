import { Ionicons } from '@expo/vector-icons'
import { usePreventRemove } from '@react-navigation/native'
import { useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ScreenHeader } from '@/components/common/ScreenHeader'
import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Layout, Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useInboxZero } from '@/hooks/useInboxZero'
import { useTheme } from '@/hooks/useThemeColor'
import { groupSenders } from '@/lib/inboxZero'

type Review =
  | { kind: 'trash'; ids: string[] }
  | { kind: 'unsubscribe'; url: string }

export default function InboxZeroScreen() {
  const theme = useTheme()
  const inbox = useInboxZero()
  const [selected, setSelected] = useState<string[]>([])
  const [review, setReview] = useState<Review | null>(null)
  const groups = useMemo(() => groupSenders(inbox.messages), [inbox.messages])
  const selectedMessages = inbox.messages.filter((message) =>
    selected.includes(message.sender),
  )
  const locked = Boolean(inbox.busy || review)
  usePreventRemove(inbox.busy === 'trashing', () => {
    Alert.alert(
      'Cleanup in progress',
      'Wait for Gmail to confirm the result before leaving.',
    )
  })

  const button = (
    label: string,
    onPress: () => void,
    disabled = false,
    danger = false,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: danger ? theme.danger : theme.accent,
          opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text style={[styles.buttonText, { color: theme.selectedText }]}>
        {label}
      </Text>
    </Pressable>
  )

  return (
    <SafeAreaView
      testID="inbox-zero-screen"
      edges={['top', 'left', 'right']}
      style={[styles.safe, { backgroundColor: theme.background }]}
    >
      <ScreenHeader title="Inbox Zero" backLabel="Back" />
      <ScrollView contentContainerStyle={styles.content}>
        <Ionicons name="mail-outline" size={48} color={theme.text} />
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: theme.text }]}
        >
          Less mail. More space.
        </Text>
        <Text style={[styles.body, { color: theme.subtitleText }]}>
          Review your Gmail inbox by sender. Select groups to move their loaded
          messages to Trash, or open a sender’s unsubscribe page.
        </Text>
        <Text style={[styles.small, { color: theme.subtitleText }]}>
          Only sender, subject and unsubscribe headers are read—no message
          bodies, attachments or images. Email and access tokens stay in memory
          while this screen is open. No backend, AI upload, Health or coach
          access.
        </Text>
        {inbox.unavailable ? (
          <Text
            accessibilityRole="alert"
            style={[styles.body, { color: theme.warning }]}
          >
            {inbox.unavailable}
          </Text>
        ) : !inbox.connected ? (
          <>
            <Text style={[styles.small, { color: theme.subtitleText }]}>
              Google’s cleanup permission also allows reading, composing and
              sending mail. Gym uses it only to read inbox headers and move
              explicitly confirmed messages to Trash. Nothing is sent or
              permanently deleted by Gym. Connect again after leaving this
              screen or when access expires.
            </Text>
            {button(
              inbox.busy ? 'Connecting…' : 'Connect Gmail',
              () => void inbox.connect(),
              Boolean(inbox.busy),
            )}
          </>
        ) : (
          <>
            <Text
              accessibilityRole="header"
              style={[styles.heading, { color: theme.text }]}
            >
              {inbox.messages.length} loaded messages · {groups.length} senders
            </Text>
            <Text style={[styles.small, { color: theme.subtitleText }]}>
              Inbox only, not archived mail, Spam or Trash. Load more to include
              older messages; counts are for loaded messages only.
            </Text>
            {button(
              'Refresh inbox',
              () => {
                setSelected([])
                void inbox.load()
              },
              locked,
            )}
            {button(
              'Disconnect',
              () => {
                setSelected([])
                inbox.disconnect()
              },
              locked,
            )}
            {inbox.needsRefresh && (
              <Text
                accessibilityRole="alert"
                style={[styles.body, { color: theme.warning }]}
              >
                Refresh before another cleanup. A previous attempt may have
                changed the inbox.
              </Text>
            )}
            {selectedMessages.length > 0 &&
              button(
                `Review ${selectedMessages.length} messages for Trash`,
                () =>
                  setReview({
                    kind: 'trash',
                    ids: selectedMessages.map((m) => m.id),
                  }),
                locked || inbox.needsRefresh || selectedMessages.length > 1000,
                true,
              )}
            {selectedMessages.length > 1000 && (
              <Text style={[styles.small, { color: theme.warning }]}>
                Select at most 1,000 loaded messages per batch.
              </Text>
            )}
            {groups.length === 0 && !inbox.busy && !inbox.error && (
              <Text style={[styles.body, { color: theme.subtitleText }]}>
                No inbox messages loaded. Refresh to check Gmail.
              </Text>
            )}
          </>
        )}
        {review && (
          <View
            accessibilityViewIsModal
            style={[
              styles.card,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.danger,
              },
            ]}
          >
            <Text
              accessibilityRole="header"
              style={[styles.heading, { color: theme.text }]}
            >
              {review.kind === 'trash'
                ? `Move ${review.ids.length} messages to Trash?`
                : 'Open unsubscribe page?'}
            </Text>
            <Text selectable style={[styles.body, { color: theme.text }]}>
              {review.kind === 'trash'
                ? 'Only the loaded messages from your selected senders will move. This is not permanent deletion, but Gmail normally deletes Trash after 30 days. You can restore messages in Gmail. It does not unsubscribe you.'
                : `This link came from an email, not Google. Check the destination before opening and never enter your Google password there.\n\n${review.url}\n\nFinish unsubscribing in your browser. Gym cannot confirm its result.`}
            </Text>
            {button('Cancel', () => setReview(null), Boolean(inbox.busy))}
            {button(
              review.kind === 'trash' ? 'Confirm move to Trash' : 'Open page',
              () => {
                const confirmed = review
                setReview(null)
                if (confirmed.kind === 'trash') {
                  setSelected([])
                  void inbox.trash(confirmed.ids)
                } else void inbox.openUnsubscribe(confirmed.url)
              },
              Boolean(inbox.busy),
              review.kind === 'trash',
            )}
          </View>
        )}
        {inbox.busy && (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.body, { color: theme.subtitleText }]}
          >
            {inbox.busy === 'trashing'
              ? 'Moving messages and checking Gmail Trash…'
              : 'Working…'}
          </Text>
        )}
        {inbox.error && (
          <Text
            accessibilityRole="alert"
            style={[styles.body, { color: theme.danger }]}
          >
            {inbox.error}
          </Text>
        )}
        {inbox.notice && (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.body, { color: theme.text }]}
          >
            {inbox.notice}
          </Text>
        )}
        {groups.map((group) => {
          const checked = selected.includes(group.sender)
          const links = [
            ...new Set(group.messages.flatMap((m) => m.unsubscribe)),
          ]
          return (
            <View
              key={group.sender}
              style={[
                styles.card,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.border,
                },
              ]}
            >
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel={`${group.sender}, ${group.messages.length} loaded messages`}
                accessibilityState={{ checked, disabled: locked }}
                disabled={locked}
                onPress={() =>
                  setSelected((previous) =>
                    checked
                      ? previous.filter((s) => s !== group.sender)
                      : [...previous, group.sender],
                  )
                }
                style={styles.sender}
              >
                <Ionicons
                  name={checked ? 'checkbox-outline' : 'square-outline'}
                  size={24}
                  color={theme.accent}
                />
                <Text style={[styles.senderText, { color: theme.text }]}>
                  {group.sender}
                  {'\n'}
                  {group.messages.length} messages
                </Text>
              </Pressable>
              {group.messages.slice(0, 3).map((m) => (
                <Text
                  key={m.id}
                  style={[styles.small, { color: theme.subtitleText }]}
                >
                  {m.subject}
                </Text>
              ))}
              {links.length === 0 ? (
                <Text style={[styles.small, { color: theme.subtitleText }]}>
                  No supported HTTPS unsubscribe link in these messages. Use the
                  original message in Gmail.
                </Text>
              ) : (
                links.map((url) => (
                  <View key={url}>
                    {button(
                      `Review unsubscribe · ${new URL(url).hostname}`,
                      () => setReview({ kind: 'unsubscribe', url }),
                      locked,
                    )}
                  </View>
                ))
              )}
            </View>
          )
        })}
        {inbox.nextPage &&
          button(
            'Load 100 more',
            () => void inbox.load(true),
            locked || inbox.needsRefresh,
          )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    padding: Layout.gutter,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  title: Typography.headingXl,
  heading: Typography.headingMd,
  body: Typography.bodyMd,
  small: Typography.bodySm,
  card: {
    padding: Spacing.md,
    gap: Spacing.sm,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  sender: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: Layout.controlSize,
  },
  senderText: { ...Typography.headingSm, flex: 1 },
  button: {
    minHeight: Layout.controlSize,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radii.sm,
    padding: Spacing.sm,
  },
  buttonText: { ...Typography.labelLg, textAlign: 'center' },
})
