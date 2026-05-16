import { useRouter } from 'expo-router'
import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'

import { useTheme } from '@/hooks/useThemeColor'
import {
  completedSetCount,
  totalSetCount,
  useWorkoutSessionStoreBase,
} from '@/stores/WorkoutSessionStore'
import type { WorkoutSession, WorkoutTemplate } from '@/types/models'

const Workout = ({
  item,
  session,
  index = 0,
}: {
  item: WorkoutTemplate
  session?: WorkoutSession
  index?: number
  isFirst?: boolean
  isLast?: boolean
}) => {
  const router = useRouter()
  const startSession = useWorkoutSessionStoreBase((state) => state.startSession)
  const {
    text: textColor,
    subtitleText,
    cardSurface,
    success: successColor,
    accent: accentColor,
    border: borderColor,
  } = useTheme()

  const completedSets = session ? completedSetCount(session) : 0
  const totalSets = session ? totalSetCount(session) : 0
  const progress = totalSets > 0 ? completedSets / totalSets : 0
  const hasStarted = completedSets > 0
  const allDone = session?.status === 'complete'

  return (
    <Animated.View entering={FadeIn.delay(index * 40).duration(300)}>
      <Pressable
        onPress={() => {
          const nextSession = session ?? startSession(item)
          router.push({
            pathname: '/details/[id]',
            params: { id: nextSession.id, title: item.title },
          })
        }}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: pressed ? `${cardSurface}dd` : cardSurface },
        ]}
      >
        {/* Left accent bar */}
        <View
          style={[
            styles.accentBar,
            {
              backgroundColor: allDone
                ? successColor
                : hasStarted
                  ? accentColor
                  : item.color,
              opacity: allDone ? 0.7 : 1,
            },
          ]}
        />

        <View style={styles.body}>
          {/* Top row: title + status */}
          <View style={styles.topRow}>
            <View style={styles.titleBlock}>
              <Text
                style={[
                  styles.title,
                  { color: allDone ? subtitleText : textColor },
                  allDone && styles.titleDone,
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <View style={styles.metaRow}>
                <Text style={[styles.metaText, { color: subtitleText }]}>
                  {item.exercises.length} exercise
                  {item.exercises.length !== 1 ? 's' : ''}
                </Text>
                {item.cardio && (
                  <>
                    <Text style={[styles.metaDot, { color: borderColor }]}>
                      ·
                    </Text>
                    <Text style={[styles.metaText, { color: subtitleText }]}>
                      {item.cardio.morning + item.cardio.evening}m cardio
                    </Text>
                  </>
                )}
              </View>
            </View>

            {allDone ? (
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: `${successColor}20` },
                ]}
              >
                <Text style={[styles.statusText, { color: successColor }]}>
                  Done
                </Text>
              </View>
            ) : hasStarted ? (
              <Text style={[styles.fraction, { color: accentColor }]}>
                {completedSets}/{totalSets}
              </Text>
            ) : (
              <Text style={[styles.chevron, { color: subtitleText }]}>›</Text>
            )}
          </View>

          {/* Progress bar (only when started but not finished) */}
          {hasStarted && !allDone && (
            <View
              style={[styles.progressTrack, { backgroundColor: borderColor }]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: accentColor,
                    width: `${progress * 100}%`,
                  },
                ]}
              />
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    overflow: 'hidden',
    minHeight: 76,
  },
  accentBar: {
    width: 4,
  },
  body: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleBlock: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '400',
  },
  metaDot: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  fraction: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  chevron: {
    fontSize: 24,
    fontWeight: '300',
    opacity: 0.4,
  },
  progressTrack: {
    height: 3,
    borderRadius: 1.5,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
})

export default Workout
