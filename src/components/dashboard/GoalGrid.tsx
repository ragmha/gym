import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
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
import { GestureDetector } from 'react-native-gesture-handler'
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
import {
  sortByOrder,
  useTileReorder,
} from '@/components/dashboard/useTileReorder'
import { Layout, Spacing } from '@/constants/DesignSystem'
import type { DeepWork } from '@/hooks/useDeepWork'
import type { ReadingTimer } from '@/hooks/useReadingTimer'
import { useTheme } from '@/hooks/useThemeColor'
import {
  CARDIO_MINUTES_GOAL,
  DAILY_STEP_GOAL,
  longestWorkout,
  summarizeMorningWeights,
} from '@/lib/dailyGoals'
import { formatRemaining } from '@/lib/deepWork'
import { presentSteps } from '@/lib/fitnessMetrics/presenter'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'
import { useGymLogStore } from '@/stores/GymLogStore'
import { useThemeStore } from '@/stores/ThemeStore'

const EDGE_FLIP = 32
const FLIP_COOLDOWN_MS = 800

type Route = '/steps' | '/water' | '/gym' | '/achievements' | '/speaking'

interface Tile {
  label: string
  icon: GoalMascotKind | 'trophy'
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
  /** App name for link errors when the caption shows something else. */
  app?: string
  /** Runs before the url or route opens. */
  onPress?: () => boolean | void
  badge?: Badge
}

type Badge = 'play' | 'pause' | 'stop'

const BADGE_ICONS = {
  play: 'play-circle-outline',
  pause: 'pause-circle-outline',
  stop: 'stop-circle-outline',
} as const

function deepWorkTile({
  session,
  island,
  start,
  pause,
  resume,
  end,
}: DeepWork): Tile {
  const tile = {
    label: 'Deep Work',
    icon: 'focus',
    done: null,
    progress: null,
  } as const
  if (!session) {
    return {
      ...tile,
      caption: '25 / 5 min',
      accessibilityLabel: 'Deep work, starts a 25 minute focus block',
      hint: `Then alternates 5 minute breaks with 25 minute focus blocks${island ? ', shown in the Dynamic Island' : ''}. Sessions are not saved.`,
      status: 'Not started',
      onPress: start,
      badge: 'play',
    }
  }
  const block = session.phase === 'focus' ? 'Focus' : 'Break'
  if (session.endsAt === null) {
    const left = formatRemaining(session.remainingMs)
    const ask = () =>
      // react-native-web's Alert has no buttons.
      Platform.OS === 'web'
        ? window.confirm('End this deep work session? Cancel resumes it.')
          ? end()
          : resume()
        : Alert.alert('Deep work paused', `${block}, ${left} left.`, [
            { text: 'End session', style: 'destructive', onPress: end },
            { text: 'Resume', style: 'cancel', onPress: resume },
          ])
    return {
      ...tile,
      caption: `${left} paused`,
      accessibilityLabel: `Deep work, ${block.toLowerCase()} paused, ${left} left`,
      hint: 'Resumes or ends the session.',
      status: 'Paused',
      onPress: ask,
      badge: 'play',
    }
  }
  const until = new Date(session.endsAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
  return {
    ...tile,
    // ponytail: block end time, not a ticking clock; the island counts down.
    caption: `${block} until ${until}`,
    accessibilityLabel: `Deep work, ${block.toLowerCase()} until ${until}`,
    hint: 'Pauses the timer.',
    status: session.phase === 'focus' ? 'Focusing' : 'On break',
    onPress: pause,
    badge: 'pause',
  }
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
  reading: ReadingTimer | null,
  deepWork: DeepWork | null = null,
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
    reading?.running
      ? {
          label: 'Reading',
          icon: 'reading',
          caption: 'Tap to stop',
          accessibilityLabel: 'Reading, stops the reading timer',
          hint: 'Ends the Live Activity. Reading minutes are not saved.',
          done: null,
          progress: null,
          status: 'Timer running',
          onPress: reading.stop,
          badge: 'stop',
        }
      : {
          label: 'Reading',
          icon: 'reading',
          caption:
            reading?.last?.day === localDateKey(date)
              ? `Read ${reading.last.minutes} min`
              : 'Apple Books',
          accessibilityLabel: reading
            ? 'Reading, starts a reading timer and opens Apple Books'
            : 'Reading, opens Apple Books',
          hint: reading
            ? 'Shows the timer in the Dynamic Island. Reading minutes are not saved.'
            : 'Reading progress is not shared with this app.',
          done: null,
          progress: null,
          status:
            reading?.last?.day === localDateKey(date)
              ? `Read ${reading.last.minutes} min`
              : 'Not tracked',
          url: Platform.select({
            ios: 'ibooks://',
            default: 'https://books.apple.com/',
          }),
          app: 'Apple Books',
          onPress: reading?.start,
          badge: reading ? 'play' : undefined,
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
      caption: 'Practice',
      accessibilityLabel: 'Speaking practice',
      hint: 'Opens speaking practice. Reps are not tracked as a goal.',
      done: null,
      progress: null,
      status: 'Not tracked',
      route: '/speaking',
    },
    {
      label: 'Achievements',
      icon: 'trophy',
      caption: 'Badges & records',
      accessibilityLabel: 'See achievements',
      hint: 'Opens badges and personal records from the past year.',
      done: null,
      progress: null,
      status: 'Badges & records',
      route: '/achievements',
    },
    ...(deepWork ? [deepWorkTile(deepWork)] : []),
  ]
}

export function summarizeHomeGoals(
  snapshot: DailyHealthSnapshot | null,
  date: Date,
  liftLogged: boolean,
) {
  const goals = buildTiles(snapshot, date, liftLogged, null).filter(
    (tile) => tile.done !== null,
  )
  return {
    done: goals.filter((tile) => tile.done).length,
    total: goals.length,
    progress: goals.every((tile) => tile.progress === null)
      ? null
      : goals.reduce((sum, tile) => sum + (tile.progress ?? 0), 0) /
        goals.length,
  }
}

export function GoalSummary({
  snapshot,
  date,
  refreshing,
  onRefresh,
  onSettingsPress,
  editing = false,
  onDone,
}: {
  snapshot: DailyHealthSnapshot | null
  date: Date
  refreshing: boolean
  onRefresh: () => void
  onSettingsPress: () => void
  editing?: boolean
  onDone?: () => void
}) {
  const theme = useTheme()
  const liftLogged = useLiftLogged(date)
  const goals = buildTiles(snapshot, date, liftLogged, null).filter(
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
        {editing ? (
          <DoneButton onPress={onDone} />
        ) : (
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
        )}
      </View>
    </View>
  )
}

/** Leaves tile edit mode. */
export function DoneButton({ onPress }: { onPress?: () => void }) {
  const theme = useTheme()
  return (
    <Pressable
      testID="tiles-done"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint="Stops rearranging tiles"
      style={({ pressed }) => [
        styles.doneButton,
        { opacity: pressed ? 0.65 : 1 },
      ]}
    >
      <Text style={[styles.label, { color: theme.text }]}>Done</Text>
    </Pressable>
  )
}

/** The square goal tile: progress fill, outline and mascot. */
export function GoalTileSurface({
  id,
  icon,
  size,
  progress,
  done,
  badge,
}: {
  id: string
  icon: GoalMascotKind | 'trophy'
  size: number
  progress: number | null
  done: boolean | null
  badge?: Badge
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
      {icon === 'trophy' ? (
        <Ionicons name="trophy-outline" size={size * 0.44} color={theme.text} />
      ) : (
        <GoalMascot
          kind={icon}
          mood={mood}
          color={complete ? theme.goalOnComplete : theme.text}
        />
      )}
      {badge && (
        <Ionicons
          testID={`goal-badge-${id}-${badge}`}
          name={BADGE_ICONS[badge]}
          size={size * 0.2}
          color={theme.text}
          style={[styles.badge, { top: size * 0.1, right: size * 0.1 }]}
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
  reading = null,
  deepWork = null,
  ref,
  onPageChange,
  editing = false,
  onEdit = () => {},
  leadingPage,
}: {
  snapshot: DailyHealthSnapshot | null
  date: Date
  reading?: ReadingTimer | null
  deepWork?: DeepWork | null
  ref?: Ref<GoalGridHandle>
  onPageChange?: (pagination: { index: number; count: number }) => void
  /** iPhone-style edit mode: tiles wiggle and taps don't open them. */
  editing?: boolean
  onEdit?: () => void
  leadingPage?: (active: boolean) => ReactNode
}) {
  const theme = useTheme()
  const router = useRouter()
  const reducedMotion = useReducedMotion()
  const liftLogged = useLiftLogged(date)
  const tileOrder = useThemeStore((s) => s.tileOrder)
  const setTileOrder = useThemeStore((s) => s.setTileOrder)
  const tiles = sortByOrder(
    buildTiles(snapshot, date, liftLogged, reading, deepWork),
    tileOrder,
    (tile) => tile.label,
  )
  const flippedAt = useRef(0)
  const mono = [styles.mono, { color: theme.subtitleText }]
  const { fontScale } = useWindowDimensions()
  const [layout, setLayout] = useState({ width: 0, height: 0 })
  const [page, setPage] = useState(0)
  const pager = useRef<ScrollView>(null)
  const tilePageCount = Math.ceil(tiles.length / 6)
  const offset = leadingPage ? 1 : 0
  const pageCount = tilePageCount + offset
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
  const { drag, preview, ghostStyle, gesture, moveActions, wiggle } =
    useTileReorder({
      items: tiles,
      keyOf: (tile) => tile.label,
      save: setTileOrder,
      tileSize,
      editing,
      onEdit,
    })

  useEffect(() => {
    onPageChange?.({ index: page, count: pageCount })
  }, [page, pageCount, onPageChange])

  const showPage = (index: number) => {
    if (index < 0 || index >= pageCount) return
    setPage(index)
    pager.current?.scrollTo({
      x: layout.width * index,
      animated: !reducedMotion,
    })
  }

  useImperativeHandle(ref, () => ({ showPage }))

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
      Math.min(tilePageCount - 1, Math.floor(contentX / layout.width)),
    )
    const col = contentX - target * layout.width < layout.width / 2 ? 0 : 1
    const row = Math.max(0, Math.min(2, Math.floor(y / (layout.height / 3))))
    return target * 6 + row * 2 + col
  }

  // ponytail: one long-press pan per page, hit-tested against the fixed 2x3 grid.
  const dragGesture = (pageIndex: number) =>
    gesture(
      `goal-drag-${pageIndex + 1}`,
      (e) => slotAt(pageIndex, e.x, e.y),
      (x) => {
        const step = x < EDGE_FLIP ? -1 : x > layout.width - EDGE_FLIP ? 1 : 0
        const now = Date.now()
        if (
          step !== 0 &&
          page + step >= offset &&
          page + step < pageCount &&
          now - flippedAt.current > FLIP_COOLDOWN_MS
        ) {
          flippedAt.current = now
          showPage(page + step)
        }
      },
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
          {leadingPage && (
            <View
              testID="today-page"
              style={layout}
              accessibilityElementsHidden={page !== 0}
              importantForAccessibility={
                page === 0 ? 'auto' : 'no-hide-descendants'
              }
              aria-hidden={page !== 0}
            >
              {leadingPage(page === 0)}
            </View>
          )}
          {Array.from({ length: tilePageCount }, (_, pageIndex) => (
            <GestureDetector key={pageIndex} gesture={dragGesture(pageIndex)}>
              <View
                testID={`goal-page-${pageIndex + 1}`}
                style={[styles.grid, layout]}
                accessibilityElementsHidden={pageIndex + offset !== page}
                importantForAccessibility={
                  pageIndex + offset === page ? 'auto' : 'no-hide-descendants'
                }
                aria-hidden={pageIndex + offset !== page}
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
                        {...moveActions(index, tile.label, (to) => {
                          if (Math.floor(to / 6) + offset !== page) {
                            showPage(Math.floor(to / 6) + offset)
                          }
                        })}
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
                        disabled={!tile.url && !tile.route && !tile.onPress}
                        tabIndex={pageIndex + offset === page ? 0 : -1}
                        accessibilityState={{
                          disabled: !tile.url && !tile.route && !tile.onPress,
                        }}
                        onPress={() => {
                          if (editing) return
                          const startResult = tile.onPress?.()
                          const openUrl = () => {
                            if (!tile.url) return
                            Linking.openURL(tile.url).catch(() => {
                              Alert.alert(
                                `Couldn't open ${tile.app ?? tile.caption}`,
                                'Check that the app is installed or the link is available, then try again.',
                              )
                            })
                          }

                          if (tile.url && startResult !== false) {
                            openUrl()
                          } else if (tile.route) {
                            router.push({
                              pathname: tile.route,
                              params: { date: localDateKey(date) },
                            })
                          }
                        }}
                      >
                        <Animated.View style={wiggle(index)}>
                          <GoalTileSurface
                            id={tileID}
                            icon={tile.icon}
                            size={tileSize}
                            progress={tile.progress}
                            done={tile.done}
                            badge={tile.badge}
                          />
                        </Animated.View>
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
              badge={tiles[drag.from].badge}
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
  doneButton: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: Spacing.xs,
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
  badge: {
    position: 'absolute',
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
