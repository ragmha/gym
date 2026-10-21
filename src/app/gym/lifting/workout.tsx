import { Ionicons } from '@expo/vector-icons'
import {
  AppRemote,
  Auth,
  Content,
  Images,
  Player,
  SpotifyURI,
  useConnectionState,
  usePlayerState,
  useSession,
  type ContentItem,
} from '@wwdrew/expo-spotify-sdk'
import { File } from 'expo-file-system'
import { StatusBar } from 'expo-status-bar'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'
import { useReducedMotion } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ScreenHeader } from '@/components/common/ScreenHeader'
import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { ExerciseInfoButton } from '@/components/gym/ExerciseInfoSheet'
import {
  RepCameraCounter,
  repCameraAvailable,
} from '@/components/gym/RepCameraCounter'
import { RestTimer } from '@/components/gym/RestTimer'
import { HealthDateRoute } from '@/components/health/HealthDateRoute'
import { Layout, Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useColorScheme } from '@/hooks/useColorScheme'
import { useTheme } from '@/hooks/useThemeColor'
import {
  exerciseHistory,
  findProgrammeDay,
  nextFiveByFive,
  nextWeight,
  programmeDayFor,
  type ExerciseSession,
  type FiveByFiveExercise,
  type LiftingWorkout,
  type NextWeight,
  type ProgrammeExercise,
} from '@/lib/gymProgramme'
import { clampRest, restSeconds } from '@/lib/gymProgramme/rest'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import {
  isValidSet,
  MAX_REPS,
  useGymLogStore,
  type GymDayLog,
  type LoggedSet,
} from '@/stores/GymLogStore'

// To Failure exercises plan five set circles; a "+" circle adds extra sets.
const FAILURE_ROWS = 5

type OnRest = (exercise: ProgrammeExercise, set: LoggedSet | null) => void
const pad = (n: number) => String(n).padStart(2, '0')

export default function LiftingWorkoutScreen() {
  return (
    <HealthDateRoute>
      {(date) => <LiftingForDate date={date} />}
    </HealthDateRoute>
  )
}

// `quick` is the StrongLifts 5×5 short-day screen; a saved log pins its workout.
export function LiftingForDate({
  date,
  quick = false,
}: {
  date: Date
  quick?: boolean
}) {
  const theme = useTheme()
  const colorScheme = useColorScheme()
  const dateKey = localDateKey(date)
  const programmeStart = useGymLogStore((s) => s.programmeStart)
  const log = useGymLogStore((s) => s.logs[dateKey])
  const fiveByFive = useGymLogStore((s) => nextFiveByFive(s.logs, dateKey))
  const [focus, setFocus] = useState(false)
  const [rest, setRest] = useState<{
    exerciseId: string
    base: number
    startedAt: number
  } | null>(null)
  // Per-exercise +/- adjustments, kept only while this screen is open.
  const [restDelta, setRestDelta] = useState<Record<string, number>>({})
  const resting = log?.finishedAt ? null : rest
  const onRest: OnRest = (exercise, set) =>
    setRest((current) =>
      set
        ? {
            exerciseId: exercise.id,
            base: restSeconds(exercise, set),
            startedAt: Date.now(),
          }
        : current?.exerciseId === exercise.id
          ? null
          : current,
    )

  // A saved log keeps its programme day even if the start date changes later.
  const scheduled =
    !log && programmeStart ? programmeDayFor(programmeStart, dateKey) : null
  const day: LiftingWorkout | null = log
    ? findProgrammeDay(log.day)
    : quick
      ? fiveByFive
      : scheduled && 'day' in scheduled
        ? scheduled.day
        : null
  const outside = scheduled && 'reason' in scheduled ? scheduled.reason : null
  // Full screen only applies while an exercise card (with its exit button) shows.
  const fullScreen = focus && Boolean(day?.exercises.length)

  const dateLabel = date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <SafeAreaView
      testID="gym-lifting-screen"
      style={[styles.container, { backgroundColor: theme.homeBackground }]}
      edges={
        fullScreen || resting
          ? ['top', 'left', 'right', 'bottom']
          : ['top', 'left', 'right']
      }
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      {!fullScreen && (
        <ScreenHeader
          title={quick ? 'Short day' : 'Lifting'}
          subtitle={dateLabel}
          backLabel="Back to programme overview"
        />
      )}
      <View style={styles.spotifyDock}>
        <SpotifyPlayer />
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          fullScreen && styles.focusContent,
        ]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        {!fullScreen && (
          <Band
            title={
              !day
                ? 'Lifting'
                : 'week' in day
                  ? `Week ${day.week} · Day ${pad(Number(day.day))}`
                  : 'StrongLifts 5×5'
            }
          />
        )}
        {day ? (
          <LiftingDay
            key={`${dateKey}-${day.day}`}
            day={day}
            dateKey={dateKey}
            log={log}
            focus={fullScreen}
            onToggleFocus={() => setFocus((on) => !on)}
            onRest={onRest}
          />
        ) : (
          <View style={styles.block}>
            <Text style={[Typography.bodyMd, { color: theme.text }]}>
              {!programmeStart
                ? 'Start the programme from the overview to open a workout.'
                : outside === 'before-start'
                  ? 'Before your programme starts.'
                  : 'Programme complete.'}
            </Text>
          </View>
        )}
      </ScrollView>
      {resting && (
        <RestTimer
          key={resting.startedAt}
          startedAt={resting.startedAt}
          seconds={clampRest(
            resting.base + (restDelta[resting.exerciseId] ?? 0),
          )}
          onAdjust={(step) =>
            setRestDelta((delta) => {
              // Step from the shown (clamped) target so every press is visible.
              const shown = clampRest(
                resting.base + (delta[resting.exerciseId] ?? 0),
              )
              return {
                ...delta,
                [resting.exerciseId]: clampRest(shown + step) - resting.base,
              }
            })
          }
          onDismiss={() => setRest(null)}
        />
      )}
    </SafeAreaView>
  )
}

function SpotifyPlayer() {
  const theme = useTheme()
  const reduceMotion = useReducedMotion()
  const session = useSession()
  const connection = useConnectionState()
  const player = usePlayerState()
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pending = useRef<{ kind: 'auth' | 'playback' } | null>(null)
  const [path, setPath] = useState<ContentItem[]>([])
  const [attempt, setAttempt] = useState(0)
  const [content, setContent] = useState<{
    node: ContentItem | undefined
    items: ContentItem[] | null
  } | null>(null)
  const ios = Platform.OS === 'ios'
  const connected = ios && connection === 'connected'
  const track = connected ? player?.track : undefined
  const canControl = connected && Boolean(track) && !busy
  const canSkipPrevious =
    canControl && Boolean(player?.playbackRestrictions.canSkipPrevious)
  const canSkipNext =
    canControl && Boolean(player?.playbackRestrictions.canSkipNext)
  const browsing = visible && connected
  const current = path.at(-1)
  const page = content?.node === current ? content : null

  useEffect(() => {
    setContent(null)
    if (!browsing) {
      if (current) setPath([])
      return
    }
    let active = true
    const request = current
      ? Content.getChildren(current)
      : Content.getRecommendedContentItems('default')
    request.then(
      (items) => {
        if (active) setContent({ node: current, items })
      },
      () => {
        if (active) setContent({ node: current, items: null })
      },
    )
    return () => {
      active = false
    }
  }, [browsing, current, attempt])

  const close = () => {
    setVisible(false)
    setError(null)
    if (pending.current?.kind === 'auth') {
      pending.current = null
      setBusy(false)
      void Auth.cancelPending().catch(() =>
        Alert.alert(
          'Could not cancel the Spotify connection',
          'Try connecting again.',
        ),
      )
    }
  }

  const openSpotify = async () => {
    try {
      await Linking.openURL(
        Platform.OS === 'web' ? 'https://open.spotify.com' : 'spotify://',
      )
    } catch {
      try {
        await Linking.openURL('https://open.spotify.com')
      } catch {
        Alert.alert('Spotify could not be opened')
      }
    }
  }

  const connect = async () => {
    if (pending.current) return
    const request = { kind: 'auth' } as const
    pending.current = request
    setBusy(true)
    setError(null)
    try {
      if (!Auth.isAvailable()) {
        setError('Install Spotify on this iPhone, then try again.')
        return
      }
      let activeSession = session
      if (!activeSession || activeSession.expirationDate <= Date.now()) {
        await Auth.cancelPending()
        if (pending.current !== request) return
        activeSession = await Auth.authenticate({
          scopes: ['app-remote-control'],
        })
      }
      if (pending.current !== request) return
      await AppRemote.connect(activeSession.accessToken)
    } catch {
      if (pending.current === request) {
        setError('Could not connect. Open Spotify and try connecting again.')
      }
    } finally {
      if (pending.current === request) {
        pending.current = null
        setBusy(false)
      }
    }
  }

  const control = async (action: () => Promise<void>) => {
    if (pending.current) return
    pending.current = { kind: 'playback' }
    setBusy(true)
    try {
      await action()
      setError(null)
    } catch {
      setError('Could not change playback. Try again or open Spotify.')
    } finally {
      pending.current = null
      setBusy(false)
    }
  }
  // The native SDK also returns playable user-scoped and collection URIs.
  const playItem = (item: ContentItem) =>
    control(() => Player.play(SpotifyURI.unsafe(item.uri)))
  const controls = [
    {
      label: 'Previous track',
      icon: 'play-skip-back',
      enabled: canSkipPrevious,
      action: Player.skipPrevious,
    },
    {
      label: player?.isPaused ? 'Play' : 'Pause',
      icon: player?.isPaused ? 'play' : 'pause',
      enabled: canControl,
      action: player?.isPaused ? Player.resume : Player.pause,
    },
    {
      label: 'Next track',
      icon: 'play-skip-forward',
      enabled: canSkipNext,
      action: Player.skipNext,
    },
  ] as const

  return (
    <>
      <Pressable
        testID="gym-spotify-player"
        accessibilityRole="button"
        accessibilityLabel={
          track
            ? `Spotify, ${track.name} by ${track.artist.name}`
            : 'Open Spotify music controls'
        }
        onPress={() => setVisible(true)}
        style={[
          styles.spotifyBar,
          { backgroundColor: theme.homeSurface, borderColor: theme.goalTrack },
        ]}
      >
        <SpotifyArtwork
          imageIdentifier={track?.imageIdentifier}
          label={`Album art for ${track?.name ?? 'current track'}`}
          size={48}
        />
        <View style={styles.flex}>
          <Text
            numberOfLines={1}
            style={[Typography.labelLg, { color: theme.text }]}
          >
            {track?.name ?? 'Spotify'}
          </Text>
          <Text
            numberOfLines={1}
            style={[Typography.bodySm, { color: theme.subtitleText }]}
          >
            {track
              ? track.artist.name
              : ios
                ? 'Connect to see what’s playing'
                : 'Open Spotify'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.subtitleText} />
      </Pressable>
      <Modal
        visible={visible}
        transparent
        animationType={reduceMotion ? 'none' : 'slide'}
        onRequestClose={close}
      >
        <View style={styles.spotifyOverlay}>
          <Pressable
            accessible={false}
            onPress={close}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView
            testID="gym-spotify-sheet"
            accessibilityViewIsModal
            edges={['bottom', 'left', 'right']}
            style={[
              styles.spotifySheet,
              { backgroundColor: theme.cardBackground },
            ]}
          >
            <View style={styles.spotifySheetHeader}>
              <Text style={[Typography.headingMd, { color: theme.text }]}>
                Spotify
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close Spotify controls"
                onPress={close}
                style={styles.spotifyClose}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>
            <FlatList
              key={current?.uri ?? 'recommendations'}
              data={browsing ? (page?.items ?? []) : []}
              keyExtractor={(item) => item.identifier || item.uri}
              initialNumToRender={6}
              windowSize={3}
              style={styles.spotifyList}
              contentContainerStyle={styles.spotifyListContent}
              ListHeaderComponent={
                <View style={styles.spotifyListHeader}>
                  <View style={styles.spotifyTrack}>
                    <SpotifyArtwork
                      imageIdentifier={track?.imageIdentifier}
                      label={`Album art for ${track?.name ?? 'current track'}`}
                      size={64}
                    />
                    <View style={styles.flex}>
                      <Text
                        numberOfLines={2}
                        style={[Typography.headingSm, { color: theme.text }]}
                      >
                        {track?.name ??
                          (connected ? 'Nothing playing' : 'Spotify')}
                      </Text>
                      <Text
                        style={[
                          Typography.bodySm,
                          { color: theme.subtitleText },
                        ]}
                      >
                        {track?.artist.name ??
                          (connected
                            ? 'Start music in Spotify to see it here'
                            : ios
                              ? 'Connect to see what’s playing'
                              : 'Playback and playlists are available in the iPhone app.')}
                      </Text>
                    </View>
                  </View>
                  {ios && (
                    <View style={styles.spotifyControls}>
                      {controls.map((button, index) => (
                        <Pressable
                          key={index}
                          accessibilityRole="button"
                          accessibilityLabel={button.label}
                          accessibilityState={{ disabled: !button.enabled }}
                          disabled={!button.enabled}
                          onPress={() => void control(button.action)}
                          style={[
                            index === 1
                              ? styles.spotifyPlay
                              : styles.spotifyControl,
                            {
                              backgroundColor:
                                index === 1 ? theme.accent : theme.homeSurface,
                              opacity: button.enabled ? 1 : 0.45,
                            },
                          ]}
                        >
                          <Ionicons
                            name={button.icon}
                            size={index === 1 ? 28 : 24}
                            color={
                              index === 1 ? theme.selectedText : theme.text
                            }
                          />
                        </Pressable>
                      ))}
                    </View>
                  )}
                  {error && (
                    <Text
                      accessibilityRole="alert"
                      style={[Typography.bodySm, { color: theme.danger }]}
                    >
                      {error}
                    </Text>
                  )}
                  {ios && !connected && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ disabled: busy }}
                      disabled={busy}
                      onPress={() => void connect()}
                      style={[
                        styles.spotifyConnect,
                        { backgroundColor: theme.homeSurface },
                      ]}
                    >
                      <Text style={[Typography.labelLg, { color: theme.text }]}>
                        {busy
                          ? 'Connecting…'
                          : session
                            ? 'Reconnect Spotify'
                            : 'Connect Spotify'}
                      </Text>
                    </Pressable>
                  )}
                  {browsing && (
                    <View style={styles.spotifyBrowseHeader}>
                      {current && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Back to Spotify playlists"
                          onPress={() => setPath(path.slice(0, -1))}
                          style={styles.spotifyClose}
                        >
                          <Ionicons
                            name="chevron-back"
                            size={24}
                            color={theme.text}
                          />
                        </Pressable>
                      )}
                      <Text
                        accessibilityRole="header"
                        style={[
                          Typography.headingSm,
                          styles.flex,
                          { color: theme.text },
                        ]}
                      >
                        {current?.title || 'Recent & recommended'}
                      </Text>
                      {current?.isPlayable && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Play ${current.title || 'selection'}`}
                          accessibilityState={{ disabled: busy }}
                          disabled={busy}
                          onPress={() => void playItem(current)}
                          style={styles.spotifyClose}
                        >
                          <Ionicons
                            name="play-outline"
                            size={24}
                            color={theme.text}
                          />
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              }
              ListEmptyComponent={
                !browsing ? null : !page ? (
                  <ActivityIndicator
                    accessibilityLabel="Loading Spotify playlists"
                    color={theme.accent}
                  />
                ) : page.items === null ? (
                  <View style={styles.spotifyListHeader}>
                    <Text
                      accessibilityRole="alert"
                      style={[Typography.bodySm, { color: theme.danger }]}
                    >
                      Could not load Spotify content.
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setAttempt((n) => n + 1)}
                      style={[
                        styles.spotifyConnect,
                        { backgroundColor: theme.homeSurface },
                      ]}
                    >
                      <Text style={[Typography.labelLg, { color: theme.text }]}>
                        Retry playlists
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text
                    style={[Typography.bodySm, { color: theme.subtitleText }]}
                  >
                    {current
                      ? 'No items available here.'
                      : 'No recent or recommended playlists available.'}
                  </Text>
                )
              }
              renderItem={({ item }) => {
                const title = item.title || 'Untitled item'
                const disabled = !item.isContainer && (!item.isPlayable || busy)
                return (
                  <View style={styles.spotifyContentRow}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${item.isContainer ? 'Browse' : 'Play'} ${title}`}
                      accessibilityState={{ disabled }}
                      disabled={disabled}
                      onPress={() =>
                        item.isContainer
                          ? setPath([...path, item])
                          : void playItem(item)
                      }
                      style={[
                        styles.spotifyContentItem,
                        { opacity: disabled ? 0.45 : 1 },
                      ]}
                    >
                      <SpotifyArtwork
                        imageIdentifier={item.imageIdentifier}
                        label={`Cover art for ${title}`}
                        size={48}
                      />
                      <View style={styles.flex}>
                        <Text
                          numberOfLines={2}
                          style={[Typography.labelLg, { color: theme.text }]}
                        >
                          {title}
                        </Text>
                        {!!item.subtitle && (
                          <Text
                            numberOfLines={2}
                            style={[
                              Typography.bodySm,
                              { color: theme.subtitleText },
                            ]}
                          >
                            {item.subtitle}
                          </Text>
                        )}
                      </View>
                      <Ionicons
                        name={
                          item.isContainer ? 'chevron-forward' : 'play-outline'
                        }
                        size={20}
                        color={theme.text}
                      />
                    </Pressable>
                    {item.isContainer && item.isPlayable && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Play ${title}`}
                        accessibilityState={{ disabled: busy }}
                        disabled={busy}
                        onPress={() => void playItem(item)}
                        style={styles.spotifyClose}
                      >
                        <Ionicons
                          name="play-outline"
                          size={24}
                          color={theme.text}
                        />
                      </Pressable>
                    )}
                  </View>
                )
              }}
            />
            <Pressable
              accessibilityRole="link"
              onPress={() => void openSpotify()}
              style={[
                styles.spotifyConnect,
                { backgroundColor: theme.homeSurface },
              ]}
            >
              <Text style={[Typography.labelLg, { color: theme.text }]}>
                Open Spotify
              </Text>
            </Pressable>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  )
}

function SpotifyArtwork({
  imageIdentifier,
  label,
  size,
}: {
  imageIdentifier: string | null | undefined
  label: string
  size: number
}) {
  const theme = useTheme()
  const [art, setArt] = useState<{ id: string; data: string | null } | null>(
    null,
  )
  useEffect(() => {
    setArt(null)
    if (Platform.OS !== 'ios' || !imageIdentifier?.trim()) return
    let active = true
    const load = async () => {
      const { uri } = await Images.load({ imageIdentifier }, 'medium')
      const file = new File(uri)
      let data = ''
      // ponytail: keep artwork in memory; discard the SDK's temporary file.
      try {
        if (active) data = await file.base64()
      } finally {
        file.delete()
      }
      if (active) setArt({ id: imageIdentifier, data })
    }
    void load().catch(() => {
      if (active) setArt({ id: imageIdentifier, data: null })
    })
    return () => {
      active = false
    }
  }, [imageIdentifier])
  const result = art?.id === imageIdentifier ? art : null
  const style = [styles.spotifyArtwork, { width: size, height: size }]
  if (result?.data) {
    return (
      <Image
        accessibilityLabel={label}
        source={{ uri: `data:image/png;base64,${result.data}` }}
        resizeMode="contain"
        style={style}
        onError={() =>
          setArt((value) =>
            value && value.id === imageIdentifier
              ? { ...value, data: null }
              : value,
          )
        }
      />
    )
  }
  return (
    <View
      accessible
      accessibilityLabel={`${label}, ${result ? 'unavailable' : imageIdentifier ? 'loading' : 'not provided'}`}
      style={[...style, { backgroundColor: theme.homeSurface }]}
    >
      {imageIdentifier && !result ? (
        <ActivityIndicator color={theme.subtitleText} />
      ) : result ? (
        <Text style={[Typography.labelSm, { color: theme.subtitleText }]}>
          No art
        </Text>
      ) : (
        <Ionicons
          name="musical-notes-outline"
          size={24}
          color={theme.subtitleText}
        />
      )}
    </View>
  )
}

function LiftingDay({
  day,
  dateKey,
  log,
  focus,
  onToggleFocus,
  onRest,
}: {
  day: LiftingWorkout
  dateKey: string
  log: GymDayLog | undefined
  focus: boolean
  onToggleFocus: () => void
  onRest: OnRest
}) {
  const theme = useTheme()
  const count = day.exercises.length
  // ponytail: the day can finish once its final exercise has a set; the rating
  // is then a full-screen page after the last exercise (index === count).
  const canFinish = Boolean(
    log?.finishedAt || log?.sets[day.exercises.at(-1)?.id ?? '']?.length,
  )
  const [active, setActive] = useState(log?.finishedAt ? count : 0)
  const exercise = day.exercises[active]
  const move = (step: number) => {
    const next = Math.min(count, Math.max(0, active + step))
    if (next === active) return
    setActive(next)
    AccessibilityInfo.announceForAccessibility(
      next === count
        ? 'Rate this workout'
        : `Exercise ${next + 1}: ${day.exercises[next].title}`,
    )
  }
  return (
    <>
      {!focus && (
        <View style={styles.titleRow}>
          <Text
            style={[Typography.headingSm, styles.flex, { color: theme.text }]}
          >
            {day.title}
          </Text>
          {'videoURL' in day && (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Watch ${day.title} video`}
              onPress={() => {
                Linking.openURL(day.videoURL).catch(() =>
                  Alert.alert("Couldn't open the video"),
                )
              }}
              hitSlop={8}
            >
              <Ionicons
                name="play-circle-outline"
                size={32}
                color={theme.goalComplete}
              />
            </Pressable>
          )}
        </View>
      )}
      {count === 0 ? (
        <View style={styles.block}>
          <Text style={[Typography.bodyMd, { color: theme.text }]}>
            Active rest day. Cardio only.
          </Text>
        </View>
      ) : exercise === undefined ? (
        <FinishCard dateKey={dateKey} log={log} onBack={() => move(-1)} />
      ) : (
        <ExerciseFocus
          key={exercise.id}
          index={active}
          total={count}
          hasNext={active < count - 1 || canFinish}
          exercise={exercise}
          dateKey={dateKey}
          day={day.day}
          logged={log?.sets[exercise.id] ?? []}
          locked={Boolean(log?.finishedAt)}
          focus={focus}
          onToggleFocus={onToggleFocus}
          onRest={onRest}
          onMove={move}
        />
      )}
    </>
  )
}

const formatKg = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1)

const shortDate = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })

function ExerciseFocus({
  index,
  total,
  hasNext,
  exercise,
  dateKey,
  day,
  logged,
  locked,
  focus,
  onToggleFocus,
  onRest,
  onMove,
}: {
  index: number
  total: number
  hasNext: boolean
  exercise: ProgrammeExercise | FiveByFiveExercise
  dateKey: string
  day: string
  logged: LoggedSet[]
  locked: boolean
  focus: boolean
  onToggleFocus: () => void
  onRest: OnRest
  onMove: (step: number) => void
}) {
  const theme = useTheme()
  const logSet = useGymLogStore((s) => s.logSet)
  const removeLastSet = useGymLogStore((s) => s.removeLastSet)
  const logs = useGymLogStore((s) => s.logs)
  const [panel, setPanel] = useState<'previous' | 'max' | null>(null)
  const [reps, setReps] = useState(String(exercise.reps))
  const [counting, setCounting] = useState(false)
  const history = useMemo(
    () => exerciseHistory(logs, exercise.title, dateKey),
    [logs, exercise.title, dateKey],
  )
  const next =
    'increment' in exercise
      ? nextWeight(
          history.filter((session) => session.dateKey < dateKey),
          exercise,
        )
      : null
  const [kg, setKg] = useState(() => {
    // A saved null is body weight; only suggest a load before the first set.
    const last = logged.length ? logged.at(-1)?.kilograms : next?.kilograms
    return last == null ? '' : String(last)
  })

  const entry = {
    reps: reps.trim() === '' ? Number.NaN : Number(reps),
    kilograms: kg.trim() === '' ? null : Number(kg.replace(',', '.')),
  }
  const valid = isValidSet(entry)
  const target = typeof exercise.sets === 'number' ? exercise.sets : null
  const planned = target ?? FAILURE_ROWS
  const circleCount = Math.max(planned, logged.length + (locked ? 0 : 1))
  const setBand = locked
    ? `${logged.length} ${logged.length === 1 ? 'set' : 'sets'} logged`
    : target !== null && logged.length >= target
      ? `All ${target} sets done`
      : `Set: ${logged.length + 1}${target ? ` of ${target}` : ''}`
  const togglePanel = (next: 'previous' | 'max') =>
    setPanel((current) => (current === next ? null : next))

  return (
    <View
      testID={`gym-exercise-${exercise.id}`}
      style={[styles.card, styles.grow, { borderColor: theme.goalTrack }]}
    >
      <View style={[styles.focusHeader, { backgroundColor: theme.goalTrack }]}>
        <View style={[styles.badge, { backgroundColor: theme.goalComplete }]}>
          <Text style={[styles.badgeText, { color: theme.goalOnComplete }]}>
            {index + 1}
          </Text>
        </View>
        <View style={styles.flex}>
          <Text style={[styles.focusTitle, { color: theme.text }]}>
            {exercise.title}
          </Text>
          <Text style={[styles.mono, { color: theme.subtitleText }]}>
            {target ? `Target sets: ${target}` : 'Sets: to failure'}
          </Text>
          <Text style={[styles.mono, { color: theme.subtitleText }]}>
            {target
              ? `${target * exercise.reps} total reps`
              : `${exercise.reps} reps per set`}
          </Text>
        </View>
        <Pressable
          testID="gym-focus-toggle"
          accessibilityRole="button"
          accessibilityLabel={focus ? 'Exit full screen' : 'Full screen'}
          onPress={onToggleFocus}
          hitSlop={8}
        >
          <Ionicons
            name={focus ? 'contract-outline' : 'expand-outline'}
            size={24}
            color={theme.text}
          />
        </Pressable>
        <ExerciseInfoButton title={exercise.title} />
      </View>
      <View style={[styles.setBand, { backgroundColor: theme.goalComplete }]}>
        <Text
          style={[styles.mono, styles.bold, { color: theme.goalOnComplete }]}
        >
          {setBand}
        </Text>
      </View>

      <View style={[styles.cardBody, styles.grow]}>
        {!locked && 'increment' in exercise && (
          <NextWeightInsight next={next} exercise={exercise} />
        )}
        {!locked && (
          <View style={styles.entryRow}>
            <View style={[styles.flex, styles.entryTarget]}>
              <Text style={[styles.mono, { color: theme.text }]}>
                Target reps: {exercise.reps}
              </Text>
              <View style={[styles.chip, { backgroundColor: theme.goalTrack }]}>
                <Text
                  numberOfLines={2}
                  style={[
                    styles.mono,
                    styles.chipText,
                    { color: theme.subtitleText },
                  ]}
                >
                  {exercise.variation ?? 'Standard set'}
                </Text>
              </View>
            </View>
            <EntryBox
              testID={`gym-kg-${exercise.id}`}
              accessibilityLabel={`${exercise.title} weight in kilograms`}
              value={kg}
              onChangeText={setKg}
              keyboardType="decimal-pad"
              placeholder="BW"
              label="kg"
            />
            <Text style={[styles.times, { color: theme.subtitleText }]}>×</Text>
            <EntryBox
              testID={`gym-reps-${exercise.id}`}
              accessibilityLabel={`${exercise.title} reps`}
              value={reps}
              onChangeText={setReps}
              keyboardType="number-pad"
              placeholder="--"
              label="reps"
            />
          </View>
        )}

        <View style={styles.circles}>
          {Array.from({ length: circleCount }, (_, i) => {
            const set = logged[i]
            if (set) {
              const weight =
                set.kilograms === null ? null : formatKg(set.kilograms)
              return (
                <SetCircle
                  key={i}
                  testID={`gym-set-${exercise.id}-${i + 1}`}
                  tone="done"
                  label={String(set.reps)}
                  caption={weight ?? 'BW'}
                  accessibilityLabel={`Set ${i + 1}: ${set.reps} reps × ${weight === null ? 'body weight' : `${weight} kg`}`}
                />
              )
            }
            if (i === logged.length && !locked)
              return (
                <SetCircle
                  key={i}
                  testID={`gym-save-set-${exercise.id}`}
                  tone="next"
                  label={i < planned ? reps.trim() || '--' : '+'}
                  accessibilityLabel={`Log set ${i + 1}`}
                  disabled={!valid}
                  onPress={() => {
                    logSet(dateKey, day, exercise.id, entry)
                    onRest(exercise, entry)
                    // The last planned set moves on; extra "+" sets stay put.
                    if (i + 1 === planned) onMove(1)
                  }}
                />
              )
            return (
              <SetCircle
                key={i}
                tone="todo"
                label={String(exercise.reps)}
                accessibilityLabel={`Set ${i + 1}: target ${exercise.reps} reps`}
              />
            )
          })}
        </View>
        {!locked && !valid && (
          <Text style={[Typography.bodySm, { color: theme.danger }]}>
            Reps 1-{MAX_REPS}. Weight above 0 kg, or blank for body weight.
          </Text>
        )}
        {!locked && logged.length > 0 && (
          <Pressable
            testID={`gym-undo-set-${exercise.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Undo set ${logged.length}`}
            onPress={() => {
              removeLastSet(dateKey, exercise.id)
              onRest(exercise, null)
            }}
            hitSlop={8}
            style={styles.undo}
          >
            <Ionicons
              name="arrow-undo-outline"
              size={14}
              color={theme.subtitleText}
            />
            <Text style={[styles.mono, { color: theme.subtitleText }]}>
              Undo set {logged.length}
            </Text>
          </Pressable>
        )}
      </View>

      {panel === 'previous' && (
        <PreviousPanel
          session={history.filter((s) => s.dateKey < dateKey).at(-1)}
        />
      )}
      {panel === 'max' && (
        <OneRepMaxPanel
          history={history}
          today={history.find((s) => s.dateKey === dateKey)?.oneRepMax ?? null}
        />
      )}

      <View style={[styles.toolbar, { borderTopColor: theme.goalTrack }]}>
        <ToolButton
          icon="chevron-back"
          label="Back"
          accessibilityLabel="Previous exercise"
          disabled={index === 0}
          onPress={() => onMove(-1)}
        />
        <ToolButton
          icon="time-outline"
          label="Last time"
          active={panel === 'previous'}
          onPress={() => togglePanel('previous')}
        />
        <ToolButton
          icon="stats-chart-outline"
          label="1 rep max"
          active={panel === 'max'}
          onPress={() => togglePanel('max')}
        />
        {repCameraAvailable && !locked && (
          <ToolButton
            icon="body-outline"
            label="Count"
            accessibilityLabel="Count reps with the camera"
            onPress={() => setCounting(true)}
          />
        )}
        <ToolButton
          icon="chevron-forward"
          label={`${index + 1}/${total}`}
          accessibilityLabel="Next exercise"
          disabled={!hasNext}
          onPress={() => onMove(1)}
        />
      </View>
      {counting && (
        <RepCameraCounter
          title={exercise.title}
          onCount={(n) => {
            setReps(String(n))
            setCounting(false)
          }}
          onClose={() => setCounting(false)}
        />
      )}
    </View>
  )
}

function EntryBox({
  label,
  ...input
}: {
  label: string
  testID: string
  accessibilityLabel: string
  value: string
  onChangeText: (value: string) => void
  keyboardType: 'decimal-pad' | 'number-pad'
  placeholder: string
}) {
  const theme = useTheme()
  return (
    <View style={styles.entry}>
      <TextInput
        {...input}
        maxLength={6}
        placeholderTextColor={theme.subtitleText}
        style={[
          styles.entryInput,
          { color: theme.text, borderColor: theme.goalTrack },
        ]}
      />
      <Text
        style={[styles.mono, styles.entryLabel, { color: theme.subtitleText }]}
      >
        {label}
      </Text>
    </View>
  )
}

function SetCircle({
  tone,
  label,
  caption = ' ',
  accessibilityLabel,
  testID,
  disabled = false,
  onPress,
}: {
  tone: 'done' | 'next' | 'todo'
  label: string
  caption?: string
  accessibilityLabel: string
  testID?: string
  disabled?: boolean
  onPress?: () => void
}) {
  const theme = useTheme()
  const done = tone === 'done'
  return (
    <Pressable
      testID={testID}
      accessible
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      disabled={onPress ? disabled : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.circleSlot,
        {
          opacity:
            tone === 'todo' || disabled ? 0.4 : pressed && onPress ? 0.7 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.circle,
          {
            backgroundColor: done ? theme.goalComplete : 'transparent',
            borderColor: tone === 'todo' ? theme.goalTrack : theme.goalComplete,
          },
        ]}
      >
        <Text
          style={[
            styles.circleText,
            { color: done ? theme.goalOnComplete : theme.text },
          ]}
        >
          {label}
        </Text>
      </View>
      <Text
        numberOfLines={1}
        style={[styles.mono, styles.caption, { color: theme.subtitleText }]}
      >
        {caption}
      </Text>
    </Pressable>
  )
}

function ToolButton({
  icon,
  label,
  onPress,
  active = false,
  disabled = false,
  accessibilityLabel,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name']
  label: string
  onPress: () => void
  active?: boolean
  disabled?: boolean
  accessibilityLabel?: string
}) {
  const theme = useTheme()
  const color = active ? theme.goalComplete : theme.subtitleText
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.tool, { opacity: disabled ? 0.35 : 1 }]}
    >
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.mono, styles.toolLabel, { color }]}>{label}</Text>
    </Pressable>
  )
}

function PreviousPanel({ session }: { session: ExerciseSession | undefined }) {
  const theme = useTheme()
  return (
    <View style={[styles.panel, { borderTopColor: theme.goalTrack }]}>
      <Text style={[styles.mono, styles.bold, { color: theme.text }]}>
        Last time{session ? ` · ${shortDate(session.dateKey)}` : ''}
      </Text>
      {session ? (
        session.sets.map((set, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={[styles.mono, { color: theme.subtitleText }]}>
              Set {pad(i + 1)}
            </Text>
            <Text style={[styles.mono, { color: theme.text }]}>
              {set.reps} ×{' '}
              {set.kilograms === null ? 'BW' : `${formatKg(set.kilograms)} kg`}
            </Text>
          </View>
        ))
      ) : (
        <Text style={[Typography.bodySm, { color: theme.subtitleText }]}>
          No earlier session for this exercise.
        </Text>
      )}
    </View>
  )
}

function OneRepMaxPanel({
  history,
  today,
}: {
  history: ExerciseSession[]
  today: number | null
}) {
  const theme = useTheme()
  const points = history
    .filter(
      (s): s is ExerciseSession & { oneRepMax: number } => s.oneRepMax !== null,
    )
    .slice(-6)
  const top = Math.max(1, ...points.map((p) => p.oneRepMax))
  return (
    <View
      testID="gym-one-rep-max"
      style={[styles.panel, { borderTopColor: theme.goalTrack }]}
    >
      <Text style={[styles.mono, styles.bold, { color: theme.text }]}>
        Calculated one rep max{' '}
        <Text style={{ color: theme.goalComplete }}>
          | {today === null ? '--' : `${formatKg(today)} kg`}
        </Text>
      </Text>
      {points.length === 0 ? (
        <Text style={[Typography.bodySm, { color: theme.subtitleText }]}>
          Save a weighted set to estimate your one rep max.
        </Text>
      ) : (
        <>
          <View style={styles.chart}>
            {points.map((p) => (
              <View
                key={p.dateKey}
                accessible
                accessibilityLabel={`${shortDate(p.dateKey)}: ${formatKg(p.oneRepMax)} kg`}
                style={styles.barColumn}
              >
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${(p.oneRepMax / top) * 100}%`,
                        backgroundColor: theme.goalComplete,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.barValue, { color: theme.goalOnComplete }]}
                    >
                      {Math.round(p.oneRepMax)}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.mono,
                    styles.toolLabel,
                    { color: theme.subtitleText },
                  ]}
                >
                  {shortDate(p.dateKey)}
                </Text>
              </View>
            ))}
          </View>
          {[...points].reverse().map((p) => (
            <View
              key={p.dateKey}
              style={[styles.tableRow, { borderTopColor: theme.goalTrack }]}
            >
              <Text style={[styles.mono, { color: theme.subtitleText }]}>
                {shortDate(p.dateKey)}
              </Text>
              <Text style={[styles.mono, { color: theme.text }]}>
                {formatKg(p.oneRepMax)} kg
              </Text>
            </View>
          ))}
          <Text
            style={[
              styles.mono,
              styles.toolLabel,
              { color: theme.subtitleText },
            ]}
          >
            Epley estimate from your best weighted set
          </Text>
        </>
      )}
    </View>
  )
}

function FinishCard({
  dateKey,
  log,
  onBack,
}: {
  dateKey: string
  log: GymDayLog | undefined
  onBack: () => void
}) {
  const theme = useTheme()
  const finishWorkout = useGymLogStore((s) => s.finishWorkout)
  const [rating, setRating] = useState(7)
  const setCount = Object.values(log?.sets ?? {}).reduce(
    (sum, sets) => sum + sets.length,
    0,
  )
  const finished = log?.finishedAt ? new Date(log.finishedAt) : null

  return (
    <View style={[styles.card, styles.grow, { borderColor: theme.goalTrack }]}>
      <View style={[styles.cardBody, styles.grow, styles.finishBody]}>
        {finished ? (
          <View
            testID="gym-finished"
            style={[styles.block, { backgroundColor: theme.goalComplete }]}
          >
            <Text style={[styles.mono, { color: theme.goalOnComplete }]}>
              Finished{' '}
              {finished.toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: '2-digit',
              })}{' '}
              · {setCount} {setCount === 1 ? 'set' : 'sets'} · rated{' '}
              {log?.rating}/10
            </Text>
          </View>
        ) : (
          <>
            <View style={[styles.grow, styles.finishBody]}>
              <Text style={[styles.mono, styles.center, { color: theme.text }]}>
                Rate this workout
              </Text>
              <View style={styles.center}>
                <Stepper
                  label="Rating"
                  value={rating}
                  onChange={(next) =>
                    setRating(Math.min(10, Math.max(1, next)))
                  }
                />
              </View>
            </View>
            <View style={styles.row}>
              <ActionButton
                testID="gym-finish"
                label="Finish workout"
                onPress={() =>
                  finishWorkout(dateKey, { rating, finishedAt: new Date() })
                }
              />
            </View>
          </>
        )}
      </View>
      <View style={[styles.toolbar, { borderTopColor: theme.goalTrack }]}>
        <ToolButton
          icon="chevron-back"
          label="Back"
          accessibilityLabel="Previous exercise"
          onPress={onBack}
        />
      </View>
    </View>
  )
}

function NextWeightInsight({
  next,
  exercise,
}: {
  next: NextWeight | null
  exercise: FiveByFiveExercise
}) {
  const theme = useTheme()
  const scheme = `${exercise.sets}×${exercise.reps}`
  const [icon, text] = !next
    ? (['barbell-outline', `First ${scheme} · start light`] as const)
    : next.reason === 'up'
      ? ([
          'trending-up-outline',
          `Next ${formatKg(next.kilograms)} kg · +${formatKg(exercise.increment)} kg after a full ${scheme}`,
        ] as const)
      : next.reason === 'repeat'
        ? ([
            'repeat-outline',
            `Repeat ${formatKg(next.kilograms)} kg after missed reps`,
          ] as const)
        : ([
            'trending-down-outline',
            `Deload to ${formatKg(next.kilograms)} kg after 3 misses`,
          ] as const)
  return (
    <View testID="gym-next-weight" accessible style={styles.insight}>
      <Ionicons name={icon} size={18} color={theme.goalComplete} />
      <Text style={[styles.mono, styles.flex, { color: theme.text }]}>
        {text}
      </Text>
    </View>
  )
}

function Band({ title }: { title: string }) {
  const theme = useTheme()
  return (
    <View
      accessibilityRole="header"
      style={[styles.band, { borderBottomColor: theme.goalComplete }]}
    >
      <Text style={[styles.mono, { color: theme.text }]}>{title}</Text>
    </View>
  )
}

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (next: number) => void
}) {
  const theme = useTheme()
  const button = (icon: 'add' | 'remove') => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${icon === 'add' ? 'Increase' : 'Decrease'} ${label.toLowerCase()}`}
      onPress={() => onChange(value + (icon === 'add' ? 1 : -1))}
      style={[styles.stepButton, { borderColor: theme.goalTrack }]}
    >
      <Ionicons name={icon} size={18} color={theme.text} />
    </Pressable>
  )
  return (
    <View style={styles.stepper}>
      {button('remove')}
      <View
        accessible
        accessibilityLabel={`${label} ${value}`}
        style={styles.stepValue}
      >
        <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
        <Text style={[styles.mono, { color: theme.subtitleText }]}>
          {label}
        </Text>
      </View>
      {button('add')}
    </View>
  )
}

function ActionButton({
  label,
  onPress,
  disabled = false,
  testID,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  testID?: string
}) {
  const theme = useTheme()
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: disabled ? theme.goalTrack : theme.goalComplete,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.mono,
          { color: disabled ? theme.subtitleText : theme.goalOnComplete },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.gutter,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
    flexGrow: 1,
  },
  focusContent: { paddingVertical: Spacing.sm },
  grow: { flexGrow: 1 },
  flex: { flex: 1 },
  center: { alignSelf: 'center', textAlign: 'center' },
  mono: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontVariant: ['tabular-nums'],
  },
  band: {
    marginTop: Spacing.xs,
    paddingBottom: Spacing.xxs,
    borderBottomWidth: 2,
  },
  statValue: {
    fontFamily: 'SpaceMono',
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  block: { gap: Spacing.xs, padding: Spacing.sm, borderRadius: Radii.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  insight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  card: { borderWidth: 2, borderRadius: Radii.md, overflow: 'hidden' },
  cardBand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
  },
  cardBody: { padding: Spacing.sm, gap: Spacing.xs },
  finishBody: { justifyContent: 'center', gap: Spacing.md },
  row: { flexDirection: 'row' },
  spotifyDock: {
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.gutter,
    paddingBottom: Spacing.sm,
  },
  spotifyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 72,
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: Radii.panel,
  },
  spotifyOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  spotifySheet: {
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    maxHeight: '90%',
    alignSelf: 'center',
    borderTopLeftRadius: Radii.panel,
    borderTopRightRadius: Radii.panel,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  spotifyList: { flexGrow: 0, flexShrink: 1 },
  spotifyListContent: { gap: Spacing.xs, paddingBottom: Spacing.xs },
  spotifyListHeader: { gap: Spacing.md },
  spotifyBrowseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.sm,
  },
  spotifyContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  spotifyContentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: Layout.controlSize,
    paddingVertical: Spacing.xs,
  },
  spotifySheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spotifyClose: {
    width: Layout.controlSize,
    height: Layout.controlSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotifyTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 72,
  },
  spotifyArtwork: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotifyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  spotifyControl: {
    width: 56,
    height: 56,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotifyPlay: {
    width: 72,
    height: 72,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotifyConnect: {
    minHeight: Layout.controlSize,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  // The circles take the card's spare height so the sets sit mid-screen.
  circles: {
    flexGrow: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  circleSlot: {
    flexGrow: 1,
    flexBasis: 48,
    maxWidth: 96,
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  circle: {
    width: '100%',
    aspectRatio: 1,
    borderWidth: 2,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleText: {
    fontFamily: 'SpaceMono',
    fontSize: 24,
    fontVariant: ['tabular-nums'],
  },
  caption: { fontSize: 9, letterSpacing: 0.5 },
  undo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xxs,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  stepButton: {
    width: 38,
    height: 38,
    borderWidth: 2,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { alignItems: 'center', minWidth: 40 },
  action: {
    flex: 1,
    minHeight: Layout.controlSize,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  bold: { fontWeight: '700' },
  focusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: 'SpaceMono', fontSize: 14, fontWeight: '700' },
  focusTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  setBand: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs },
  entryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs },
  entryTarget: { gap: Spacing.xxs },
  chip: {
    alignSelf: 'flex-start',
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
  },
  chipText: { fontSize: 10 },
  entry: { alignItems: 'center', gap: 2 },
  entryInput: {
    width: 64,
    height: 44,
    borderWidth: 2,
    borderRadius: Radii.sm,
    textAlign: 'center',
    fontFamily: 'SpaceMono',
    fontSize: 18,
  },
  entryLabel: { fontSize: 9 },
  times: { fontFamily: 'SpaceMono', fontSize: 18, lineHeight: 44 },
  toolbar: { flexDirection: 'row', borderTopWidth: 2 },
  tool: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  toolLabel: { fontSize: 9, letterSpacing: 0.8 },
  panel: {
    padding: Spacing.sm,
    gap: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  chart: { flexDirection: 'row', gap: Spacing.xs, height: 128 },
  barColumn: { flex: 1, alignItems: 'center', gap: Spacing.xxs },
  barTrack: { flex: 1, width: '70%', justifyContent: 'flex-end' },
  bar: {
    minHeight: 18,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    alignItems: 'center',
    paddingTop: 2,
  },
  barValue: { fontFamily: 'SpaceMono', fontSize: 10 },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.xxs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
})
