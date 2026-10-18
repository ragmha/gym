import { memo, useMemo } from 'react'
import {
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native'
import Svg, { Line, Polyline, Rect } from 'react-native-svg'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Layout, Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import type {
  HealthWorkout,
  StairSessionHeartRate,
} from '@/lib/healthSnapshot/types'

import {
  HEART_RATE_ZONE_BOUNDS,
  heartRateZone,
  stairmasterHighlights,
  zoneMinutes,
  type ActivitySummary,
} from './activities'

const ZONE_COLORS = ['#5AB0F5', '#3CC48A', '#F2C230', '#F5893A', '#EE4D5F']
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function clock(minutes: number): string {
  const seconds = Math.round(minutes * 60)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function StairHighlights({
  workouts,
  demo,
}: {
  workouts: HealthWorkout[] | 'error' | undefined
  demo: boolean
}) {
  const theme = useTheme()
  const highlights = useMemo(
    () => (Array.isArray(workouts) ? stairmasterHighlights(workouts) : null),
    [workouts],
  )
  const detailStyle = [Typography.bodySm, { color: theme.subtitleText }]
  const titleStyle = [Typography.headingSm, { color: theme.text }]
  const dateLabel = (key: string) =>
    new Date(`${key}T12:00:00`).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  const { bestStreak, bestMonth, usualStart } = highlights ?? {}
  const startTime = (minute: number) => {
    const date = new Date(2000, 0, 1, 0, minute)
    return time(date.toISOString())
  }
  const monthLabel = (month: string) =>
    new Date(`${month}-01T12:00:00`).toLocaleDateString(undefined, {
      month: 'short',
      year: 'numeric',
    })
  const hours = Math.floor((highlights?.totalMinutes ?? 0) / 60)
  const minutes = Math.floor((highlights?.totalMinutes ?? 0) % 60)
  const peakStarts = Math.max(1, ...(highlights?.startCounts ?? []))
  const streakPeriod = bestStreak
    ? `${dateLabel(bestStreak.start)} – ${dateLabel(bestStreak.end)}`
    : 'No 30-minute session recorded yet.'
  const usualDetail = usualStart
    ? `${usualStart.sessions} of ${highlights?.sessions} starts · ${startTime(usualStart.minute)}–${startTime(usualStart.minute + 29)}${usualStart.tied ? ' (tied)' : ''}`
    : 'Not enough repeat starts yet.'

  return (
    <View testID="stair-highlights" style={styles.highlights}>
      <Text
        accessibilityRole="header"
        style={[Typography.headingMd, { color: theme.text }]}
      >
        Your highlights
      </Text>
      <Text style={detailStyle}>
        {demo ? 'Demo data' : 'Apple Health'} · All-time through today
      </Text>
      {!highlights?.sessions ? (
        <Text style={detailStyle} accessibilityLiveRegion="polite">
          {workouts === 'error'
            ? 'Could not load your history. Reopen this screen to retry.'
            : workouts === undefined
              ? 'Loading your history…'
              : 'No Stairmaster history available. Recorded sessions will build your highlights here.'}
        </Text>
      ) : (
        <>
          <View
            style={[
              styles.streakRecord,
              { backgroundColor: theme.cardSurface },
            ]}
            accessible
            accessibilityLabel={`Longest streak: ${bestStreak ? `${bestStreak.days} days` : '--'}. ${streakPeriod}`}
          >
            <View style={styles.recordNumber}>
              <Text style={[styles.recordValue, { color: theme.text }]}>
                {bestStreak?.days ?? '--'}
              </Text>
              <Text style={detailStyle}>
                {bestStreak?.days === 1 ? 'day' : 'days'} in a row
              </Text>
            </View>
            <View style={styles.recordDetail}>
              <Text style={titleStyle}>Longest streak</Text>
              <Text style={detailStyle}>{streakPeriod}</Text>
              <Text style={detailStyle}>30+ min each day</Text>
            </View>
          </View>
          <View style={[styles.totalRow, { borderColor: theme.goalTrack }]}>
            <View
              style={styles.total}
              accessible
              accessibilityLabel={`Total sessions: ${highlights.sessions}. ${hours}h ${minutes}m on the stairs.`}
            >
              <Text style={[styles.statValue, { color: theme.text }]}>
                {highlights.sessions}
              </Text>
              <Text style={detailStyle}>Total sessions</Text>
            </View>
            <View
              style={styles.total}
              accessible
              accessibilityLabel={`Total time: ${hours} hours, ${minutes} minutes`}
            >
              <Text style={[styles.statValue, { color: theme.text }]}>
                {hours}h {minutes}m
              </Text>
              <Text style={detailStyle}>Time on the stairs</Text>
            </View>
          </View>
          <View style={styles.highlightGrid}>
            <View style={styles.chartPanel}>
              <View
                accessible
                accessibilityLabel={`Best month: ${bestMonth ? monthLabel(bestMonth.month) : '--'}. ${bestMonth ? `${bestMonth.days} goal days` : 'No 30-minute session recorded yet.'}`}
              >
                <Text style={titleStyle}>Best month</Text>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {bestMonth ? monthLabel(bestMonth.month) : '--'}
                </Text>
                <Text style={detailStyle}>
                  {bestMonth
                    ? `${bestMonth.days} goal days · Personal best`
                    : 'No 30-minute session recorded yet.'}
                </Text>
              </View>
              <View
                testID="stair-monthly-chart"
                style={styles.monthBars}
                accessible
                accessibilityRole="image"
                accessibilityLabel={`Goal days per month, last 12 months, scale 0 to 31 days: ${highlights.monthlyGoalDays.map((m) => `${monthLabel(m.month)}: ${m.days}`).join(', ')}`}
              >
                {highlights.monthlyGoalDays.map((month) => (
                  <View key={month.month} style={styles.barColumn}>
                    <View
                      style={[
                        styles.monthBar,
                        {
                          height: (month.days / 31) * 88,
                          backgroundColor:
                            month.month === bestMonth?.month
                              ? theme.accent
                              : theme.subtitleText,
                        },
                      ]}
                    />
                  </View>
                ))}
              </View>
              <View style={styles.axis}>
                <Text style={detailStyle}>
                  {monthLabel(highlights.monthlyGoalDays[0].month)}
                </Text>
                <Text style={detailStyle}>
                  {monthLabel(highlights.monthlyGoalDays[11].month)}
                </Text>
              </View>
              <Text style={detailStyle}>Last 12 months · Goal days · 0–31</Text>
            </View>
            <View style={styles.chartPanel}>
              <View
                accessible
                accessibilityLabel={`Usual start: ${usualStart ? startTime(usualStart.minute) : '--'}. ${usualDetail}`}
              >
                <Text style={titleStyle}>Usual start</Text>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {usualStart ? startTime(usualStart.minute) : '--'}
                </Text>
                <Text style={detailStyle}>{usualDetail}</Text>
              </View>
              <View
                testID="stair-start-chart"
                style={styles.startBars}
                accessible
                accessibilityRole="image"
                accessibilityLabel={`All-time session starts in local half-hour windows: ${highlights.startCounts
                  .map((count, i) =>
                    count ? `${startTime(i * 30)}: ${count}` : '',
                  )
                  .filter(Boolean)
                  .join(', ')}`}
              >
                {highlights.startCounts.map((count, i) => (
                  <View key={i} style={styles.barColumn}>
                    <View
                      style={[
                        styles.startBar,
                        {
                          height: (count / peakStarts) * 88,
                          backgroundColor:
                            i * 30 === usualStart?.minute
                              ? theme.accent
                              : theme.subtitleText,
                        },
                      ]}
                    />
                  </View>
                ))}
              </View>
              <View style={styles.axis}>
                {[0, 6, 12, 18, 24].map((hour) => (
                  <Text key={hour} style={detailStyle}>
                    {hour}h
                  </Text>
                ))}
              </View>
              <Text style={detailStyle}>
                Session starts · Scale 0–{peakStarts}
              </Text>
            </View>
          </View>
          <Text style={detailStyle}>
            Streaks and best month count days with at least one 30-minute
            session. Rest days still matter.
          </Text>
        </>
      )}
    </View>
  )
}

/** Month grid pages from the first stair session (or `selected`) to this month, swiped horizontally. */
export function StairCalendar({
  selected,
  first,
  days,
  onSelect,
}: {
  selected: Date
  /** Earliest stair session in Health; null when there is none yet. */
  first: Date | null
  /** Stair summary per local date key; missing days have no session. */
  days: Map<string, ActivitySummary>
  onSelect: (key: string) => void
}) {
  const theme = useTheme()
  const { width: window } = useWindowDimensions()
  const width = window - Layout.gutter * 2
  // Floor so seven float-width cells never overflow the wrap row on device.
  const cell = Math.floor(width / 7)
  const today = new Date()
  const todayKey = localDateKey(today)
  const selectedKey = localDateKey(selected)
  const start = first && first < selected ? first : selected
  const startKey = `${start.getFullYear()}-${start.getMonth()}`
  const months = useMemo(
    () =>
      Array.from(
        {
          length:
            (today.getFullYear() - start.getFullYear()) * 12 +
            today.getMonth() -
            start.getMonth() +
            1,
        },
        (_, i) => new Date(start.getFullYear(), start.getMonth() + i, 1, 12),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- months move only when their ends do
    [startKey, todayKey],
  )
  const initial = months.findIndex(
    (m) =>
      m.getFullYear() === selected.getFullYear() &&
      m.getMonth() === selected.getMonth(),
  )
  const mono = [styles.mono, { color: theme.subtitleText }]

  return (
    <FlatList
      // Remount when history extends backwards so the initial page stays on `selected`.
      key={startKey}
      testID="stair-calendar"
      style={{ width, flexGrow: 0 }}
      data={months}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      initialScrollIndex={initial === -1 ? months.length - 1 : initial}
      getItemLayout={(_, index) => ({
        length: width,
        offset: width * index,
        index,
      })}
      keyExtractor={(m) => localDateKey(m)}
      renderItem={({ item: month }) => {
        const lead = month.getDay()
        const count = new Date(
          month.getFullYear(),
          month.getMonth() + 1,
          0,
        ).getDate()
        return (
          <View style={{ width, gap: Spacing.xs }}>
            <Text
              accessibilityRole="header"
              style={[Typography.headingSm, { color: theme.text }]}
            >
              {month.toLocaleDateString(undefined, {
                month: 'long',
                year: 'numeric',
              })}
            </Text>
            <View style={styles.row}>
              {WEEKDAYS.map((d, i) => (
                <Text
                  key={i}
                  style={[mono, styles.centerText, { width: cell }]}
                >
                  {d}
                </Text>
              ))}
            </View>
            <View style={[styles.row, styles.grid, { height: cell * 6 }]}>
              {Array.from({ length: lead }, (_, i) => (
                <View key={`lead-${i}`} style={{ width: cell }} />
              ))}
              {Array.from({ length: count }, (_, i) => {
                const day = new Date(
                  month.getFullYear(),
                  month.getMonth(),
                  i + 1,
                  12,
                )
                const key = localDateKey(day)
                const summary = days.get(key)
                const future = key > todayKey
                const isSelected = key === selectedKey
                return (
                  <Pressable
                    key={key}
                    testID={`stair-day-${key}`}
                    disabled={future}
                    onPress={() => onSelect(key)}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: isSelected,
                      disabled: future,
                    }}
                    accessibilityLabel={`${day.toLocaleDateString(undefined, {
                      month: 'long',
                      day: 'numeric',
                    })}, ${summary?.caption ?? 'no session'}`}
                    style={[styles.cell, { width: cell, height: cell }]}
                  >
                    <View
                      style={[
                        styles.ring,
                        isSelected && { borderColor: theme.accent },
                      ]}
                    >
                      <View
                        style={[
                          styles.day,
                          summary?.done && { backgroundColor: theme.text },
                          summary &&
                            !summary.done && {
                              borderWidth: 2,
                              borderColor: theme.text,
                            },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            {
                              color: summary?.done
                                ? theme.homeBackground
                                : future
                                  ? theme.disabled
                                  : theme.text,
                            },
                            key === todayKey && styles.today,
                          ]}
                        >
                          {i + 1}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                )
              })}
            </View>
          </View>
        )
      }}
    />
  )
}

/** In-depth view of one day's stair session: totals, heart-rate trace and time in zones. */
export function StairSession({
  data,
  label,
}: {
  /** null when the day has no session; 'error' when Health could not be read. */
  data: StairSessionHeartRate | null | 'error'
  /** Heading when the day has several sessions. */
  label?: string
}) {
  const theme = useTheme()
  const { width: window } = useWindowDimensions()
  const width = window - Layout.gutter * 2
  const mono = [styles.mono, { color: theme.subtitleText }]

  if (data === null || data === 'error') {
    return (
      <Text testID="stair-session-empty" style={mono}>
        {data === null
          ? 'No stair session this day'
          : 'Apple Health unavailable'}
      </Text>
    )
  }

  const { workout, samples, maxHeartRate } = data
  const bpms = samples.map((s) => s.bpm)
  const max = bpms.length ? Math.max(...bpms) : null
  const min = bpms.length ? Math.min(...bpms) : null
  const zones =
    maxHeartRate && bpms.length
      ? zoneMinutes(samples, workout.endISO, maxHeartRate)
      : null
  const mainZone = zones ? zones.indexOf(Math.max(...zones)) + 1 : null
  const stats = [
    { label: 'Duration', value: clock(workout.durationMinutes) },
    { label: 'Active kcal', value: workout.calories ?? '--' },
    { label: 'Avg BPM', value: workout.averageHeartRate ?? '--' },
    { label: 'Max BPM', value: max ?? '--' },
    { label: 'Min BPM', value: min ?? '--' },
    {
      label: 'Main zone',
      value: mainZone ? `Z${mainZone}` : '--',
    },
  ]

  return (
    <View testID="stair-session" style={[styles.session, { width }]}>
      {label && (
        <Text
          accessibilityRole="header"
          style={[Typography.headingSm, { color: theme.text }]}
        >
          {label}
        </Text>
      )}
      <Text style={mono}>
        {time(workout.startISO)} – {time(workout.endISO)} ·{' '}
        {workout.activityName}
      </Text>
      <View style={[styles.row, styles.grid]}>
        {stats.map((stat) => (
          <View
            key={stat.label}
            style={[styles.stat, { width: Math.floor(width / 3) }]}
            accessible
            accessibilityLabel={`${stat.label}: ${stat.value}`}
          >
            <Text style={[styles.statValue, { color: theme.text }]}>
              {stat.value}
            </Text>
            <Text style={mono}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {min !== null && max !== null && (
        <HeartRateChart
          data={data}
          width={width}
          min={min}
          max={max}
          track={theme.goalTrack}
        />
      )}
      {min !== null && (
        <View style={styles.axis}>
          <Text style={mono}>{time(workout.startISO)}</Text>
          <Text style={mono}>
            {min}–{max} BPM
          </Text>
          <Text style={mono}>{time(workout.endISO)}</Text>
        </View>
      )}

      <Text style={mono}>Heart rate zones</Text>
      {!zones || !maxHeartRate ? (
        <Text style={[Typography.bodySm, { color: theme.subtitleText }]}>
          {bpms.length
            ? 'Add your date of birth in Apple Health, or allow access in Settings, to see zones.'
            : 'No heart-rate samples for this session.'}
        </Text>
      ) : (
        [4, 3, 2, 1, 0].map((z) => {
          const total = zones.reduce((a, b) => a + b, 0) || 1
          const low =
            z === 0
              ? null
              : Math.round(HEART_RATE_ZONE_BOUNDS[z - 1] * maxHeartRate)
          const high =
            z === 4
              ? null
              : Math.round(HEART_RATE_ZONE_BOUNDS[z] * maxHeartRate) - 1
          return (
            <View
              key={z}
              style={styles.zoneRow}
              accessible
              accessibilityLabel={`Zone ${z + 1}: ${clock(zones[z])}`}
            >
              <Text style={[mono, styles.zoneLabel]}>Z{z + 1}</Text>
              <Text style={[mono, styles.zoneRange]}>
                {low === null
                  ? `<${high! + 1}`
                  : high === null
                    ? `${low}+`
                    : `${low}–${high}`}
              </Text>
              <View
                style={[styles.zoneTrack, { backgroundColor: theme.goalTrack }]}
              >
                <View
                  style={[
                    styles.zoneFill,
                    {
                      width: `${(zones[z] / total) * 100}%`,
                      backgroundColor: ZONE_COLORS[z],
                    },
                  ]}
                />
              </View>
              <Text style={[styles.zoneTime, { color: theme.text }]}>
                {clock(zones[z])}
              </Text>
            </View>
          )
        })
      )}
    </View>
  )
}

const HeartRateChart = memo(function HeartRateChart({
  data: { workout, samples, maxHeartRate },
  width,
  min,
  max,
  track,
}: {
  data: StairSessionHeartRate
  width: number
  min: number
  max: number
  track: string
}) {
  const height = 140
  const start = Date.parse(workout.startISO)
  const span = Math.max(Date.parse(workout.endISO) - start, 1)
  const lo = min - 5
  const hi = max + 5
  const y = (bpm: number) => height - ((bpm - lo) / (hi - lo)) * height
  const x = (iso: string) => ((Date.parse(iso) - start) / span) * width
  const bands = maxHeartRate
    ? [0, ...HEART_RATE_ZONE_BOUNDS, 2].map((b) => b * maxHeartRate)
    : null
  // One polyline per same-zone run keeps the SVG to a handful of nodes.
  const runs: { zone: number | null; points: string }[] = []
  samples.forEach((s, i) => {
    const zone = maxHeartRate ? heartRateZone(s.bpm, maxHeartRate) : null
    const point = `${x(s.startISO)},${y(s.bpm)}`
    const last = runs[runs.length - 1]
    if (last?.zone === zone) last.points += ` ${point}`
    else
      runs.push({
        zone,
        points: i
          ? `${x(samples[i - 1].startISO)},${y(samples[i - 1].bpm)} ${point}`
          : point,
      })
  })

  return (
    <Svg
      testID="stair-hr-chart"
      width={width}
      height={height}
      accessibilityLabel={`Heart rate from ${min} to ${max} BPM`}
    >
      {bands?.slice(0, 5).map((from, z) => {
        const top = y(Math.min(bands[z + 1], hi))
        const bottom = y(Math.max(from, lo))
        return bottom > top ? (
          <Rect
            key={z}
            x={0}
            y={top}
            width={width}
            height={bottom - top}
            fill={ZONE_COLORS[z]}
            opacity={0.12}
          />
        ) : null
      })}
      <Line x1={0} x2={width} y1={height} y2={height} stroke={track} />
      {runs.map((run, i) => (
        <Polyline
          key={i}
          points={run.points}
          fill="none"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          stroke={run.zone ? ZONE_COLORS[run.zone - 1] : track}
        />
      ))}
    </Svg>
  )
})

const styles = StyleSheet.create({
  highlights: {
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    gap: Spacing.sm,
  },
  streakRecord: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radii.lg,
    padding: Spacing.md,
  },
  recordNumber: { gap: Spacing.xxs },
  recordValue: {
    fontFamily: 'SpaceMono',
    fontSize: 56,
    lineHeight: 68,
    fontVariant: ['tabular-nums'],
  },
  recordDetail: { flexBasis: 140, flexGrow: 1, gap: Spacing.xxs },
  totalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  total: { flexGrow: 1, flexBasis: 120, gap: Spacing.xxs },
  highlightGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.lg },
  chartPanel: {
    flexBasis: 280,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '100%',
    gap: Spacing.xs,
  },
  monthBars: { height: 88, flexDirection: 'row', gap: Spacing.xs },
  startBars: { height: 88, flexDirection: 'row', gap: 2 },
  barColumn: { flex: 1, justifyContent: 'flex-end' },
  monthBar: { borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  startBar: { borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  row: { flexDirection: 'row' },
  grid: { flexWrap: 'wrap', alignContent: 'flex-start' },
  centerText: { textAlign: 'center' },
  mono: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  cell: { alignItems: 'center', justifyContent: 'center' },
  ring: {
    padding: 2,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: Radii.pill,
  },
  day: {
    width: 32,
    height: 32,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { fontFamily: 'SpaceMono', fontSize: 14, lineHeight: 18 },
  today: { textDecorationLine: 'underline' },
  session: { gap: Spacing.md },
  stat: { alignItems: 'center', gap: Spacing.xxs, paddingVertical: Spacing.xs },
  statValue: {
    fontFamily: 'SpaceMono',
    fontSize: 22,
    lineHeight: 28,
    fontVariant: ['tabular-nums'],
  },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  zoneLabel: { width: 28 },
  zoneRange: { width: 72 },
  zoneTrack: {
    flex: 1,
    height: 10,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  zoneFill: { height: '100%', borderRadius: Radii.pill },
  zoneTime: {
    width: 52,
    textAlign: 'right',
    fontFamily: 'SpaceMono',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
})
