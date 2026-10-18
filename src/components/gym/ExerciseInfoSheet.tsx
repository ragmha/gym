import { Ionicons } from '@expo/vector-icons'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Layout, Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'
import {
  exerciseInfoId,
  fetchExerciseInfo,
  youtubeSearchUrl,
  type ExerciseInfo,
} from '@/lib/gymProgramme/exerciseInfo'

type Load =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; info: ExerciseInfo }

/** Info button plus a sheet that shows how to perform the exercise. */
export function ExerciseInfoButton({ title }: { title: string }) {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  return (
    <>
      <Pressable
        testID="gym-exercise-info"
        accessibilityRole="button"
        accessibilityLabel={`How to do ${title}`}
        onPress={() => setOpen(true)}
        hitSlop={8}
      >
        <Ionicons
          name="information-circle-outline"
          size={28}
          color={theme.text}
        />
      </Pressable>
      {open && (
        <ExerciseInfoSheet title={title} onClose={() => setOpen(false)} />
      )}
    </>
  )
}

function ExerciseInfoSheet({
  title,
  onClose,
}: {
  title: string
  onClose: () => void
}) {
  const theme = useTheme()
  const id = exerciseInfoId(title)
  const [attempt, setAttempt] = useState(0)
  const [load, setLoad] = useState<Load>({ status: 'loading' })

  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    setLoad({ status: 'loading' })
    fetchExerciseInfo(id, controller.signal).then(
      (info) => setLoad({ status: 'ready', info }),
      () => {
        if (!controller.signal.aborted) setLoad({ status: 'error' })
      },
    )
    return () => controller.abort()
  }, [id, attempt])

  const facts =
    load.status === 'ready'
      ? (
          [
            ['Target', load.info.targetMuscles],
            ['Also works', load.info.secondaryMuscles],
            ['Equipment', load.info.equipments],
          ] as const
        ).filter(([, values]) => values.length > 0)
      : []

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        testID="gym-exercise-info-sheet"
        style={[styles.sheet, { backgroundColor: theme.homeBackground }]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, styles.flex, { color: theme.text }]}>
            {title}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            hitSlop={8}
          >
            <Ionicons name="close" size={28} color={theme.text} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          {!id ? (
            <Text style={[Typography.bodyMd, { color: theme.subtitleText }]}>
              No animation for this exercise yet.
            </Text>
          ) : load.status === 'loading' ? (
            <View style={[styles.media, styles.centered]}>
              <ActivityIndicator color={theme.goalComplete} />
            </View>
          ) : load.status === 'error' ? (
            <View style={styles.centered}>
              <Text style={[Typography.bodyMd, { color: theme.text }]}>
                Couldn&apos;t load the demo.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setAttempt((n) => n + 1)}
                style={styles.retry}
              >
                <Text style={[styles.mono, { color: theme.goalComplete }]}>
                  Try again
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Image
                testID="gym-exercise-info-media"
                source={{ uri: load.info.gifUrl }}
                accessibilityLabel={`${load.info.name} demonstration`}
                resizeMode="contain"
                style={styles.media}
              />
              <Text style={[styles.mono, { color: theme.subtitleText }]}>
                Shown: {load.info.name}
              </Text>
              {facts.map(([label, values]) => (
                <View key={label} style={styles.fact}>
                  <Text style={[styles.mono, { color: theme.subtitleText }]}>
                    {label}
                  </Text>
                  <Text
                    style={[
                      Typography.bodyMd,
                      styles.capitalise,
                      { color: theme.text },
                    ]}
                  >
                    {values.join(', ')}
                  </Text>
                </View>
              ))}
              {load.info.instructions.map((step, i) => (
                <View key={i} style={styles.step}>
                  <Text style={[styles.mono, { color: theme.goalComplete }]}>
                    {String(i + 1).padStart(2, '0')}
                  </Text>
                  <Text
                    style={[
                      Typography.bodyMd,
                      styles.flex,
                      { color: theme.text },
                    ]}
                  >
                    {step}
                  </Text>
                </View>
              ))}
              <Text
                style={[
                  styles.mono,
                  styles.credit,
                  { color: theme.subtitleText },
                ]}
              >
                Demo: ExerciseDB
              </Text>
            </>
          )}
          <Pressable
            accessibilityRole="link"
            onPress={() =>
              Linking.openURL(youtubeSearchUrl(title)).catch(() =>
                Alert.alert("Couldn't open YouTube"),
              )
            }
            style={[styles.youtube, { borderColor: theme.goalTrack }]}
          >
            <Ionicons name="logo-youtube" size={20} color={theme.text} />
            <Text style={[styles.mono, { color: theme.text }]}>
              Watch on YouTube
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Layout.gutter,
  },
  title: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  content: {
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.gutter,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  mono: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  // ExerciseDB animations are drawn on white.
  media: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radii.md,
    backgroundColor: '#FFFFFF',
  },
  centered: { alignItems: 'center', justifyContent: 'center', gap: Spacing.xs },
  retry: { padding: Spacing.sm },
  fact: { gap: 2 },
  capitalise: { textTransform: 'capitalize' },
  step: { flexDirection: 'row', gap: Spacing.sm },
  credit: { fontSize: 9, alignSelf: 'flex-end' },
  youtube: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: Layout.controlSize,
    borderWidth: 2,
    borderRadius: Radii.sm,
  },
})
