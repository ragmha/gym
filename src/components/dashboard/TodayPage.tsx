import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import {
  type ComponentProps,
  type ReactNode,
  useEffect,
  useId,
  useState,
} from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native'
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg'

import { CommuteSetup } from '@/components/dashboard/CommuteSetup'
import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { summarizeHomeGoals } from '@/components/dashboard/GoalGrid'
import { Colors, TodayColors } from '@/constants/Colors'
import { Layout, Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useColorScheme } from '@/hooks/useColorScheme'
import { useDayPlanner } from '@/hooks/useDayPlanner'
import type { DeepWork } from '@/hooks/useDeepWork'
import type { ReadingTimer } from '@/hooks/useReadingTimer'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'
import {
  AGENDA_PERIODS,
  agendaPeriod,
  commuteSchema,
  greeting,
  reminderUrgency,
  suggestDayPlan,
  workBlock,
  type AgendaPeriod,
  type Reminder,
} from '@/lib/planner'
import { useGymLogStore } from '@/stores/GymLogStore'
import { useSpeakingLogStore } from '@/stores/SpeakingLogStore'
import { useThemeStore } from '@/stores/ThemeStore'

const time = (milliseconds: number) =>
  new Date(milliseconds).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

const todayThemes = {
  light: { ...Colors.light, ...TodayColors.light },
  dark: { ...Colors.dark, ...TodayColors.dark },
}

function useTodayTheme() {
  return todayThemes[useColorScheme() ?? 'light']
}

function MaterialSurface() {
  const theme = useTodayTheme()
  const id = useId()
  return (
    <Svg
      width="100%"
      height="100%"
      style={StyleSheet.absoluteFillObject}
      pointerEvents="none"
      accessible={false}
      aria-hidden
    >
      <Defs>
        <LinearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={theme.panelTop} />
          <Stop offset="100%" stopColor={theme.panelBottom} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  )
}

function Action({
  label,
  onPress,
  disabled = false,
  expanded,
  icon,
  summary,
  urgent = false,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  expanded?: boolean
  icon?: ComponentProps<typeof Ionicons>['name']
  summary?: string
  urgent?: boolean
}) {
  const theme = useTodayTheme()
  const { fontScale } = useWindowDimensions()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={summary ? `${label}, ${summary}` : label}
      accessibilityState={{ disabled, expanded }}
      aria-expanded={expanded}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        { opacity: disabled || pressed ? 0.5 : 1 },
      ]}
    >
      <View
        style={[
          styles.actionContent,
          summary && fontScale >= 1.4 && styles.stacked,
        ]}
      >
        <View
          style={[
            styles.actionLabel,
            summary && styles.statusLabel,
            summary && fontScale >= 1.4 && styles.stackedText,
          ]}
        >
          {icon && <Ionicons name={icon} size={20} color={theme.icon} />}
          <Text
            style={[
              Typography.labelLg,
              styles.actionText,
              { color: icon ? theme.text : theme.accent },
            ]}
          >
            {label}
          </Text>
        </View>
        {summary && (
          <Text
            style={[
              Typography.labelMd,
              styles.actionSummary,
              { color: urgent ? theme.danger : theme.subtitleText },
            ]}
          >
            {summary}
          </Text>
        )}
      </View>
      <Ionicons
        name={expanded ? 'chevron-up-outline' : 'chevron-forward-outline'}
        size={18}
        color={theme.accent}
      />
    </Pressable>
  )
}

function Card({
  title,
  icon,
  aside,
  children,
  variant = 'card',
}: {
  title: string
  icon: ComponentProps<typeof Ionicons>['name']
  aside?: ReactNode
  children: ReactNode
  variant?: 'card' | 'priority'
}) {
  const theme = useTodayTheme()
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.cardBackground, borderColor: theme.border },
        variant === 'priority' && [
          styles.priorityCard,
          { backgroundColor: theme.cardBackground },
        ],
      ]}
    >
      <MaterialSurface />
      <View style={styles.heading}>
        <Ionicons name={icon} size={20} color={theme.icon} />
        <Text
          accessibilityRole="header"
          style={[Typography.headingSm, styles.flexText, { color: theme.text }]}
        >
          {title}
        </Text>
        {aside}
      </View>
      {children}
    </View>
  )
}

function Badge({ label, urgent = false }: { label: string; urgent?: boolean }) {
  const theme = useTodayTheme()
  return (
    <View style={[styles.badge, { backgroundColor: theme.cardSurface }]}>
      <Text
        style={[
          Typography.labelMd,
          { color: urgent ? theme.danger : theme.subtitleText },
        ]}
      >
        {label}
      </Text>
    </View>
  )
}

function Disclosure({
  label,
  children,
  icon,
  summary,
  urgent,
}: {
  label: string
  children: ReactNode
  icon?: ComponentProps<typeof Ionicons>['name']
  summary?: string
  urgent?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <View>
      <Action
        label={label}
        expanded={expanded}
        onPress={() => setExpanded((value) => !value)}
        icon={icon}
        summary={summary}
        urgent={urgent}
      />
      {expanded && <View style={styles.details}>{children}</View>}
    </View>
  )
}

interface TimelineItem {
  id: string
  title: string
  startMs: number
  endMs: number
  label: string
  allDay?: boolean
  suggested?: boolean
}

type AgendaEntry =
  | { kind: 'plan'; item: TimelineItem; period: AgendaPeriod; order: number }
  | { kind: 'reminder'; item: Reminder; period: AgendaPeriod; order: number }

function AgendaRow({
  entry,
  now,
  pending,
  editable,
  onChange,
}: {
  entry: AgendaEntry
  now: Date
  pending: boolean
  editable: boolean
  onChange: (id: string, completed: boolean) => Promise<void>
}) {
  const theme = useTodayTheme()
  const completed = entry.kind === 'reminder' && entry.item.completed
  const title =
    entry.item.title ||
    (entry.kind === 'reminder' ? 'Untitled reminder' : 'Untitled event')
  const urgency =
    entry.kind === 'reminder' ? reminderUrgency(entry.item, now) : null
  const metadata =
    entry.kind === 'plan'
      ? [
          entry.item.allDay
            ? 'All day'
            : `${time(entry.item.startMs)}–${time(entry.item.endMs)}`,
          entry.item.label,
          !entry.item.allDay &&
          entry.item.startMs <= now.getTime() &&
          entry.item.endMs > now.getTime()
            ? entry.item.id.startsWith('commute-')
              ? 'Departure passed'
              : 'Now'
            : null,
        ]
      : [
          urgency,
          entry.item.dueMs !== null
            ? localDateKey(new Date(entry.item.dueMs)) !== localDateKey(now)
              ? `Due ${new Date(entry.item.dueMs).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                })}${entry.item.hasDueTime ? ` · ${time(entry.item.dueMs)}` : ''}`
              : entry.item.hasDueTime
                ? `Due ${time(entry.item.dueMs)}`
                : 'Due today'
            : null,
        ]
  const detail = metadata.filter(Boolean).join(' · ')
  const content = (
    <>
      <View style={styles.rowIcon}>
        {pending ? (
          <ActivityIndicator size="small" color={theme.accent} />
        ) : (
          <Ionicons
            name={
              entry.kind === 'reminder'
                ? completed
                  ? 'checkmark-outline'
                  : 'square-outline'
                : entry.item.id.startsWith('commute-')
                  ? 'subway-outline'
                  : entry.item.suggested
                    ? 'bulb-outline'
                    : entry.item.id === 'work'
                      ? 'briefcase-outline'
                      : 'calendar-outline'
            }
            size={24}
            color={
              entry.kind === 'reminder' ? theme.accent : theme.subtitleText
            }
          />
        )}
      </View>
      <View style={styles.agendaText}>
        <Text
          style={[
            Typography.bodyMd,
            { color: completed ? theme.subtitleText : theme.text },
          ]}
        >
          {title}
        </Text>
        {detail ? (
          <Text
            style={[
              Typography.labelMd,
              { color: urgency ? theme.danger : theme.subtitleText },
            ]}
          >
            {detail}
          </Text>
        ) : null}
      </View>
    </>
  )
  return entry.kind === 'reminder' ? (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={detail ? `${title}, ${detail}` : title}
      accessibilityHint={
        completed
          ? 'Mark incomplete in Apple Reminders'
          : 'Complete in Apple Reminders'
      }
      accessibilityState={{
        checked: completed,
        disabled: !editable || pending,
        busy: pending,
      }}
      aria-checked={completed}
      aria-busy={pending}
      aria-disabled={!editable || pending}
      disabled={!editable || pending}
      onPress={() => void onChange(entry.item.id, !entry.item.completed)}
      style={({ pressed }) => [
        styles.agendaRow,
        { opacity: pressed ? 0.6 : 1 },
      ]}
    >
      {content}
    </Pressable>
  ) : (
    <View
      testID={`timeline-${entry.item.id}`}
      accessible
      accessibilityLabel={`${title}, ${detail}`}
      style={styles.agendaRow}
    >
      {content}
    </View>
  )
}

export function TodayPage({
  snapshot,
  date,
  reading,
  deepWork,
  active,
  healthError,
  onRetryHealth,
}: {
  snapshot: DailyHealthSnapshot | null
  date: Date
  reading: ReadingTimer | null
  deepWork: DeepWork
  active: boolean
  healthError: string | null
  onRetryHealth: () => void
}) {
  const theme = useTodayTheme()
  const router = useRouter()
  const { fontScale } = useWindowDimensions()
  const largeText = fontScale >= 1.4
  const [setup, setSetup] = useState(false)
  const [allActivities, setAllActivities] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const storedCommute = useThemeStore((state) => state.commute)
  const parsedCommute = commuteSchema.safeParse(storedCommute)
  const commute = parsedCommute.success ? storedCommute : null
  const planner = useDayPlanner(active && !setup, commute)
  const { now, day, transit } = planner
  const key = localDateKey(date)
  const log = useGymLogStore((state) => state.logs[key])
  const sessions = useSpeakingLogStore((state) => state.sessions)
  const speaking = sessions.filter(
    (session) => localDateKey(new Date(session.at)) === key,
  )
  const summary = summarizeHomeGoals(snapshot, date, Boolean(log?.finishedAt))
  const percent =
    summary.progress === null ? null : Math.floor(summary.progress * 100)
  const work = workBlock(now, commute)
  const reminders =
    day?.remindersAccess === 'granted'
      ? [...day.reminders].sort(
          (a, b) =>
            Number(Boolean(reminderUrgency(b, now))) -
              Number(Boolean(reminderUrgency(a, now))) ||
            (a.dueMs ?? Infinity) - (b.dueMs ?? Infinity),
        )
      : []
  const urgent = reminders.filter((reminder) => reminderUrgency(reminder, now))
  const events = day?.calendarAccess === 'granted' ? day.events : []
  const suggestions = suggestDayPlan({
    now,
    day,
    commute,
    journeys: planner.journeys.map((journey) => ({
      startMs: journey.leaveMs,
      endMs: journey.arriveMs,
    })),
    steps: snapshot?.steps ?? null,
    gymFinished: Boolean(log?.finishedAt),
    deepWorkActive: deepWork.session !== null,
  })
  const timeline: TimelineItem[] = [
    ...events.map((event) => ({
      ...event,
      id: `event-${event.id}-${event.startMs}`,
      title: event.title || 'Untitled event',
      label: 'Calendar',
    })),
    ...(work && day?.calendarAccess === 'granted'
      ? [{ ...work, id: 'work', title: 'Work', label: 'Reserved' }]
      : []),
    ...planner.journeys.map((journey) => ({
      id: `commute-${journey.direction}`,
      title: `${journey.direction} · Metro`,
      startMs: journey.leaveMs,
      endMs: journey.arriveMs,
      label: journey.realtime ? 'Live' : 'Timetable',
    })),
    ...suggestions.map((suggestion) => ({
      ...suggestion,
      label: 'Suggested',
      suggested: true,
    })),
  ].sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs)
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)
  const agenda: AgendaEntry[] = [
    ...timeline.map(
      (item): AgendaEntry => ({
        kind: 'plan',
        item,
        period: agendaPeriod(
          item.allDay ? null : Math.max(item.startMs, dayStart.getTime()),
          date,
        ),
        order: item.startMs,
      }),
    ),
    ...reminders.map(
      (item): AgendaEntry => ({
        kind: 'reminder',
        item,
        period: agendaPeriod(
          item.hasDueTime && reminderUrgency(item, now) !== 'Overdue'
            ? item.dueMs
            : null,
          date,
        ),
        order: item.dueMs ?? Infinity,
      }),
    ),
  ].sort((a, b) => (a.order === b.order ? 0 : a.order - b.order))
  const healthMinutes = snapshot?.workouts.length
    ? snapshot.workouts.reduce(
        (sum, workout) => sum + workout.durationMinutes,
        0,
      )
    : null
  const text = { color: theme.text }
  const muted = { color: theme.subtitleText }
  const stat = (
    label: string,
    value: string,
    icon?: ComponentProps<typeof Ionicons>['name'],
    highlighted = false,
  ) => (
    <View
      key={label}
      style={[
        styles.stat,
        icon && styles.metricCard,
        icon && {
          backgroundColor: highlighted ? theme.highlight : theme.cardBackground,
        },
        largeText && styles.fullWidth,
      ]}
      accessible
      accessibilityLabel={`${label}, ${value}`}
    >
      <View style={styles.heading}>
        {icon && (
          <View
            style={[
              styles.metricIcon,
              {
                backgroundColor: highlighted
                  ? theme.highlightIcon
                  : theme.cardSurface,
              },
            ]}
          >
            <Ionicons
              name={icon}
              size={18}
              color={highlighted ? theme.onHighlightIcon : theme.text}
            />
          </View>
        )}
        <Text
          style={[
            icon ? Typography.bodySm : Typography.labelMd,
            { color: highlighted ? theme.onHighlight : theme.subtitleText },
          ]}
        >
          {label}
        </Text>
      </View>
      <Text
        style={[
          icon ? Typography.headingLg : Typography.numericMd,
          { color: highlighted ? theme.onHighlight : theme.text },
        ]}
      >
        {value}
      </Text>
    </View>
  )
  const calendarStatus = !planner.available
    ? 'Not connected · iOS 17+ build required'
    : day?.calendarAccess === 'granted'
      ? `${events.length} event${events.length === 1 ? '' : 's'}`
      : day?.calendarAccess === 'denied'
        ? 'Access denied'
        : planner.busy
          ? 'Loading'
          : 'Not connected'
  const inboxStatus = !planner.available
    ? 'Not connected · iOS 17+ build required'
    : day?.remindersAccess === 'granted'
      ? urgent.length
        ? `${urgent.length} urgent`
        : `${reminders.filter((reminder) => !reminder.completed).length} open`
      : day?.remindersAccess === 'denied'
        ? 'Access denied'
        : planner.busy
          ? 'Loading'
          : 'Not connected'
  const commuteStatus = transit
    ? `Leave ${time(transit.leaveMs)} · ${transit.realtime ? 'Live' : 'Timetable'}`
    : !planner.available || planner.transitError
      ? 'Unavailable'
      : !work
        ? 'No commute'
        : commute
          ? 'Not connected'
          : 'Set stops'

  if (!mounted) return <Text style={muted}>Loading Today...</Text>

  return (
    <ScrollView
      testID="today-content"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heading}>
        <View style={largeText ? styles.fullWidth : styles.flexText}>
          <Text
            accessibilityRole="header"
            style={[
              largeText ? Typography.headingMd : Typography.headingXl,
              text,
            ]}
          >
            {greeting(now)}
          </Text>
        </View>
        {!largeText && (
          <View
            style={[styles.dayIcon, { backgroundColor: theme.cardSurface }]}
          >
            <Ionicons
              name={
                now.getHours() < 5 || now.getHours() >= 17
                  ? 'moon-outline'
                  : 'sunny-outline'
              }
              size={24}
              color={theme.icon}
            />
          </View>
        )}
      </View>
      <Card
        title="Steps + Gym"
        icon="grid-outline"
        variant="priority"
        aside={<Badge label={`${summary.done}/${summary.total} met`} />}
      >
        <View style={[styles.overview, largeText && styles.stacked]}>
          <View style={[styles.overviewText, largeText && styles.stackedText]}>
            <Text style={[Typography.numericLg, text]}>
              {percent === null ? '--' : `${percent}%`}
            </Text>
          </View>
          <View
            style={styles.dots}
            accessible
            accessibilityLabel={
              percent === null
                ? 'Daily priority progress unavailable'
                : `${percent}% daily priority progress, Steps and Gym`
            }
          >
            <Svg
              width="100%"
              height="100%"
              viewBox="0 0 200 200"
              accessible={false}
              aria-hidden
            >
              {Array.from({ length: 100 }, (_, index) => (
                <Circle
                  key={index}
                  cx={10 + (index % 10) * 20}
                  cy={10 + Math.floor(index / 10) * 20}
                  r={4.5}
                  fill={
                    percent !== null && index < percent
                      ? theme.goalComplete
                      : theme.border
                  }
                />
              ))}
            </Svg>
          </View>
        </View>
      </Card>
      <View style={styles.section}>
        <Text accessibilityRole="header" style={[Typography.headingMd, text]}>
          Your agenda
        </Text>
        {planner.available ? (
          <>
            <Text style={[Typography.labelMd, muted]}>
              Calendar · {calendarStatus}
            </Text>
            <Text style={[Typography.labelMd, muted]}>
              Reminders · {inboxStatus}
            </Text>
          </>
        ) : (
          <Text style={[Typography.labelMd, muted]}>
            Calendar & Reminders · iOS 17+ build required
          </Text>
        )}
        {urgent.length > 0 && (
          <Text
            accessibilityRole="alert"
            style={[Typography.labelLg, { color: theme.danger }]}
          >
            {urgent.length} urgent reminder{urgent.length === 1 ? '' : 's'}
          </Text>
        )}
        <View testID="today-agenda" style={styles.agenda}>
          {AGENDA_PERIODS.map((period) => {
            const entries = agenda.filter((entry) => entry.period === period)
            if (period === 'Anytime' && entries.length === 0) return null
            return (
              <View
                key={period}
                testID={`agenda-${period}`}
                style={styles.section}
              >
                <Text
                  accessibilityRole="header"
                  style={[Typography.headingLg, text]}
                >
                  {period}
                </Text>
                {entries.map((entry) => (
                  <AgendaRow
                    key={`${entry.kind}-${entry.item.id}`}
                    entry={entry}
                    now={now}
                    pending={planner.pendingReminders.includes(entry.item.id)}
                    editable={
                      active &&
                      planner.available &&
                      day?.remindersAccess === 'granted'
                    }
                    onChange={planner.setReminderCompleted}
                  />
                ))}
                {entries.length === 0 && (
                  <Text style={[Typography.bodySm, muted]}>
                    {planner.available && day?.calendarAccess === 'granted'
                      ? 'No planned items'
                      : '--'}
                  </Text>
                )}
              </View>
            )
          })}
        </View>
        {planner.error && (
          <Text accessibilityRole="alert" style={{ color: theme.danger }}>
            {planner.error}
          </Text>
        )}
        {planner.reminderError && (
          <Text accessibilityRole="alert" style={{ color: theme.danger }}>
            {planner.reminderError}
          </Text>
        )}
        {planner.transitError && (
          <Text accessibilityRole="alert" style={{ color: theme.danger }}>
            {planner.transitError}
          </Text>
        )}
        {storedCommute && !parsedCommute.success && (
          <Text accessibilityRole="alert" style={{ color: theme.danger }}>
            Saved commute preferences are invalid. Open setup to replace them.
          </Text>
        )}
        {work && (!planner.journeys.length || planner.transitError) && (
          <Text style={[Typography.labelMd, { color: theme.warning }]}>
            {planner.journeys.length
              ? 'Partial commute coverage'
              : 'Commute time not included'}
          </Text>
        )}
      </View>
      <Disclosure label="Activity" icon="heart-outline">
        <View style={styles.stats}>
          {stat(
            'Steps',
            snapshot?.steps == null ? '--' : snapshot.steps.toLocaleString(),
            'footsteps-outline',
            true,
          )}
          {stat(
            'Active energy',
            snapshot?.calories == null
              ? '--'
              : `${Math.round(snapshot.calories)} kcal`,
            'flame-outline',
          )}
          {stat(
            'Water',
            snapshot?.waterLiters == null
              ? '--'
              : `${snapshot.waterLiters.toFixed(1)} L`,
            'water-outline',
          )}
          {stat(
            'Sleep',
            snapshot?.sleepHours == null
              ? '--'
              : `${snapshot.sleepHours.toFixed(1)} h`,
            'moon-outline',
            true,
          )}
        </View>
        {allActivities && (
          <View style={styles.stats}>
            {stat(
              'Health workouts',
              healthMinutes == null ? '--' : `${Math.floor(healthMinutes)} min`,
            )}
            {stat(
              'Latest weight',
              snapshot?.bodyMassKg == null
                ? '--'
                : `${snapshot.bodyMassKg.toFixed(1)} kg`,
            )}
            {stat(
              'Food energy',
              snapshot?.dietaryCalories == null
                ? '--'
                : `${Math.round(snapshot.dietaryCalories)} kcal`,
            )}
            {stat(
              'Lifting log',
              log?.finishedAt
                ? 'Finished'
                : log
                  ? 'In progress'
                  : 'No session logged',
            )}
            {stat(
              'Speaking log',
              speaking.length
                ? `${Math.floor(speaking.reduce((sum, session) => sum + session.seconds, 0) / 60)} min`
                : 'No session logged',
            )}
            {stat(
              'Reading',
              reading?.running
                ? 'Timer running'
                : reading?.last?.day === key
                  ? `${reading.last.minutes} min (last session)`
                  : 'Not measured',
            )}
            {stat(
              'Deep Work',
              deepWork.session
                ? deepWork.session.endsAt === null
                  ? 'Paused'
                  : deepWork.session.phase === 'focus'
                    ? 'Focusing'
                    : 'On break'
                : 'No active timer',
            )}
          </View>
        )}
        <Action
          label={allActivities ? 'Fewer activities' : 'All activities'}
          expanded={allActivities}
          onPress={() => setAllActivities((value) => !value)}
        />
        {allActivities && (
          <Text style={[Typography.labelMd, muted]}>
            Reading: last session only. Deep Work: current timer only. Prayer
            and journaling: not measured. Missing Health readings: --.
          </Text>
        )}
      </Disclosure>
      {healthError && (
        <Card title="Health connection" icon="heart-outline">
          <Text accessibilityRole="alert" style={{ color: theme.danger }}>
            {healthError}
          </Text>
          <Action label="Retry loading health data" onPress={onRetryHealth} />
          {reading?.running && (
            <Action label="Stop reading timer" onPress={reading.stop} />
          )}
          {deepWork.session && (
            <Action label="End deep work" onPress={deepWork.end} />
          )}
        </Card>
      )}

      <View style={styles.section}>
        <Disclosure
          label="Metro commute"
          icon="subway-outline"
          summary={commuteStatus}
        >
          {transit ? (
            <>
              <Text style={[Typography.labelMd, muted]}>
                {transit.direction} · Leave by
              </Text>
              <Text style={[Typography.numericLg, text]}>
                {time(transit.leaveMs)}
              </Text>
              <Text style={[Typography.bodySm, muted]}>
                Arrive {time(transit.arriveMs)} · walking included
              </Text>
              <Text style={[Typography.labelMd, muted]}>
                Checked {time(transit.fetchedMs)}
                {!transit.realtime && ' · No live confirmation'}
              </Text>
            </>
          ) : (
            <Text style={[Typography.bodySm, muted]}>
              {!work
                ? 'No weekday work commute today.'
                : commute
                  ? 'Connect to HSL with your saved key for times.'
                  : 'Set your stops to see when to leave.'}
            </Text>
          )}
          <Action
            label="Commute setup"
            onPress={() => setSetup(true)}
            disabled={!planner.available}
          />
        </Disclosure>
      </View>

      <View style={styles.section}>
        <Action
          label="Open Gym"
          onPress={() =>
            router.push({ pathname: '/gym', params: { date: key } })
          }
        />
      </View>

      <View style={styles.section}>
        <Disclosure label="Today options">
          {!planner.available && (
            <Text style={[Typography.bodySm, muted]}>
              Calendar and Reminders need a compatible iOS 17+ build.
            </Text>
          )}
          {planner.available && day?.calendarAccess !== 'granted' && (
            <Action
              label={
                day?.calendarAccess === 'denied'
                  ? 'Review Calendar access'
                  : 'Connect Apple Calendar'
              }
              onPress={() => void planner.connect('Calendar')}
              disabled={planner.busy}
            />
          )}
          {planner.available && day?.remindersAccess !== 'granted' && (
            <Action
              label={
                day?.remindersAccess === 'denied'
                  ? 'Review Reminders access'
                  : 'Connect Apple Reminders'
              }
              onPress={() => void planner.connect('Reminders')}
              disabled={planner.busy}
            />
          )}
          <Action
            label="Refresh Today connections"
            onPress={planner.refresh}
            disabled={planner.busy || !planner.available}
          />
          <Disclosure label="About Today">
            <Text style={[Typography.bodySm, muted]}>
              Calendar events stay read-only and on this device. iOS requests
              full access to allow reading. Only an explicit reminder checkbox
              tap changes its completion in Apple Reminders. Urgency uses due
              dates and priority. Alerts appear here only, without background
              notifications.
            </Text>
            <Text style={[Typography.bodySm, muted]}>
              Work is reserved on weekdays. Suggested blocks are not bookings;
              all-day events are reserved. Travel to Calendar event locations is
              not calculated. HSL receives only commute inputs and your key, not
              Calendar, Reminders or Health data. Times refresh every minute
              while Today is open.
            </Text>
            <Text style={[Typography.bodySm, muted]}>
              Progress represents Steps and Gym only. Missing readings earn no
              progress, not an invented zero. Suggestions use today&apos;s
              visible evidence, not the Health coach.
            </Text>
            <Text style={[Typography.bodySm, muted]}>
              At most three proposals fit into remaining Calendar gaps: urgent
              review (15 min), unfinished Gym (45 min), a walk when measured
              steps are below target (15 min), then focus if no Deep Work timer
              is active (25 min). These are suggested time budgets, not measured
              activity or additional goals.
            </Text>
          </Disclosure>
        </Disclosure>
      </View>
      {setup && (
        <CommuteSetup
          onClose={() => {
            setSetup(false)
            planner.refresh()
          }}
        />
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: Layout.gutter,
    gap: Spacing.md,
    maxWidth: Layout.contentMaxWidth,
    width: '100%',
    alignSelf: 'center',
  },
  overview: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.lg,
  },
  dots: { width: 96, height: 96 },
  overviewText: { flex: 1, minWidth: 120, gap: Spacing.xxs },
  stacked: { flexDirection: 'column', alignItems: 'flex-start' },
  stackedText: { flex: 0, alignSelf: 'stretch' },
  fullWidth: { flexBasis: '100%', minWidth: 0 },
  dayIcon: {
    width: Layout.controlSize,
    height: Layout.controlSize,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agenda: { gap: Spacing.lg, paddingTop: Spacing.sm },
  agendaRow: {
    minHeight: Layout.controlSize,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  rowIcon: { width: 28, paddingTop: Spacing.xxs, alignItems: 'center' },
  agendaText: { flex: 1, minWidth: 0, gap: Spacing.xxs },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  stat: { flexBasis: '45%', flexGrow: 1, minWidth: 120, gap: Spacing.xxs },
  metricCard: {
    minHeight: 140,
    padding: Spacing.md,
    borderRadius: Radii.xl,
    justifyContent: 'space-between',
    gap: Spacing.lg,
  },
  metricIcon: {
    width: Spacing.xxl,
    height: Spacing.xxl,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    overflow: 'hidden',
    borderRadius: Radii.panel,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  priorityCard: { borderWidth: 0 },
  section: { gap: Spacing.sm },
  heading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  flexText: { flex: 1, minWidth: 100 },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
  },
  details: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  action: {
    minHeight: Layout.controlSize,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionLabel: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionText: { flex: 1, minWidth: 0 },
  statusLabel: { minWidth: 100 },
  actionSummary: { flexShrink: 1 },
})
