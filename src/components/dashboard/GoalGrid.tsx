import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from 'react'
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native'
import Animated, {
  useReducedMotion,
  type CSSStyle,
} from 'react-native-reanimated'
import Svg, { Circle, Rect } from 'react-native-svg'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import {
  GoalMascot,
  type GoalMascotKind,
  type GoalMascotMood,
} from '@/components/dashboard/GoalMascot'
import { Layout, Spacing } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'
import {
  CARDIO_MINUTES_GOAL,
  DAILY_STEP_GOAL,
  longestWorkout,
  summarizeMorningWeights,
} from '@/lib/dailyGoals'
import { presentSteps } from '@/lib/fitnessMetrics/presenter'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'
import { useGymLogStore } from '@/stores/GymLogStore'

type Route = '/steps' | '/water' | '/gym' | '/fitness-metrics'

interface Tile {
  label: string
  icon: GoalMascotKind | 'metrics'
  caption: string
  accessibilityLabel: string
  hint: string
  /** null = no goal exists for this reading, so it is never "done". */
  done: boolean | null
  progress: number | null
  /** External activities have no measured goal progress. */
  status?: string
  route?: Route
  /** External app; its progress is never read or inferred. */
  url?: string
}

function DotRing({
  done,
  total,
  color,
  track,
}: {
  done: number
  total: number
  color: string
  track: string
}) {
  const dots = 16
  const lit = total === 0 ? 0 : Math.round((done / total) * dots)
  return (
    <Svg width={32} height={32}>
      {Array.from({ length: dots }, (_, i) => {
        const angle = (i / dots) * 2 * Math.PI - Math.PI / 2
        return (
          <Circle
            key={i}
            cx={16 + 12 * Math.cos(angle)}
            cy={16 + 12 * Math.sin(angle)}
            r={1.7}
            fill={i < lit ? color : track}
          />
        )
      })}
      <Circle cx={16} cy={16} r={2.6} fill={color} />
    </Svg>
  )
}

function useLiftLogged(date: Date): boolean {
  const key = localDateKey(date)
  return useGymLogStore((s) => Boolean(s.logs[key]?.finishedAt))
}

function buildTiles(
  snapshot: DailyHealthSnapshot | null,
  date: Date,
  liftLogged: boolean,
): Tile[] {
  const steps = presentSteps(snapshot)
  const stepCount = snapshot?.steps ?? null
  const run = longestWorkout(snapshot, 'running')
  const stairs = longestWorkout(snapshot, 'stairClimber')
  const lift = longestWorkout(snapshot, 'strength')
  const water = snapshot?.waterLiters ?? null
  const morning = summarizeMorningWeights(
    snapshot?.bodyMassHistory ?? null,
    date,
  ).morning
  const cardioCaption = run
    ? `Run ${Math.floor(run.durationMinutes)} min`
    : stairs
      ? `Stairs ${Math.floor(stairs.durationMinutes)} min`
      : '--'
  const cardioProgress = run
    ? Math.min(run.durationMinutes / CARDIO_MINUTES_GOAL, 1)
    : stairs
      ? 0
      : null
  const gymParts = [
    cardioProgress,
    lift || liftLogged ? 1 : null,
    morning ? 1 : null,
  ]
  const gymDoneCount = gymParts.filter((progress) => progress === 1).length
  // Missing subgoals earn no progress, but never become invented readings.
  const gymProgress = gymParts.every((progress) => progress === null)
    ? null
    : gymParts.reduce<number>((sum, progress) => sum + (progress ?? 0), 0) /
      gymParts.length

  return [
    {
      label: 'Steps',
      icon: 'steps',
      caption: steps.value,
      accessibilityLabel:
        steps.status === 'empty' ? 'Steps unavailable' : `Steps ${steps.value}`,
      hint: `Goal ${DAILY_STEP_GOAL.toLocaleString()} steps. Opens step details.`,
      done: stepCount === null ? false : stepCount >= DAILY_STEP_GOAL,
      progress: stepCount === null ? null : steps.progress,
      route: '/steps',
    },
    {
      label: 'Gym',
      icon: 'lift',
      caption: gymProgress === null ? '--' : `${gymDoneCount}/3 goals`,
      accessibilityLabel: [
        `Gym, ${gymDoneCount} of 3 goals met`,
        `Cardio, ${cardioCaption === '--' ? 'no workout' : cardioCaption}`,
        lift
          ? `Lift, ${Math.floor(lift.durationMinutes)} minutes`
          : liftLogged
            ? 'Lift, programme workout finished'
            : 'Lift, no strength workout',
        morning
          ? `Weight, ${morning.kilograms.toFixed(1)} kg weigh-in`
          : 'Weight, no morning weigh-in',
      ].join('. '),
      hint: `Each contributes one third: run ${CARDIO_MINUTES_GOAL} minutes, a strength workout or finished programme log, and a morning weigh-in. Stairs cannot prove Zone 2+ time and do not complete cardio. Opens the gym log for the selected day.`,
      done: gymDoneCount === gymParts.length,
      progress: gymProgress,
      route: '/gym',
    },
    {
      label: 'Water',
      icon: 'water',
      caption: water === null ? '--' : `${water.toFixed(1)} L`,
      accessibilityLabel:
        water === null
          ? 'Water unavailable'
          : `Water ${water.toFixed(1)} liters recorded`,
      // ponytail: no hydration target exists, so the tile reports without completing.
      hint: 'Recorded in Apple Health. No hydration goal is set.',
      done: null,
      progress: null,
      route: '/water',
    },
    {
      label: 'Reading',
      icon: 'reading',
      caption: 'Apple Books',
      accessibilityLabel: 'Reading, opens Apple Books',
      hint: 'Reading progress is not shared with this app.',
      done: null,
      progress: null,
      status: 'Not tracked',
      url: Platform.select({
        ios: 'ibooks://',
        default: 'https://books.apple.com/',
      }),
    },
    {
      label: 'Praying',
      icon: 'praying',
      caption: 'Athan',
      accessibilityLabel: 'Praying, opens Athan prayer times',
      hint: 'Prayer progress is not shared with this app.',
      done: null,
      progress: null,
      status: 'Not tracked',
      url: 'https://ragmha.github.io/athan-pwa/',
    },
    {
      label: 'Journal',
      icon: 'journal',
      caption: 'Bear',
      accessibilityLabel: 'Journal, opens Bear',
      hint: 'Opens Today in Bear. Journal progress is not shared with this app.',
      done: null,
      progress: null,
      status: 'Not tracked',
      url: 'bear://x-callback-url/today',
    },
    {
      label: 'Speaking',
      icon: 'speaking',
      caption: 'Not set up',
      accessibilityLabel: 'Speaking, coming soon',
      hint: 'Speaking tracking is not built yet.',
      done: null,
      progress: null,
      status: 'Coming soon',
    },
    {
      label: 'All metrics',
      icon: 'metrics',
      caption: 'Health readings',
      accessibilityLabel: 'See all metrics',
      hint: 'Opens all health measurements for the selected day.',
      done: null,
      progress: null,
      status: 'Health readings',
      route: '/fitness-metrics',
    },
  ]
}

export function GoalSummary({
  snapshot,
  date,
  refreshing,
  onRefresh,
  onSettingsPress,
}: {
  snapshot: DailyHealthSnapshot | null
  date: Date
  refreshing: boolean
  onRefresh: () => void
  onSettingsPress: () => void
}) {
  const theme = useTheme()
  const liftLogged = useLiftLogged(date)
  const goals = buildTiles(snapshot, date, liftLogged).filter(
    (tile) => tile.done !== null,
  )
  const doneCount = goals.filter((tile) => tile.done).length
  const mono = [styles.mono, { color: theme.subtitleText }]

  return (
    <View style={styles.summary}>
      <Text
        style={[mono, styles.summaryDate]}
        accessibilityRole="header"
        accessibilityLabel={date.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
      >
        {date.toLocaleDateString('en-US', { weekday: 'short' })}{' '}
        {date.getDate()}
      </Text>
      <Pressable
        testID="home-refresh"
        onPress={onRefresh}
        disabled={refreshing}
        accessibilityRole="button"
        accessibilityLabel={`Refresh health data, ${doneCount} of ${goals.length} goals met`}
        accessibilityState={{ busy: refreshing, disabled: refreshing }}
        style={({ pressed }) => [
          styles.pageButton,
          { opacity: pressed || refreshing ? 0.6 : 1 },
        ]}
      >
        <DotRing
          done={doneCount}
          total={goals.length}
          color={theme.goalComplete}
          track={theme.goalTrack}
        />
      </Pressable>
      <View style={styles.summaryActions}>
        <Pressable
          onPress={onSettingsPress}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          style={({ pressed }) => [
            styles.pageButton,
            { opacity: pressed ? 0.65 : 1 },
          ]}
        >
          <Ionicons name="settings-outline" size={22} color={theme.text} />
        </Pressable>
      </View>
    </View>
  )
}

/** The square goal tile: progress fill, outline and mascot. */
export function GoalTileSurface({
  id,
  icon,
  size,
  progress,
  done,
}: {
  id: string
  icon: GoalMascotKind | 'metrics'
  size: number
  progress: number | null
  done: boolean | null
}) {
  const theme = useTheme()
  const reducedMotion = useReducedMotion()
  const complete = done === true
  const mood: GoalMascotMood =
    progress === null ? 'neutral' : complete ? 'happy' : 'sad'
  const fillStyle: CSSStyle<ViewStyle> = {
    height: `${(progress ?? 0) * 100}%`,
    backgroundColor: complete ? theme.goalComplete : theme.goalFill,
    transitionProperty: reducedMotion ? 'none' : ['height', 'backgroundColor'],
    transitionDuration: 200,
    transitionTimingFunction: 'linear',
  }
  return (
    <View
      testID={`goal-surface-${id}`}
      accessible={false}
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          backgroundColor: complete ? theme.goalComplete : theme.homeBackground,
        },
      ]}
    >
      {progress !== null && (
        <Animated.View
          testID={`goal-fill-${id}`}
          style={[styles.fill, fillStyle]}
        />
      )}
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        style={StyleSheet.absoluteFill}
        focusable={false}
      >
        <Rect
          testID={`goal-outline-${id}`}
          x={3}
          y={3}
          width={94}
          height={94}
          rx={20}
          fill="none"
          stroke={complete ? theme.goalComplete : theme.goalTrack}
          strokeWidth={6}
        />
      </Svg>
      {icon === 'metrics' ? (
        <Ionicons
          name="stats-chart-outline"
          size={size * 0.44}
          color={theme.text}
        />
      ) : (
        <GoalMascot
          kind={icon}
          mood={mood}
          color={complete ? theme.goalOnComplete : theme.text}
        />
      )}
    </View>
  )
}

export interface GoalGridHandle {
  showPage: (index: number) => void
}

export function GoalGrid({
  snapshot,
  date,
  ref,
  onPageChange,
}: {
  snapshot: DailyHealthSnapshot | null
  date: Date
  ref?: Ref<GoalGridHandle>
  onPageChange?: (pagination: { index: number; count: number }) => void
}) {
  const theme = useTheme()
  const router = useRouter()
  const reducedMotion = useReducedMotion()
  const liftLogged = useLiftLogged(date)
  const tiles = buildTiles(snapshot, date, liftLogged)
  const mono = [styles.mono, { color: theme.subtitleText }]
  const { fontScale } = useWindowDimensions()
  const [layout, setLayout] = useState({ width: 0, height: 0 })
  const [page, setPage] = useState(0)
  const pager = useRef<ScrollView>(null)
  const pageCount = Math.ceil(tiles.length / 6)
  const tileSize = Math.max(
    0,
    Math.min(
      (layout.width - Layout.gutter * 2) / 2 - Spacing.xs * 2,
      layout.height / 3 -
        (styles.label.lineHeight + styles.mono.lineHeight) * fontScale -
        Spacing.xs * 2 -
        Spacing.xxs * 2,
    ),
  )

  useEffect(() => {
    onPageChange?.({ index: page, count: pageCount })
  }, [page, pageCount, onPageChange])

  useImperativeHandle(
    ref,
    () => ({
      showPage: (index: number) => {
        setPage(index)
        pager.current?.scrollTo({
          x: layout.width * index,
          animated: !reducedMotion,
        })
      },
    }),
    [layout.width, reducedMotion],
  )

  return (
    <View style={styles.container}>
      <View
        testID="goal-viewport"
        style={styles.viewport}
        onLayout={({ nativeEvent }) => {
          const { width, height } = nativeEvent.layout
          if (width !== layout.width) {
            setPage(0)
            pager.current?.scrollTo({ x: 0, animated: false })
          }
          setLayout({ width, height })
        }}
      >
        <ScrollView
          ref={pager}
          testID="goal-pages"
          horizontal
          pagingEnabled
          bounces={false}
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
          scrollEventThrottle={16}
          onScroll={({ nativeEvent }) => {
            if (layout.width > 0) {
              setPage(
                Math.max(
                  0,
                  Math.min(
                    pageCount - 1,
                    Math.round(nativeEvent.contentOffset.x / layout.width),
                  ),
                ),
              )
            }
          }}
        >
          {Array.from({ length: pageCount }, (_, pageIndex) => (
            <View
              key={pageIndex}
              testID={`goal-page-${pageIndex + 1}`}
              style={[styles.grid, layout]}
              accessibilityElementsHidden={pageIndex !== page}
              importantForAccessibility={
                pageIndex === page ? 'auto' : 'no-hide-descendants'
              }
              aria-hidden={pageIndex !== page}
            >
              {tiles.slice(pageIndex * 6, (pageIndex + 1) * 6).map((tile) => {
                const tileID = tile.label.toLowerCase()
                const percent =
                  tile.progress === null
                    ? null
                    : Math.floor(tile.progress * 100)
                return (
                  <Pressable
                    key={tile.label}
                    testID={`goal-tile-${tileID}`}
                    style={({ pressed }) => [
                      styles.cell,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                    accessibilityRole={tile.url ? 'link' : 'button'}
                    accessibilityLabel={tile.accessibilityLabel}
                    accessibilityHint={tile.hint}
                    accessibilityValue={{
                      text:
                        tile.status ??
                        (tile.done === null
                          ? 'No goal'
                          : percent === null
                            ? 'Goal progress unavailable'
                            : `${tile.done ? 'Goal met' : 'Goal not met'} (${percent}%)`),
                    }}
                    disabled={!tile.url && !tile.route}
                    tabIndex={pageIndex === page ? 0 : -1}
                    accessibilityState={{ disabled: !tile.url && !tile.route }}
                    onPress={() => {
                      if (tile.url) {
                        Linking.openURL(tile.url).catch(() => {
                          Alert.alert(
                            `Couldn't open ${tile.caption}`,
                            'Check that the app is installed or the link is available, then try again.',
                          )
                        })
                      } else if (tile.route) {
                        router.push({
                          pathname: tile.route,
                          params: { date: localDateKey(date) },
                        })
                      }
                    }}
                  >
                    <GoalTileSurface
                      id={tileID}
                      icon={tile.icon}
                      size={tileSize}
                      progress={tile.progress}
                      done={tile.done}
                    />
                    <Text
                      numberOfLines={1}
                      style={[styles.label, { color: theme.text }]}
                    >
                      {tile.label}
                    </Text>
                    <Text
                      selectable
                      numberOfLines={1}
                      style={[
                        mono,
                        styles.caption,
                        tile.progress !== null &&
                          tile.progress > 0 && {
                            color: theme.goalProgressText,
                          },
                      ]}
                    >
                      {tile.caption}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
  },
  viewport: {
    flex: 1,
    overflow: 'hidden',
  },
  pageButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: {
    paddingHorizontal: Layout.gutter,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryDate: {
    flex: 1,
  },
  summaryActions: {
    flex: 1,
    alignItems: 'flex-end',
  },
  mono: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontVariant: ['tabular-nums'],
  },
  grid: {
    paddingHorizontal: Layout.gutter,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '50%',
    height: '33.333333%',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
  },
  tile: {
    aspectRatio: 1,
    borderRadius: '23%',
    borderCurve: 'continuous',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  fill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  caption: {
    width: '100%',
    textAlign: 'center',
  },
  label: {
    fontFamily: 'SpaceMono',
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
})
