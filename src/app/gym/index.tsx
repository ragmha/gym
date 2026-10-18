import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import Animated from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ScreenHeader } from '@/components/common/ScreenHeader'
import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { DoneButton, GoalTileSurface } from '@/components/dashboard/GoalGrid'
import type { GoalMascotKind } from '@/components/dashboard/GoalMascot'
import {
  cardioSummary,
  foodSummary,
  liftingSummary,
  stairmasterSummary,
  weightSummary,
  type ActivitySummary,
  type GymActivity,
} from '@/components/gym/activities'
import {
  sortByOrder,
  useTileReorder,
} from '@/components/dashboard/useTileReorder'
import { HealthDateRoute } from '@/components/health/HealthDateRoute'
import { Layout, Spacing, Typography } from '@/constants/DesignSystem'
import { useColorScheme } from '@/hooks/useColorScheme'
import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'
import { useTheme } from '@/hooks/useThemeColor'
import { findProgrammeDay, programmeDayFor } from '@/lib/gymProgramme'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import { useGymLogStore } from '@/stores/GymLogStore'
import { useThemeStore } from '@/stores/ThemeStore'

const MAX_TILE = 168

export default function GymScreen() {
  return <HealthDateRoute>{(date) => <GymHub date={date} />}</HealthDateRoute>
}

function GymHub({ date }: { date: Date }) {
  const theme = useTheme()
  const colorScheme = useColorScheme()
  const router = useRouter()
  const dateKey = localDateKey(date)
  const { snapshot, isDemoMode } = useHealthSnapshot(date)
  const programmeStart = useGymLogStore((s) => s.programmeStart)
  const log = useGymLogStore((s) => s.logs[dateKey])
  const gymTileOrder = useThemeStore((s) => s.gymTileOrder)
  const setGymTileOrder = useThemeStore((s) => s.setGymTileOrder)
  const foodGoalKcal = useThemeStore((s) => s.foodGoalKcal)
  const [grid, setGrid] = useState({ width: 0, height: 0 })
  const [editing, setEditing] = useState(false)

  const scheduled =
    !log && programmeStart ? programmeDayFor(programmeStart, dateKey) : null
  const day = log
    ? findProgrammeDay(log.day)
    : scheduled && 'day' in scheduled
      ? scheduled.day
      : null

  const defaultTiles: {
    id: GymActivity
    label: string
    icon: GoalMascotKind
    summary: ActivitySummary
  }[] = [
    {
      id: 'stairmaster',
      label: 'Stairmaster',
      icon: 'stairs',
      summary: stairmasterSummary(snapshot),
    },
    {
      id: 'cardio',
      label: 'Cardio',
      icon: 'cardio',
      summary: cardioSummary(snapshot),
    },
    {
      id: 'lifting',
      label: 'Lifting',
      icon: 'lift',
      summary: liftingSummary(day, log, snapshot),
    },
    {
      id: 'weight',
      label: 'Weight',
      icon: 'weight',
      summary: weightSummary(snapshot, date),
    },
    {
      id: 'food',
      label: 'Food',
      icon: 'food',
      summary: foodSummary(snapshot, foodGoalKcal),
    },
  ]
  const tiles = sortByOrder(defaultTiles, gymTileOrder, (tile) => tile.id)
  const tileSize = Math.max(0, Math.min(grid.width / 2 - Spacing.md, MAX_TILE))
  const { drag, preview, ghostStyle, gesture, moveActions, wiggle } =
    useTileReorder({
      items: tiles,
      keyOf: (tile) => tile.id,
      save: setGymTileOrder,
      tileSize,
      editing,
      onEdit: () => setEditing(true),
    })
  const rows = Math.ceil(tiles.length / 2)
  const stride = (grid.height + Spacing.lg) / rows
  const slotAt = ({ x, y }: { x: number; y: number }) =>
    Math.max(0, Math.min(rows - 1, Math.floor(y / stride))) * 2 +
    (x < grid.width / 2 ? 0 : 1)

  return (
    <SafeAreaView
      testID="gym-screen"
      style={[styles.container, { backgroundColor: theme.homeBackground }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ScreenHeader
        title="Gym"
        subtitle={date.toLocaleDateString(undefined, {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
        action={
          editing ? <DoneButton onPress={() => setEditing(false)} /> : null
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        scrollEnabled={!drag}
      >
        {isDemoMode && (
          <Text style={[Typography.bodySm, { color: theme.subtitleText }]}>
            Demo data - Apple Health is available on iOS.
          </Text>
        )}
        <View>
          <GestureDetector gesture={gesture('gym-reorder', slotAt)}>
            <View
              testID="gym-grid"
              style={styles.grid}
              onLayout={({ nativeEvent }) =>
                setGrid({
                  width: nativeEvent.layout.width,
                  height: nativeEvent.layout.height,
                })
              }
            >
              {tiles.map((tile, index) => {
                const at = preview.indexOf(tile)
                return (
                  <Pressable
                    key={tile.id}
                    testID={`gym-tile-${tile.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${tile.label}, ${tile.summary.caption === '--' ? 'no data' : tile.summary.caption}`}
                    accessibilityHint={`Opens ${tile.label.toLowerCase()} details.`}
                    {...moveActions(index, tile.label)}
                    onPress={() => {
                      if (editing) return
                      router.push({
                        pathname: `/gym/${tile.id}`,
                        params: { date: dateKey },
                      })
                    }}
                    style={({ pressed }) => [
                      styles.cell,
                      {
                        opacity: drag?.from === index ? 0 : pressed ? 0.7 : 1,
                      },
                      at !== index && {
                        // Preview by transform so the touched view never moves in the tree.
                        transform: [
                          {
                            translateX:
                              ((at % 2) - (index % 2)) * (grid.width / 2),
                          },
                          {
                            translateY:
                              (Math.floor(at / 2) - Math.floor(index / 2)) *
                              stride,
                          },
                        ],
                      },
                    ]}
                  >
                    <Animated.View style={wiggle(index)}>
                      <GoalTileSurface
                        id={`gym-${tile.id}`}
                        icon={tile.icon}
                        size={tileSize}
                        progress={tile.summary.progress}
                        done={tile.summary.done}
                      />
                    </Animated.View>
                    <Text
                      numberOfLines={1}
                      style={[styles.label, { color: theme.text }]}
                    >
                      {tile.label}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.caption,
                        {
                          color:
                            tile.summary.progress !== null &&
                            tile.summary.progress > 0
                              ? theme.goalProgressText
                              : theme.subtitleText,
                        },
                      ]}
                    >
                      {tile.summary.caption}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </GestureDetector>
          {drag && (
            <Animated.View
              testID="gym-drag-ghost"
              style={[styles.ghost, ghostStyle]}
            >
              <GoalTileSurface
                id="gym-dragging"
                icon={tiles[drag.from].icon}
                size={tileSize}
                progress={tiles[drag.from].summary.progress}
                done={tiles[drag.from].summary.done}
              />
            </Animated.View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: Layout.gutter,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.lg },
  ghost: { position: 'absolute', left: 0, top: 0, pointerEvents: 'none' },
  cell: { width: '50%', alignItems: 'center', gap: Spacing.xxs },
  label: {
    fontFamily: 'SpaceMono',
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: Spacing.xs,
  },
  caption: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontVariant: ['tabular-nums'],
  },
})
