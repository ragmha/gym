import { Gauge, HStack, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui'
import {
  accessibilityLabel,
  background,
  font,
  foregroundStyle,
  frame,
  gaugeStyle,
  lineLimit,
  padding,
  tint,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers'
import { createWidget } from 'expo-widgets'

import type { DailySummaryProps } from '@/lib/widgets/dailySummary'

function DailySummaryLayout(props: Partial<DailySummaryProps>) {
  'widget'
  // Isolated layout globals cannot import Colors; mirror the shared dark tokens.
  const colors = {
    background: '#000000',
    text: '#E8E8E8',
    muted: '#999999',
    track: '#333333',
    accent: '#FF4D55',
  }
  const fresh = !!props.expiresAt && Date.now() < props.expiresAt
  const readings =
    props.readings ??
    [
      { label: 'STEPS', target: '20,000' },
      { label: 'WATER', target: '2.5 L' },
      { label: 'ACTIVE KCAL', target: '500 kcal' },
    ].map((reading) => ({
      ...reading,
      value: '--',
      available: false,
      progress: 0,
    }))

  return (
    <VStack
      spacing={8}
      modifiers={[
        padding({ all: 14 }),
        frame({ maxWidth: Infinity, maxHeight: Infinity }),
        background(colors.background),
        widgetURL('io.raghib.gym://'),
      ]}
    >
      <HStack>
        <Text
          modifiers={[
            font({ size: 12, weight: 'semibold' }),
            foregroundStyle(colors.text),
          ]}
        >
          GYM
        </Text>
        <Spacer />
        <Text
          modifiers={[
            font({ size: 10 }),
            foregroundStyle(colors.muted),
            lineLimit(1),
          ]}
        >
          {fresh && props.updatedAt
            ? `Updated ${props.updatedAt}`
            : 'Open Gym to refresh'}
        </Text>
      </HStack>
      <HStack spacing={8}>
        {readings.map((reading) => {
          const available = fresh && reading.available
          const progress = available ? reading.progress : 0
          const value = available ? reading.value : '--'
          return (
            <VStack
              key={reading.label}
              spacing={4}
              modifiers={[
                frame({ maxWidth: Infinity }),
                accessibilityLabel(
                  `${reading.label}, ${value}, target ${reading.target}`,
                ),
              ]}
            >
              {/* expo-widgets drops Gauge label slots; overlay the value instead. */}
              <ZStack>
                <Gauge
                  value={progress}
                  modifiers={[
                    gaugeStyle('circularCapacity'),
                    tint(available ? colors.accent : colors.track),
                    frame({ height: 54 }),
                  ]}
                />
                <Text
                  modifiers={[
                    font({ size: 17, weight: 'regular', design: 'monospaced' }),
                    foregroundStyle(colors.text),
                  ]}
                >
                  {available ? `${Math.floor(progress * 100)}%` : '--'}
                </Text>
              </ZStack>
              <Text
                modifiers={[
                  font({ size: 10, weight: 'semibold' }),
                  foregroundStyle(colors.text),
                  lineLimit(1),
                ]}
              >
                {reading.label}
              </Text>
              <Text
                modifiers={[
                  font({ size: 10 }),
                  foregroundStyle(colors.muted),
                  lineLimit(1),
                ]}
              >
                {`${value} / ${reading.target}`}
              </Text>
            </VStack>
          )
        })}
      </HStack>
    </VStack>
  )
}

export default createWidget<DailySummaryProps>(
  'DailySummary',
  DailySummaryLayout,
)
