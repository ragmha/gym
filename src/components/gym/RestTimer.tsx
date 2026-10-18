import { Ionicons } from '@expo/vector-icons'
import React, { useEffect, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Layout, Radii, Spacing } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

/** Counts up from the last logged set towards the suggested rest. */
export function RestTimer({
  startedAt,
  seconds,
  onAdjust,
  onDismiss,
}: {
  startedAt: number
  seconds: number
  onAdjust: (step: number) => void
  onDismiss: () => void
}) {
  const theme = useTheme()
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000))
  const done = elapsed >= seconds

  const step = (delta: number) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${delta > 0 ? 'Add' : 'Remove'} 15 seconds of rest`}
      onPress={() => onAdjust(delta)}
      style={({ pressed }) => [
        styles.step,
        { borderColor: theme.goalTrack, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Text style={[styles.mono, { color: theme.text }]}>
        {delta > 0 ? '+15' : '−15'}
      </Text>
    </Pressable>
  )

  return (
    <View testID="gym-rest-timer">
      <View style={[styles.track, { backgroundColor: theme.goalTrack }]}>
        <View
          style={[
            styles.track,
            {
              backgroundColor: theme.goalComplete,
              width: `${Math.min(1, elapsed / seconds) * 100}%`,
            },
          ]}
        />
      </View>
      <View style={styles.row}>
        <Text
          accessibilityLabel={`Resting ${clock(elapsed)}`}
          style={[styles.clock, { color: theme.text }]}
        >
          {clock(elapsed)}
        </Text>
        <Text
          style={[
            styles.mono,
            styles.flex,
            { color: done ? theme.goalComplete : theme.subtitleText },
          ]}
        >
          {done ? 'Rest done' : `Rest ${clock(seconds)}`}
        </Text>
        {step(-15)}
        {step(15)}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss rest timer"
          onPress={onDismiss}
          hitSlop={8}
        >
          <Ionicons name="close" size={24} color={theme.subtitleText} />
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  track: { height: 4 },
  row: {
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Layout.gutter,
    paddingVertical: Spacing.xs,
  },
  flex: { flex: 1 },
  clock: {
    fontFamily: 'SpaceMono',
    fontSize: 28,
    fontVariant: ['tabular-nums'],
  },
  mono: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontVariant: ['tabular-nums'],
  },
  step: {
    minWidth: Layout.controlSize,
    height: 38,
    borderWidth: 2,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
