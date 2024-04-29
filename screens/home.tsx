import { useColors } from '@/hooks/use-colors'
import React, { useMemo, useState } from 'react'
import { StyleSheet, View, Text } from 'react-native'
import StaticSafeAreaInsets from 'react-native-static-safe-area-insets'
import { LineGraph } from 'react-native-graph'
import { generateRandomGraphData } from '@/data/GraphData'
import { hapticFeedback } from '@/utils/HapticFeedback'
import { HapticFeedbackTypes } from 'react-native-haptic-feedback'
import { SelectionDot } from '@/components/custom-selection-dot'

const POINT_COUNT = 70
const COLOR = '#6A7EE7'

export function Home() {
  const colors = useColors()

  const [points] = useState(generateRandomGraphData(POINT_COUNT))

  const range = useMemo(() => {
    return {
      x: {
        min: new Date(new Date(2000, 1, 1).getTime()),
        max: new Date(
          new Date(2000, 1, 1).getTime() + 31 * 1000 * 60 * 60 * 24
        ),
      },
      y: {
        min: -200,
        max: 50,
      },
    }
  }, [])

  return (
    <View style={[styles.container, { backgroundColor: colors.foreground }]}>
      <View style={styles.spacer} />
      <LineGraph
        style={styles.graph}
        animated
        color={COLOR}
        points={points}
        enablePanGesture
        onGestureStart={() => hapticFeedback(HapticFeedbackTypes.impactLight)}
        onPointSelected={(p) => console.log('Update title' + p)}
        onGestureEnd={() => console.log('Reset title')}
        SelectionDot={SelectionDot}
        range={range}
        horizontalPadding={20}
        verticalPadding={60}
        enableIndicator
        indicatorPulsating
      />
      <View style={styles.spacer} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: StaticSafeAreaInsets.safeAreaInsetsTop + 15,
    paddingBottom: StaticSafeAreaInsets.safeAreaInsetsBottom + 15,
  },
  title: { fontSize: 30, fontWeight: '700', paddingHorizontal: 15 },
  spacer: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  graph: {
    alignSelf: 'center',
    width: '100%',
    aspectRatio: 1.2,
    marginVertical: 20,
  },
  controlsScrollView: {
    flexGrow: 1,
    paddingHorizontal: 15,
  },
  controlsScrollViewContent: {
    justifyContent: 'center',
  },
})
