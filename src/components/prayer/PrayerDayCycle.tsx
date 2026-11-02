import { memo } from 'react'
import { StyleSheet, View, useWindowDimensions } from 'react-native'
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Label, useNothing } from '@/components/prayer/Nothing'
import {
  formatPrayerTime,
  prayerDayPhase,
  type PrayerDayPhase,
  type PrayerDayTimes,
  type PrayerSettings,
} from '@/lib/prayer'

const SCENES = {
  sunrise: {
    name: 'SUNRISE',
    event: 'Sunrise',
    colors: ['#F4C88D', '#E98B70', '#685A91'],
    sun: '#FFE5A8',
    ridges: ['#52637E', '#30445F'],
    kind: 'sun',
  },
  sunset: {
    name: 'SUNSET',
    event: 'Maghrib',
    colors: ['#F8B376', '#D45C7C', '#573D78'],
    sun: '#FFD28C',
    ridges: ['#463D69', '#2B3156'],
    kind: 'sun',
  },
  night: {
    name: 'NIGHT',
    event: 'Isha',
    colors: ['#10213F', '#1B3560', '#355878'],
    sun: '#E7E9F3',
    ridges: ['#24344D', '#17263D'],
    kind: 'moon',
  },
} as const

type ScenePhase = keyof typeof SCENES
type SolarTimes = Pick<PrayerDayTimes, 'sunrise' | 'sunset' | 'night'>

function sceneFor(phase: ScenePhase | null) {
  return SCENES[phase ?? 'sunrise']
}

function phaseLabel(phase: ScenePhase | null) {
  if (phase === 'sunrise') return 'DAYLIGHT'
  if (phase === 'sunset') return 'DUSK · MAGHRIB'
  if (phase === 'night') return 'NIGHT · ISHA'
  return 'SOLAR TIMES'
}

export const PrayerDayBackdrop = memo(function PrayerDayBackdrop({
  phase,
}: {
  phase: PrayerDayPhase | null
}) {
  const p = useNothing()
  const { width, height } = useWindowDimensions()
  const scene = sceneFor(phase)
  const sceneLabel = phase
    ? `${phaseLabel(phase)} prayer landscape background, current phase`
    : 'Prayer landscape background'

  return (
    <View
      testID="prayer-scene-backdrop"
      accessible
      accessibilityRole="image"
      accessibilityLabel={sceneLabel}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      <Svg
        width={width}
        height={height}
        viewBox="0 0 390 844"
        preserveAspectRatio="xMidYMid slice"
      >
        <Defs>
          <LinearGradient id="prayer-sky" x1="0" y1="0" x2="0" y2="1">
            {scene.colors.map((color, index) => (
              <Stop
                key={color}
                offset={`${(index / (scene.colors.length - 1)) * 100}%`}
                stopColor={color}
              />
            ))}
          </LinearGradient>
          <LinearGradient id="prayer-contrast" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={p.bg} stopOpacity={0.48} />
            <Stop offset="38%" stopColor={p.bg} stopOpacity={0.24} />
            <Stop offset="64%" stopColor={p.bg} stopOpacity={0.32} />
            <Stop offset="100%" stopColor={p.bg} stopOpacity={0.94} />
          </LinearGradient>
        </Defs>
        <Rect width={390} height={844} fill="url(#prayer-sky)" />
        {scene.kind === 'moon' ? (
          <>
            {[
              [54, 150],
              [106, 250],
              [182, 122],
              [218, 330],
              [35, 402],
              [352, 164],
              [130, 350],
            ].map(([cx, cy], index) => (
              <Circle
                key={index}
                cx={cx}
                cy={cy}
                r={index % 2 ? 1.6 : 2.2}
                fill="#F3F2E8"
                opacity={0.85}
              />
            ))}
            <Circle cx={298} cy={262} r={43} fill={scene.sun} />
            <Circle cx={315} cy={246} r={39} fill={scene.colors[0]} />
          </>
        ) : (
          <Circle cx={294} cy={548} r={58} fill={scene.sun} opacity={0.95} />
        )}
        <Path
          d="m0 610 72-82 57 55 69-93 72 90 58-61 62 62v263H0Z"
          fill={scene.ridges[0]}
        />
        <Path
          d="m0 691 78-69 54 49 79-65 69 61 58-47 52 39v185H0Z"
          fill={scene.ridges[1]}
        />
        <Rect width={390} height={844} fill="url(#prayer-contrast)" />
      </Svg>
    </View>
  )
})

export function PrayerDayCycle({
  now,
  times,
  clock,
  timeZone,
}: {
  now: Date | null
  times: SolarTimes
  clock: PrayerSettings['clock']
  timeZone: string
}) {
  const p = useNothing()
  const phase = prayerDayPhase(now, times)
  const sceneNames = Object.keys(SCENES) as ScenePhase[]
  const accessibilityLabel = sceneNames
    .map((key) => {
      const time = formatPrayerTime(times[key], clock, timeZone)
      return `${SCENES[key].event} ${time.time}${time.period ? ` ${time.period}` : ''}`
    })
    .join('; ')

  return (
    <View
      testID="prayer-solar-times"
      accessible
      accessibilityLabel={accessibilityLabel}
      style={styles.container}
    >
      <View style={styles.phase}>
        <Label>LOCAL PRAYER CYCLE</Label>
        <Label color={p.display}>{phaseLabel(phase)}</Label>
      </View>
      <View style={[styles.times, { borderColor: p.borderVisible }]}>
        {sceneNames.map((key) => {
          const scene = SCENES[key]
          const time = formatPrayerTime(times[key], clock, timeZone)
          const timeLabel = `${time.time}${time.period ? ` ${time.period}` : ''}`
          return (
            <View
              key={key}
              accessible
              accessibilityLabel={`${scene.event} at ${timeLabel}`}
              style={[styles.time, { borderColor: p.borderVisible }]}
            >
              <Label>{scene.name}</Label>
              <Text style={[styles.digits, { color: p.display }]}>
                {timeLabel}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  phase: { flexDirection: 'row', justifyContent: 'space-between' },
  times: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  time: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  digits: {
    fontFamily: 'SpaceMono',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
})
