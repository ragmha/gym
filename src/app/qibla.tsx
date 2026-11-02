import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Circle, Text as SvgText } from 'react-native-svg'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import {
  CircleButton,
  FONTS,
  Label,
  useNothing,
} from '@/components/prayer/Nothing'
import { Layout } from '@/constants/DesignSystem'
import { useColorScheme } from '@/hooks/useColorScheme'
import { qiblaBearing } from '@/lib/prayer'
import { prayerNativeSupport } from '@/lib/prayerLocation'
import { useThemeStore } from '@/stores/ThemeStore'

const ALIGNED_DEGREES = 3

/** Live compass heading in whole degrees; kept in memory only. */
function useHeading(): { heading: number | null; message: string | null } {
  const [state, setState] = useState<{
    heading: number | null
    message: string | null
  }>({ heading: null, message: null })

  useEffect(() => {
    const support = prayerNativeSupport('Use the live compass')
    if (!support.available) {
      setState({ heading: null, message: support.message })
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Location: typeof import('expo-location') = require('expo-location')
    let cancelled = false
    let subscription: { remove(): void } | undefined
    const fail = (message: string) =>
      !cancelled && setState({ heading: null, message })
    ;(async () => {
      const { granted } = await Location.requestForegroundPermissionsAsync()
      if (cancelled) return
      if (!granted) return fail('Allow location access to use the compass')
      const watch = await Location.watchHeadingAsync(
        ({ trueHeading, magHeading }) => {
          const heading =
            Math.round(trueHeading >= 0 ? trueHeading : magHeading) % 360
          setState((current) =>
            current.heading === heading ? current : { heading, message: null },
          )
        },
        () => fail('Compass unavailable'),
      )
      if (cancelled) watch.remove()
      else subscription = watch
    })().catch(() => fail('Compass unavailable'))
    return () => {
      cancelled = true
      subscription?.remove()
    }
  }, [])
  return state
}

export default function QiblaScreen() {
  const p = useNothing()
  const colorScheme = useColorScheme()
  const router = useRouter()
  const location = useThemeStore((state) => state.prayer.location)
  const bearing = qiblaBearing(location)
  const { heading, message } = useHeading()
  const { width } = useWindowDimensions()
  const size = Math.min(width - Layout.gutter * 2, 340)
  const bearingFontSize = Math.min(
    96,
    Math.max(32, (width - Layout.gutter * 2) / 2.8),
  )
  const turn =
    heading === null
      ? null
      : ((Math.round(bearing) - heading + 540) % 360) - 180
  const aligned = turn !== null && Math.abs(turn) <= ALIGNED_DEGREES

  return (
    <SafeAreaView
      testID="qibla-screen"
      style={[styles.container, { backgroundColor: p.bg }]}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View style={styles.topBar}>
        <CircleButton icon="chevron-back" label="Back" onPress={router.back} />
        <Label>Qibla</Label>
        <View style={styles.spacer} />
      </View>
      <View style={styles.content}>
        <View
          accessible
          accessibilityLabel={`Qibla ${Math.round(bearing)} degrees from true north`}
          style={styles.hero}
        >
          <Label>From true north</Label>
          <Text
            style={[
              styles.digits,
              {
                color: p.display,
                fontSize: bearingFontSize,
                lineHeight: bearingFontSize * 1.05,
              },
            ]}
          >
            {`${Math.round(bearing)}°`}
          </Text>
          <Text style={[styles.city, { color: p.display }]} numberOfLines={2}>
            {location.name}
          </Text>
        </View>
        <View style={styles.dialWrap}>
          <View style={[styles.pointer, { backgroundColor: p.display }]} />
          <View
            style={{
              width: size,
              height: size,
              transform: [{ rotate: `${-(heading ?? 0)}deg` }],
            }}
          >
            <Dial size={size} bearing={bearing} aligned={aligned} />
          </View>
        </View>
        <Label
          color={aligned ? p.display : message ? p.accent : p.secondary}
          style={styles.status}
        >
          {aligned
            ? '[Aligned with the Qibla]'
            : turn !== null
              ? `Turn ${Math.abs(turn)}° ${turn > 0 ? 'right' : 'left'}`
              : message
                ? `[Compass unavailable: ${message}]`
                : '[Loading compass...]'}
        </Label>
      </View>
    </SafeAreaView>
  )
}

function Dial({
  size,
  bearing,
  aligned,
}: {
  size: number
  bearing: number
  aligned: boolean
}) {
  const p = useNothing()
  const c = size / 2
  const r = c - 14
  const at = (degrees: number, radius: number) => {
    const radians = ((degrees - 90) * Math.PI) / 180
    return {
      x: c + radius * Math.cos(radians),
      y: c + radius * Math.sin(radians),
    }
  }
  const marker = at(bearing, r)
  const trail = Array.from({ length: 9 }, (_, i) =>
    at(bearing, (r * (i + 1)) / 10),
  )
  return (
    <Svg width={size} height={size} accessibilityElementsHidden>
      {Array.from({ length: 72 }, (_, i) => {
        const major = i % 6 === 0
        const { x, y } = at(i * 5, r)
        return (
          <Circle
            key={i}
            cx={x}
            cy={y}
            r={major ? 2.5 : 1.5}
            fill={major ? p.primary : p.disabled}
          />
        )
      })}
      {(['N', 'E', 'S', 'W'] as const).map((label, i) => {
        const { x, y } = at(i * 90, r - 28)
        return (
          <SvgText
            key={label}
            x={x}
            y={y + 4}
            fill={label === 'N' ? p.display : p.secondary}
            fontFamily={FONTS.mono}
            fontSize={12}
            textAnchor="middle"
          >
            {label}
          </SvgText>
        )
      })}
      {trail.map(({ x, y }, i) => (
        <Circle key={i} cx={x} cy={y} r={1.5} fill={p.secondary} />
      ))}
      <Circle
        cx={marker.x}
        cy={marker.y}
        r={9}
        fill={aligned ? p.display : p.accent}
      />
      <Circle cx={c} cy={c} r={3} fill={p.display} />
    </Svg>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Layout.gutter,
    paddingVertical: 8,
  },
  spacer: { width: 48 },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.gutter,
    gap: 24,
  },
  hero: { gap: 4, paddingTop: 8 },
  digits: {
    fontFamily: FONTS.display,
    fontSize: 96,
    lineHeight: 100,
    letterSpacing: -2,
  },
  city: {
    fontFamily: FONTS.body,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  dialWrap: { alignItems: 'center', gap: 8 },
  pointer: { width: 2, height: 16 },
  status: { textAlign: 'center' },
})
