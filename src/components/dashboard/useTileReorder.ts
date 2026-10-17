import { ImpactFeedbackStyle, impactAsync } from 'expo-haptics'
import { useRef, useState } from 'react'
import {
  AccessibilityInfo,
  type AccessibilityActionEvent,
  type ViewStyle,
} from 'react-native'
import { Gesture } from 'react-native-gesture-handler'
import {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  type CSSAnimationKeyframes,
  type CSSStyle,
} from 'react-native-reanimated'

export function moveTile<T>(items: T[], from: number, to: number): T[] {
  const next = [...items]
  next.splice(to, 0, ...next.splice(from, 1))
  return next
}

/** Saved keys first, in saved order; unlisted items keep default order after them. */
export function sortByOrder<T>(
  items: T[],
  order: string[],
  keyOf: (item: T) => string,
): T[] {
  const rank = (item: T) => {
    const index = order.indexOf(keyOf(item))
    return index === -1 ? order.length : index
  }
  return [...items].sort((a, b) => rank(a) - rank(b))
}

const WIGGLE: CSSAnimationKeyframes = {
  from: { transform: [{ rotate: '-1.5deg' }] },
  to: { transform: [{ rotate: '1.5deg' }] },
}

interface Point {
  x: number
  y: number
  absoluteX: number
  absoluteY: number
}

/**
 * iPhone-style rearranging: hold a tile to lift it (and enter edit mode),
 * drag to a slot, release to save. Geometry stays with the caller.
 */
export function useTileReorder<T>({
  items,
  keyOf,
  save,
  tileSize,
  editing,
  onEdit,
}: {
  items: T[]
  keyOf: (item: T) => string
  save: (order: string[]) => void
  tileSize: number
  editing: boolean
  onEdit: () => void
}) {
  const reducedMotion = useReducedMotion()
  const [drag, setDrag] = useState<{ from: number; over: number } | null>(null)
  const active = useRef<{ from: number | null; x: number; y: number }>({
    from: null,
    x: 0,
    y: 0,
  })
  const ghostX = useSharedValue(0)
  const ghostY = useSharedValue(0)
  const ghostStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: ghostX.value },
      { translateY: ghostY.value },
      { scale: 1.1 },
    ],
  }))
  const preview = drag ? moveTile(items, drag.from, drag.over) : items
  const last = items.length - 1

  const moveTo = (from: number, to: number) => {
    if (from !== to) save(moveTile(items, from, to).map(keyOf))
  }

  /** `slotAt` hit-tests a gesture point; `onMove` gets the ghost's x in the gesture view. */
  const gesture = (
    testID: string,
    slotAt: (point: Point) => number,
    onMove?: (x: number) => void,
  ) =>
    Gesture.Pan()
      .withTestId(testID)
      .activateAfterLongPress(editing ? 150 : 400)
      .runOnJS(true)
      .onStart((e) => {
        const from = slotAt(e)
        if (from > last) return
        active.current = { from, x: e.absoluteX - e.x, y: e.absoluteY - e.y }
        ghostX.value = e.x - tileSize / 2
        ghostY.value = e.y - tileSize / 2
        setDrag({ from, over: from })
        onEdit()
        impactAsync(ImpactFeedbackStyle.Medium).catch(() => {})
      })
      .onUpdate((e) => {
        const { from, x, y } = active.current
        if (from === null) return
        ghostX.value = e.absoluteX - x - tileSize / 2
        ghostY.value = e.absoluteY - y - tileSize / 2
        const over = Math.min(last, slotAt(e))
        setDrag((d) => (d && d.over !== over ? { ...d, over } : d))
        onMove?.(e.absoluteX - x)
      })
      .onEnd((e, success) => {
        const { from } = active.current
        if (success && from !== null) moveTo(from, Math.min(last, slotAt(e)))
      })
      .onFinalize(() => {
        active.current.from = null
        setDrag(null)
      })

  /** VoiceOver "Move earlier / later" for the tile at `index`. */
  const moveActions = (
    index: number,
    label: string,
    onMoved?: (to: number) => void,
  ) => ({
    accessibilityActions: [
      ...(index > 0 ? [{ name: 'moveEarlier', label: 'Move earlier' }] : []),
      ...(index < last ? [{ name: 'moveLater', label: 'Move later' }] : []),
    ],
    onAccessibilityAction: ({ nativeEvent }: AccessibilityActionEvent) => {
      const to = index + (nativeEvent.actionName === 'moveLater' ? 1 : -1)
      moveTo(index, to)
      onMoved?.(to)
      AccessibilityInfo.announceForAccessibility(
        `${label} moved to position ${to + 1} of ${items.length}`,
      )
    },
  })

  const wiggle = (index: number): CSSStyle<ViewStyle> | undefined =>
    editing && !reducedMotion
      ? {
          animationName: WIGGLE,
          animationDuration: '150ms',
          animationIterationCount: 'infinite',
          animationDirection: index % 2 ? 'alternate-reverse' : 'alternate',
          animationTimingFunction: 'ease-in-out',
        }
      : undefined

  return { drag, preview, ghostStyle, gesture, moveActions, wiggle }
}
