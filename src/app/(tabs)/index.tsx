import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useCallback, useMemo, useState } from 'react'
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'

import { BodyFooter } from '@/components/dashboard/BodyFooter'
import { HyroxBenchmarkCard } from '@/components/dashboard/HyroxBenchmarkCard'
import { LoadChart } from '@/components/dashboard/LoadChart'
import { PillarTriplet } from '@/components/dashboard/PillarTriplet'
import { ReadinessStrip } from '@/components/dashboard/ReadinessStrip'
import { TodayHeader } from '@/components/dashboard/TodayHeader'
import { useReadiness } from '@/hooks/useReadiness'
import { useTheme } from '@/hooks/useThemeColor'
import { useTodaySuggestion } from '@/hooks/useTodaySuggestion'
import { useWeeklyTraining } from '@/hooks/useWeeklyTraining'

export default function HomeScreen() {
  const router = useRouter()
  const theme = useTheme()
  const today = useMemo(() => new Date(), [])

  const readiness = useReadiness()
  const training = useWeeklyTraining()
  const suggestion = useTodaySuggestion(readiness, training.sessions)

  const [refreshing, setRefreshing] = useState(false)
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.allSettled([readiness.refresh(), training.refresh()])
    setRefreshing(false)
  }, [readiness, training])

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <StatusBar barStyle="light-content" />

      <View style={styles.topActions}>
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: theme.cardBackground }]}
          onPress={() => router.push('/fitness-metrics')}
          activeOpacity={0.7}
          accessibilityLabel="Health metrics"
        >
          <Ionicons name="pulse-outline" size={18} color={theme.text} />
        </TouchableOpacity>
      </View>

      <TodayHeader
        date={today}
        recoveryScore={readiness.recoveryScore}
        suggestion={suggestion}
      />

      <ReadinessStrip readiness={readiness} />

      <PillarTriplet weekly={training.weekly} targets={training.targets} />

      <LoadChart dailyBars={training.dailyBars} acwr={training.acwr} />

      <HyroxBenchmarkCard />

      <BodyFooter />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 120,
  },
  topActions: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
