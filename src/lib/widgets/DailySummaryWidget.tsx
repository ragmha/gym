import { Gauge, HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui'
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
  // The widget runs in an isolated JS context; keep its layout self-contained.
  const fresh = !!props.expiresAt && Date.now() < props.expiresAt
  const readings =
    props.readings ??
    [
      { label: 'STEPS', target: '20,000', color: '#83D7AB' },
      { label: 'WATER', target: '2.5 L', color: '#8AB4FF' },
      { label: 'ACTIVE KCAL', target: '500 kcal', color: '#EF7171' },
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
        background('#11151D'),
        widgetURL('io.raghib.gym://'),
      ]}
    >
      <HStack>
        <Text
          modifiers={[
            font({ size: 12, weight: 'semibold' }),
            foregroundStyle('#F4F6FA'),
          ]}
        >
          GYM
        </Text>
        <Spacer />
        <Text
          modifiers={[
            font({ size: 10 }),
            foregroundStyle('#AFB7C6'),
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
              <Gauge
                value={progress}
                currentValueLabel={
                  <Text
                    modifiers={[
                      font({ size: 17, weight: 'semibold', design: 'rounded' }),
                      foregroundStyle('#F4F6FA'),
                    ]}
                  >
                    {available ? `${Math.floor(progress * 100)}%` : '--'}
                  </Text>
                }
                modifiers={[
                  gaugeStyle('circularCapacity'),
                  tint(available ? reading.color : '#394252'),
                  frame({ height: 54 }),
                ]}
              >
                <Text>{reading.label}</Text>
              </Gauge>
              <Text
                modifiers={[
                  font({ size: 10, weight: 'semibold' }),
                  foregroundStyle(reading.color),
                  lineLimit(1),
                ]}
              >
                {reading.label}
              </Text>
              <Text
                modifiers={[
                  font({ size: 10 }),
                  foregroundStyle('#AFB7C6'),
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
