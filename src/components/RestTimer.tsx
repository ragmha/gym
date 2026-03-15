import { useTheme } from '@/hooks/useThemeColor'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
} from 'react-native'
import Animated, {
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

interface RestTimerProps {
  /** Total rest time in seconds */
  restSeconds: number
  onDismiss: () => void
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}m${s.toString().padStart(2, '0')}s`
}

export function RestTimer({ restSeconds, onDismiss }: RestTimerProps) {
  const [remaining, setRemaining] = useState(restSeconds)
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null)
  const [barWidth, setBarWidth] = useState(0)

  const progress = useSharedValue(1)

  const {
    text: textColor,
    cardSurface,
    subtitleText,
    accent: accentColor,
    success: successColor,
  } = useTheme()

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  useEffect(() => {
    progress.value = withTiming(remaining / restSeconds, { duration: 300 })
  }, [remaining, restSeconds, progress])

  const animatedBarStyle = useAnimatedStyle(() => ({
    width: barWidth * progress.value,
  }))

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setBarWidth(e.nativeEvent.layout.width)
  }, [])

  const isFinished = remaining === 0

  return (
    <Animated.View
      entering={SlideInDown.duration(250)}
      exiting={SlideOutDown.duration(200)}
      style={[styles.snackbar, { backgroundColor: cardSurface }]}
    >
      <View style={styles.row}>
        <Text style={[styles.timeText, { color: textColor }]}>
          {formatTime(remaining)}
        </Text>
        <Text style={[styles.restLabel, { color: subtitleText }]}>
          Rest {Math.floor(restSeconds / 60)} min
        </Text>
        <View style={styles.spacer} />
        <TouchableOpacity
          onPress={onDismiss}
          style={styles.dismissButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.dismissText, { color: subtitleText }]}>✕</Text>
        </TouchableOpacity>
      </View>

      <View
        style={[styles.progressTrack, { backgroundColor: '#333' }]}
        onLayout={handleLayout}
      >
        <Animated.View
          style={[
            styles.progressFill,
            { backgroundColor: isFinished ? successColor : accentColor },
            animatedBarStyle,
          ]}
        />
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  snackbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 34,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  spacer: {
    flex: 1,
  },
  timeText: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  restLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  dismissButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressTrack: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
})
