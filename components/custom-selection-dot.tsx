import React, { useCallback } from 'react'
import type { SelectionDotProps } from 'react-native-graph'
import {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'

import { Circle } from '@shopify/react-native-skia'

export function SelectionDot({
  isActive,
  color,
  circleX,
  circleY,
}: SelectionDotProps) {
  const circleRadius = useSharedValue(0)

  const setIsActive = useCallback(
    (active: boolean) => {
      circleRadius.value = withSpring(active ? 5 : 0, {
        mass: 1,
        stiffness: 1000,
        damping: 50,
        velocity: 0,
      })
    },
    [circleRadius]
  )

  useAnimatedReaction(
    () => isActive.value,
    (active) => {
      runOnJS(setIsActive)(active)
    },
    [isActive, setIsActive]
  )

  return <Circle cx={circleX} cy={circleY} r={circleRadius} color={color} />
}
