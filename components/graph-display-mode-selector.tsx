import {
  GRAPH_DISPLAY_MODES,
  GraphDisplayMode,
  SCREEN_WIDTH,
} from '@/constants/Graph'
import { useColors } from '@/hooks/use-colors'
import { useCallback, useState } from 'react'
import {
  Easing,
  LayoutChangeEvent,
  StyleSheet,
  View,
  ViewProps,
  Text,
} from 'react-native'
import Reanimated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

import { PressableScale } from 'react-native-pressable-scale'

interface GraphDisplayModeSelectorProps extends ViewProps {
  graphDisplayMode: GraphDisplayMode
  setGraphDisplayMode: (mode: GraphDisplayMode) => void
}

export const SPACING = 5
export const ESTIMATED_BUTTON_WDITH =
  (SCREEN_WIDTH - 50) / GRAPH_DISPLAY_MODES.length

export function GraphDisplayModeSelector({
  graphDisplayMode,
  setGraphDisplayMode,
  style,
  ...props
}: GraphDisplayModeSelectorProps) {
  const colors = useColors()
  const [width, setWidth] = useState(ESTIMATED_BUTTON_WDITH)

  const onLayout = useCallback(
    ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
      setWidth(Math.round(layout.width))
    },
    []
  )

  const buttonWidth = width / GRAPH_DISPLAY_MODES.length - 2 * SPACING

  const selectedModeIndex = GRAPH_DISPLAY_MODES.indexOf(graphDisplayMode)

  const selectionBackgroundStyle = useAnimatedStyle(
    () => ({
      width: buttonWidth,
      opacity: withTiming(selectedModeIndex === -1 ? 0 : 1, {
        easing: Easing.linear,
        duration: 150,
      }),
      transform: [
        {
          translateX: withSpring(
            buttonWidth * selectedModeIndex + 2 * SPACING * selectedModeIndex,
            { mass: 1, stiffness: 900, damping: 300 }
          ),
        },
      ],
    }),
    [buttonWidth, selectedModeIndex]
  )

  return (
    <View {...props} onLayout={onLayout} style={[styles.contianer, style]}>
      <Reanimated.View
        style={[
          styles.selectionBackground,
          {
            backgroundColor: colors.background,
          },
          selectionBackgroundStyle,
        ]}
      />
      {GRAPH_DISPLAY_MODES.map((displayMode) => (
        <View key={displayMode}>
          <PressableScale
            style={styles.button}
            onPress={() => setGraphDisplayMode(displayMode)}
          >
            <Text>{displayMode.toUpperCase()}</Text>
          </PressableScale>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  contianer: { flexDirection: 'row', justifyContent: 'space-between' },
  selectionBackground: {
    position: 'absolute',
    height: '100%',
    marginLeft: SPACING,
    borderRadius: 7,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: SPACING,
    paddingVertical: 2.5,
  },
})
