import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useCallback, useState } from 'react'
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
import { useTheme } from '@/hooks/useThemeColor'
import { useTodaySnapshot } from '@/hooks/useTodaySnapshot'

export default function HomeScreen() {
  const router = useRouter()
  const theme = useTheme()
  const snapshot = useTodaySnapshot()

  const [refreshing, setRefreshing] = useState(false)
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await snapshot.refresh()
    setRefreshing(false)
  }, [snapshot])

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
        date={snapshot.date}
        recoveryScore={snapshot.recoveryScore}
        suggestion={snapshot.suggestion}
      />

      <ReadinessStrip readiness={snapshot.readiness} />

      <PillarTriplet
        weekly={snapshot.training.weekly}
        targets={snapshot.training.targets}
      />

      <LoadChart
        dailyBars={snapshot.training.dailyBars}
        acwr={snapshot.training.acwr}
      />

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
