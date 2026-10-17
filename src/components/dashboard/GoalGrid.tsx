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
  AccessibilityInfo,
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
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
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
import { useThemeStore } from '@/stores/ThemeStore'

const EDGE_FLIP = 32
const FLIP_COOLDOWN_MS = 800

function moveTile<T>(items: T[], from: number, to: number): T[] {
  const next = [...items]
  next.splice(to, 0, ...next.splice(from, 1))
  return next
}

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
  const tileOrder = useThemeStore((s) => s.tileOrder)
  const setTileOrder = useThemeStore((s) => s.setTileOrder)
  const rank = (label: string) => {
    const index = tileOrder.indexOf(label)
    return index === -1 ? tileOrder.length : index
  }
  const tiles = buildTiles(snapshot, date, liftLogged).sort(
    (a, b) => rank(a.label) - rank(b.label),
  )
  const [drag, setDrag] = useState<{ from: number; over: number } | null>(null)
  const preview = drag ? moveTile(tiles, drag.from, drag.over) : tiles
  const dragRef = useRef<{
    from: number | null
    x: number
    y: number
    flippedAt: number
  }>({ from: null, x: 0, y: 0, flippedAt: 0 })
  const ghostX = useSharedValue(0)
  const ghostY = useSharedValue(0)
  const ghostStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: ghostX.value },
      { translateY: ghostY.value },
      { scale: 1.1 },
    ],
  }))
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

  const showPage = (index: number) => {
    setPage(index)
    pager.current?.scrollTo({
      x: layout.width * index,
      animated: !reducedMotion,
    })
  }

  useImperativeHandle(ref, () => ({ showPage }))

  const moveTo = (from: number, to: number) =>
    setTileOrder(moveTile(tiles, from, to).map((tile) => tile.label))

  // Preview by transform so the touched tile's view is never re-parented mid-drag.
  const shift = (from: number, to: number) => [
    {
      translateX:
        (Math.floor(to / 6) - Math.floor(from / 6)) * layout.width +
        ((to % 2) - (from % 2)) * ((layout.width - Layout.gutter * 2) / 2),
    },
    {
      translateY:
        (Math.floor((to % 6) / 2) - Math.floor((from % 6) / 2)) *
        (layout.height / 3),
    },
  ]

  /** Slot under a point on a page; can pass the last tile on a partial page. */
  const slotAt = (pageIndex: number, x: number, y: number) => {
    const contentX = pageIndex * layout.width + x
    const target = Math.max(
      0,
      Math.min(pageCount - 1, Math.floor(contentX / layout.width)),
    )
    const col = contentX - target * layout.width < layout.width / 2 ? 0 : 1
    const row = Math.max(0, Math.min(2, Math.floor(y / (layout.height / 3))))
    return target * 6 + row * 2 + col
  }

  // ponytail: one long-press pan per page, hit-tested against the fixed 2x3 grid.
  const dragGesture = (pageIndex: number) =>
    Gesture.Pan()
      .withTestId(`goal-drag-${pageIndex + 1}`)
      .activateAfterLongPress(400)
      .runOnJS(true)
      .onStart((e) => {
        const from = slotAt(pageIndex, e.x, e.y)
        if (from >= tiles.length) return
        dragRef.current = {
          from,
          x: e.absoluteX - e.x,
          y: e.absoluteY - e.y,
          flippedAt: 0,
        }
        ghostX.value = e.x - tileSize / 2
        ghostY.value = e.y - tileSize / 2
        setDrag({ from, over: from })
      })
      .onUpdate((e) => {
        const active = dragRef.current
        if (active.from === null) return
        const x = e.absoluteX - active.x
        ghostX.value = x - tileSize / 2
        ghostY.value = e.absoluteY - active.y - tileSize / 2
        const over = Math.min(tiles.length - 1, slotAt(pageIndex, e.x, e.y))
        setDrag((d) => (d && d.over !== over ? { ...d, over } : d))
        const step = x < EDGE_FLIP ? -1 : x > layout.width - EDGE_FLIP ? 1 : 0
        const now = Date.now()
        if (
          step !== 0 &&
          page + step >= 0 &&
          page + step < pageCount &&
          now - active.flippedAt > FLIP_COOLDOWN_MS
        ) {
          active.flippedAt = now
          showPage(page + step)
        }
      })
      .onEnd((e) => {
        const { from } = dragRef.current
        if (from === null) return
        moveTo(from, Math.min(tiles.length - 1, slotAt(pageIndex, e.x, e.y)))
      })
      .onFinalize(() => {
        dragRef.current.from = null
        setDrag(null)
      })

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
          scrollEnabled={!drag}
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
            <GestureDetector key={pageIndex} gesture={dragGesture(pageIndex)}>
              <View
                testID={`goal-page-${pageIndex + 1}`}
                style={[styles.grid, layout]}
                accessibilityElementsHidden={pageIndex !== page}
                importantForAccessibility={
                  pageIndex === page ? 'auto' : 'no-hide-descendants'
                }
                aria-hidden={pageIndex !== page}
              >
                {tiles
                  .slice(pageIndex * 6, (pageIndex + 1) * 6)
                  .map((tile, slot) => {
                    const index = pageIndex * 6 + slot
                    const at = preview.indexOf(tile)
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
                          {
                            opacity:
                              drag?.from === index ? 0 : pressed ? 0.7 : 1,
                          },
                          at !== index && { transform: shift(index, at) },
                        ]}
                        accessibilityActions={[
                          ...(index > 0
                            ? [{ name: 'moveEarlier', label: 'Move earlier' }]
                            : []),
                          ...(index < tiles.length - 1
                            ? [{ name: 'moveLater', label: 'Move later' }]
                            : []),
                        ]}
                        onAccessibilityAction={({ nativeEvent }) => {
                          const to =
                            index +
                            (nativeEvent.actionName === 'moveLater' ? 1 : -1)
                          moveTo(index, to)
                          if (Math.floor(to / 6) !== page) {
                            showPage(Math.floor(to / 6))
                          }
                          AccessibilityInfo.announceForAccessibility(
                            `${tile.label} moved to position ${to + 1} of ${tiles.length}`,
                          )
                        }}
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
                        accessibilityState={{
                          disabled: !tile.url && !tile.route,
                        }}
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
            </GestureDetector>
          ))}
        </ScrollView>
        {drag && (
          <Animated.View
            testID="goal-drag-ghost"
            style={[styles.ghost, ghostStyle]}
          >
            <GoalTileSurface
              id="dragging"
              icon={tiles[drag.from].icon}
              size={tileSize}
              progress={tiles[drag.from].progress}
              done={tiles[drag.from].done}
            />
          </Animated.View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  ghost: {
    position: 'absolute',
    left: 0,
    top: 0,
    pointerEvents: 'none',
  },
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
