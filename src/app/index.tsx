import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React, { useCallback, useRef, useState } from 'react'
import { AppState, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import {
  GoalGrid,
  GoalSummary,
  type GoalGridHandle,
} from '@/components/dashboard/GoalGrid'
import { HealthDateRoute } from '@/components/health/HealthDateRoute'
import { HealthReadState } from '@/components/health/HealthReadState'
import { Layout, Spacing, Typography } from '@/constants/DesignSystem'
import { useColorScheme } from '@/hooks/useColorScheme'
import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'
import { useTheme } from '@/hooks/useThemeColor'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'

export default function HomeScreen() {
  return (
    <HealthDateRoute>
      {(date) => <HomeForDate selectedDate={date} />}
    </HealthDateRoute>
  )
}

function HomeForDate({ selectedDate }: { selectedDate: Date }) {
  const router = useRouter()
  const theme = useTheme()
  const colorScheme = useColorScheme()
  const insets = useSafeAreaInsets()

  const [refreshing, setRefreshing] = useState(false)
  const [pagination, setPagination] = useState({ index: 0, count: 0 })
  const goalGrid = useRef<GoalGridHandle>(null)

  const { snapshot, status, error, isDemoMode, refresh } =
    useHealthSnapshot(selectedDate)
  const canPage = status !== 'error' && !(status === 'loading' && !snapshot)
  useFocusEffect(
    useCallback(() => {
      if (isDemoMode) return

      let pollInFlight = false
      // ponytail: five-minute fallback for missed imports; observers handle prompt refreshes.
      const interval = setInterval(() => {
        if (AppState.currentState !== 'active' || pollInFlight) return
        pollInFlight = true
        void refresh().finally(() => {
          pollInFlight = false
        })
      }, 5 * 60_000)
      return () => clearInterval(interval)
    }, [refresh, isDemoMode]),
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refresh()
    } finally {
      setRefreshing(false)
    }
  }, [refresh])

  return (
    <View
      testID="home-screen"
      style={[
        styles.container,
        {
          backgroundColor: theme.homeBackground,
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <View testID="home-content" style={styles.content}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

        <GoalSummary
          snapshot={snapshot}
          date={selectedDate}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onSettingsPress={() => router.push('/settings')}
        />

        {isDemoMode && (
          <Text style={[styles.demo, { color: theme.subtitleText }]}>
            Demo data - Apple Health is available on iOS.
          </Text>
        )}

        {status === 'loading' && !snapshot ? (
          <HealthReadState loading />
        ) : status === 'error' ? (
          <HealthReadState error={error} onRetry={onRefresh} />
        ) : (
          <GoalGrid
            key={localDateKey(selectedDate)}
            snapshot={snapshot}
            date={selectedDate}
            ref={goalGrid}
            onPageChange={setPagination}
          />
        )}
      </View>
      <View
        testID="home-footer"
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, Spacing.xs),
          },
        ]}
      >
        <View style={styles.footerNavigation}>
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/insights',
                params: { date: localDateKey(selectedDate) },
              })
            }
            style={({ pressed }) => [
              styles.footerButton,
              { opacity: pressed ? 0.65 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Insights"
            accessibilityHint="Opens the calendar to review past days"
          >
            <Ionicons name="bar-chart-outline" size={22} color={theme.text} />
          </Pressable>
          <View style={styles.pageIndicators}>
            {Array.from({ length: pagination.count }, (_, index) => (
              <Pressable
                key={index}
                style={styles.footerButton}
                disabled={!canPage}
                accessibilityRole="button"
                accessibilityLabel={`Show dashboard page ${index + 1} of ${pagination.count}`}
                aria-pressed={index === pagination.index}
                accessibilityState={{
                  selected: index === pagination.index,
                  disabled: !canPage,
                }}
                onPress={() => goalGrid.current?.showPage(index)}
              >
                <View
                  style={[
                    styles.pageDot,
                    {
                      backgroundColor:
                        index === pagination.index
                          ? theme.text
                          : theme.goalTrack,
                      opacity: canPage ? 1 : 0.4,
                    },
                  ]}
                />
              </Pressable>
            ))}
          </View>
          <Pressable
            testID="open-coach"
            onPress={() =>
              router.push({
                pathname: '/coach',
                params: { date: localDateKey(selectedDate) },
              })
            }
            style={({ pressed }) => [
              styles.footerButton,
              { opacity: pressed ? 0.65 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open coach"
            accessibilityHint="Opens your AI coach chat"
          >
            <Ionicons name="chatbubble-outline" size={22} color={theme.text} />
          </Pressable>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    paddingTop: Spacing.xs,
    gap: Spacing.xs,
  },
  footer: {
    paddingTop: Spacing.xxs,
  },
  footerNavigation: {
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.gutter,
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageIndicators: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  pageDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  demo: {
    ...Typography.bodySm,
    marginHorizontal: Layout.gutter,
  },
})
