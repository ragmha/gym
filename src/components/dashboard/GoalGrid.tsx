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
  type CSSAnimationKeyframes,
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
import { Layout, Radii, Spacing } from '@/constants/DesignSystem'
import type { ReadingTimer } from '@/hooks/useReadingTimer'
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
import { PRAYERS } from '@/lib/prayer'
import { useGymLogStore } from '@/stores/GymLogStore'
import { usePrayerLogStore } from '@/stores/PrayerLogStore'
import { useThemeStore } from '@/stores/ThemeStore'

const EDGE_FLIP = 32
const FLIP_COOLDOWN_MS = 800
// iOS Home Screen: four icon columns (three larger ones when everything fits
// on one page).
const COLUMNS = 4
const ROOMY_COLUMNS = 3
const ICON_SIZE = 96
const SEGMENT_HEIGHT = 8
const SEGMENT_STAGGER_MS = 40
const LIGHT_UP = {
  from: { opacity: 0 },
  to: { opacity: 1 },
} satisfies CSSAnimationKeyframes

type Route = '/steps' | '/gym' | '/speaking' | '/prayer'

interface Tile {
  label: string
  icon: GoalMascotKind
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
  /** A running timer: the icon shows its caption instead of its name. */
  live?: true
}

type Badge = 'play' | 'stop'
type Segments = { total: number; lit: number }

const BADGE_ICONS = {
  play: 'play-circle-outline',
  stop: 'stop-circle-outline',
} as const

function useLiftLogged(date: Date): boolean {
  const key = localDateKey(date)
  return useGymLogStore((s) => Boolean(s.logs[key]?.finishedAt))
}

function usePrayedCount(date: Date): number {
  const key = localDateKey(date)
  return usePrayerLogStore((s) => s.prayed[key]?.length ?? 0)
}

function buildTiles(
  snapshot: DailyHealthSnapshot | null,
  date: Date,
  liftLogged: boolean,
  reading: ReadingTimer | null,
  prayed = 0,
): Tile[] {
  const steps = presentSteps(snapshot)
  const stepCount = snapshot?.steps ?? null
  const run = longestWorkout(snapshot, 'running')
  const stairs = longestWorkout(snapshot, 'stairClimber')
  const lift = longestWorkout(snapshot, 'strength')
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
      caption: gymProgress === null ? '--' : `${gymDoneCount}/3`,
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
          live: true,
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
      caption: `${prayed}/${PRAYERS.length} prayed`,
      accessibilityLabel: 'Praying, prayer times',
      hint: 'Opens prayer times and your on-device prayer checklist.',
      done: null,
      progress: null,
      status: `${prayed} of ${PRAYERS.length} prayers marked`,
      route: '/prayer',
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
  const mono = [styles.mono, { color: theme.text }]

  return (
    <View testID="home-header" style={styles.summary}>
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
      <View style={styles.summaryActions}>
        <Pressable
          testID="home-refresh"
          onPress={onRefresh}
          disabled={refreshing}
          accessibilityRole="button"
          accessibilityLabel={`Refresh health data, ${doneCount} of ${goals.length} goals met`}
          accessibilityState={{ busy: refreshing, disabled: refreshing }}
          style={({ pressed }) => [
            styles.pageButton,
            styles.headerButton,
            {
              borderColor: theme.border,
              opacity: pressed || refreshing ? 0.6 : 1,
            },
          ]}
        >
          <Ionicons name="refresh-outline" size={20} color={theme.icon} />
        </Pressable>
        {editing ? (
          <DoneButton onPress={onDone} />
        ) : (
          <Pressable
            onPress={onSettingsPress}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            style={({ pressed }) => [
              styles.pageButton,
              styles.headerButton,
              { borderColor: theme.border, opacity: pressed ? 0.65 : 1 },
            ]}
          >
            <Ionicons name="settings-outline" size={20} color={theme.icon} />
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
  pixel = false,
}: {
  id: string
  icon: GoalMascotKind
  size: number
  progress: number | null
  done: boolean | null
  badge?: Badge
  pixel?: boolean
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
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        pixel ? styles.pixelTile : styles.tile,
        {
          width: size,
          height: size,
          backgroundColor: complete
            ? theme.goalComplete
            : pixel
              ? theme.homeSurface
              : theme.homeBackground,
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
        {pixel ? (
          <Circle
            testID={`goal-outline-${id}`}
            cx={50}
            cy={50}
            r={47}
            fill="none"
            stroke={complete ? theme.goalComplete : theme.goalTrack}
            strokeWidth={2}
          />
        ) : (
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
        )}
      </Svg>
      <GoalMascot
        kind={icon}
        mood={mood}
        color={complete ? theme.goalOnComplete : theme.goalIcon}
        pixel={pixel}
      />
      {badge && (
        <Ionicons
          testID={`goal-badge-${id}-${badge}`}
          name={BADGE_ICONS[badge]}
          size={size * 0.2}
          color={complete ? theme.goalOnComplete : theme.goalIcon}
          style={[styles.badge, { top: size * 0.1, right: size * 0.1 }]}
        />
      )}
    </View>
  )
}

/** Segmented bar whose lit segments light up one by one when the count changes. */
export function GlyphBar({
  id,
  segments,
  done,
}: {
  id: string
  segments: Segments | null
  done: boolean | null
}) {
  const theme = useTheme()
  const reducedMotion = useReducedMotion()
  return (
    <View
      key={segments?.lit ?? 'unknown'}
      testID={`goal-bar-${id}`}
      style={styles.bar}
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {segments &&
        Array.from({ length: segments.total }, (_, i) => {
          const on = i < segments.lit
          const light: CSSStyle<ViewStyle> = {
            backgroundColor: done ? theme.goalComplete : theme.goalFill,
            animationName: reducedMotion ? 'none' : LIGHT_UP,
            animationDuration: 150,
            animationDelay: i * SEGMENT_STAGGER_MS,
            animationFillMode: 'backwards',
            animationIterationCount: 1,
            animationTimingFunction: 'ease-out',
          }
          return (
            <View
              key={i}
              testID={`goal-segment-${id}-${i}-${on ? 'on' : 'off'}`}
              style={[styles.segment, { backgroundColor: theme.goalTrack }]}
            >
              {on && (
                <Animated.View
                  testID={`goal-glyph-${id}-${i}`}
                  style={[styles.segmentLight, light]}
                />
              )}
            </View>
          )
        })}
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
  ref,
  onPageChange,
  editing = false,
  onEdit = () => {},
  leadingPage,
}: {
  snapshot: DailyHealthSnapshot | null
  date: Date
  reading?: ReadingTimer | null
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
  const prayed = usePrayedCount(date)
  const tileOrder = useThemeStore((s) => s.tileOrder)
  const setTileOrder = useThemeStore((s) => s.setTileOrder)
  const all = buildTiles(snapshot, date, liftLogged, reading, prayed)
  const tiles = sortByOrder(all, tileOrder, (tile) => tile.label)
  const flippedAt = useRef(0)
  const { fontScale } = useWindowDimensions()
  const [layout, setLayout] = useState({ width: 0, height: 0 })
  const [page, setPage] = useState(0)
  const pager = useRef<ScrollView>(null)
  const metrics = (columns: number) => {
    const colW = (layout.width - Layout.gutter * 2) / columns
    const iconSize = Math.max(0, Math.min(ICON_SIZE, colW - Spacing.xl))
    const minRowH =
      Spacing.xs +
      iconSize +
      Spacing.xxs +
      styles.name.lineHeight * fontScale +
      Spacing.sm
    const used = Math.ceil(tiles.length / columns)
    const onePage = layout.height > 0 && used * minRowH <= layout.height
    return { columns, colW, iconSize, minRowH, used, onePage }
  }
  const roomy = metrics(ROOMY_COLUMNS)
  const { columns, colW, iconSize, minRowH, used, onePage } = roomy.onePage
    ? roomy
    : metrics(COLUMNS)
  // Before layout, one page holds everything.
  const rows = Math.max(
    1,
    !layout.height || onePage ? used : Math.floor(layout.height / minRowH),
  )
  // Spread the rows down the whole page, as iOS does.
  const rowH = Math.max(minRowH, layout.height / rows)
  const pageSize = columns * rows
  const tilePageCount = Math.max(1, Math.ceil(tiles.length / pageSize))
  const offset = leadingPage ? 1 : 0
  const pageCount = tilePageCount + offset
  const { drag, preview, ghostStyle, gesture, moveActions, wiggle } =
    useTileReorder({
      items: tiles,
      keyOf: (tile) => tile.label,
      save: setTileOrder,
      tileSize: iconSize,
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

  /** Tile page and grid cell of icon `i`. */
  const place = (i: number) => {
    return { page: Math.floor(i / pageSize), cell: i % pageSize }
  }

  const point = (i: number) => {
    const { page: at, cell } = place(i)
    return {
      x: at * layout.width + (cell % columns) * colW,
      y: Math.floor(cell / columns) * rowH,
    }
  }

  // Preview by transform so the touched tile's view is never re-parented mid-drag.
  const shift = (from: number, to: number) => {
    const a = point(from)
    const b = point(to)
    return [{ translateX: b.x - a.x }, { translateY: b.y - a.y }]
  }

  /** Icon slot under a point on a page. */
  const slotAt = (pageIndex: number, x: number, y: number) => {
    const contentX = pageIndex * layout.width + x
    const target = Math.max(
      0,
      Math.min(tilePageCount - 1, Math.floor(contentX / layout.width)),
    )
    const col = Math.max(
      0,
      Math.min(
        columns - 1,
        Math.floor((contentX - target * layout.width - Layout.gutter) / colW),
      ),
    )
    const row = Math.max(0, Math.min(rows - 1, Math.floor(y / rowH)))
    return target * pageSize + row * columns + col
  }

  /** Accessibility and press handling shared by icon tiles. */
  const tileProps = (tile: Tile, pageIndex: number) => {
    const percent =
      tile.progress === null ? null : Math.floor(tile.progress * 100)
    const disabled = !tile.url && !tile.route && !tile.onPress
    return {
      testID: `goal-tile-${tile.label.toLowerCase()}`,
      accessibilityRole: tile.url ? ('link' as const) : ('button' as const),
      accessibilityLabel: tile.accessibilityLabel,
      accessibilityHint: tile.hint,
      accessibilityValue: {
        text:
          tile.status ??
          (tile.done === null
            ? 'No goal'
            : percent === null
              ? 'Goal progress unavailable'
              : `${tile.done ? 'Goal met' : 'Goal not met'} (${percent}%)`),
      },
      disabled,
      tabIndex: pageIndex + offset === page ? (0 as const) : (-1 as const),
      accessibilityState: { disabled },
      onPress: () => {
        if (editing) return
        const startResult = tile.onPress?.()
        if (tile.url && startResult !== false) {
          Linking.openURL(tile.url).catch(() => {
            Alert.alert(
              `Couldn't open ${tile.app ?? tile.caption}`,
              'Check that the app is installed or the link is available, then try again.',
            )
          })
        } else if (tile.route) {
          router.push({
            pathname: tile.route,
            params: { date: localDateKey(date) },
          })
        }
      },
    }
  }

  // ponytail: one long-press pan per page, hit-tested against the fixed grid.
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
                style={layout}
                accessibilityElementsHidden={pageIndex + offset !== page}
                importantForAccessibility={
                  pageIndex + offset === page ? 'auto' : 'no-hide-descendants'
                }
                aria-hidden={pageIndex + offset !== page}
              >
                {tiles.map((tile, index) => {
                  const { page: at, cell } = place(index)
                  if (at !== pageIndex) return null
                  const to = preview.indexOf(tile)
                  return (
                    <Pressable
                      key={tile.label}
                      {...tileProps(tile, pageIndex)}
                      style={({ pressed }) => [
                        styles.icon,
                        {
                          left: Layout.gutter + (cell % columns) * colW,
                          top: Math.floor(cell / columns) * rowH,
                          width: colW,
                          height: rowH,
                          opacity: drag?.from === index ? 0 : pressed ? 0.7 : 1,
                        },
                        to !== index && { transform: shift(index, to) },
                      ]}
                      {...moveActions(index, tile.label, (moved) => {
                        if (place(moved).page + offset !== page) {
                          showPage(place(moved).page + offset)
                        }
                      })}
                    >
                      <Animated.View style={wiggle(index)}>
                        <GoalTileSurface
                          id={tile.label.toLowerCase()}
                          icon={tile.icon}
                          size={iconSize}
                          progress={tile.progress}
                          done={tile.done}
                          badge={tile.badge}
                          pixel
                        />
                      </Animated.View>
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                        style={[
                          styles.name,
                          {
                            color: tile.live
                              ? theme.goalProgressText
                              : theme.text,
                          },
                        ]}
                      >
                        {tile.live ? tile.caption : tile.label}
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
              size={iconSize}
              progress={tiles[drag.from].progress}
              done={tiles[drag.from].done}
              badge={tiles[drag.from].badge}
              pixel
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
  pixelTile: {
    aspectRatio: 1,
    borderRadius: '50%',
    borderCurve: 'continuous',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
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
    width: Layout.controlSize,
    height: Layout.controlSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButton: {
    minWidth: Layout.controlSize,
    height: Layout.controlSize,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: {
    paddingHorizontal: Layout.gutter,
    minHeight: Layout.controlSize,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  summaryDate: {
    flex: 1,
  },
  summaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  headerButton: {
    borderWidth: 1,
    borderRadius: Radii.md,
  },
  mono: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontVariant: ['tabular-nums'],
  },
  icon: {
    position: 'absolute',
    alignItems: 'center',
    paddingTop: Spacing.xs,
    gap: Spacing.xxs,
  },
  name: {
    fontFamily: 'SpaceMono',
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.5,
    textAlign: 'center',
    textTransform: 'uppercase',
    fontVariant: ['tabular-nums'],
  },
  bar: {
    height: SEGMENT_HEIGHT,
    flexDirection: 'row',
    gap: 2,
  },
  segment: {
    flex: 1,
    overflow: 'hidden',
  },
  segmentLight: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
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
  label: {
    fontFamily: 'SpaceMono',
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
})
