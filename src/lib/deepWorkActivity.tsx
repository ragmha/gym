import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui'
import {
  font,
  frame,
  monospacedDigit,
  multilineTextAlignment,
  padding,
} from '@expo/ui/swift-ui/modifiers'
import { createLiveActivity } from 'expo-widgets'

import { deepWorkBlockStart, type DeepWorkSession } from '@/lib/deepWork'

interface DeepWorkProps {
  focus: boolean
  startsAt: number
  endsAt: number
  /** Set while paused, freezing the countdown at that moment. */
  pausedAt: number | null
}

// Compiled to a string for the widget extension: use only @expo/ui globals.
function DeepWorkLayout({ focus, startsAt, endsAt, pausedAt }: DeepWorkProps) {
  'widget'
  const icon = (
    <Image
      systemName={focus ? 'timer' : 'cup.and.saucer.fill'}
      color="#FF3B30"
    />
  )
  const clock = (size: number) => (
    <Text
      timerInterval={{ lower: new Date(startsAt), upper: new Date(endsAt) }}
      countsDown
      pauseTime={pausedAt === null ? undefined : new Date(pausedAt)}
      modifiers={[
        font({ size, weight: 'semibold' }),
        monospacedDigit(),
        multilineTextAlignment('trailing'),
      ]}
    />
  )
  const session = (
    <HStack spacing={12}>
      <Image
        systemName={focus ? 'timer' : 'cup.and.saucer.fill'}
        color="#FF3B30"
        size={28}
      />
      <VStack alignment="leading" spacing={2}>
        <Text modifiers={[font({ size: 15, weight: 'semibold' })]}>
          {focus ? 'Deep work' : 'Break'}
        </Text>
        <Text modifiers={[font({ size: 13 })]}>
          {pausedAt === null ? '25 min focus, 5 min break' : 'Paused'}
        </Text>
      </VStack>
      <Spacer />
      {clock(28)}
    </HStack>
  )
  return {
    banner: <VStack modifiers={[padding({ all: 16 })]}>{session}</VStack>,
    compactLeading: icon,
    compactTrailing: (
      <VStack modifiers={[frame({ width: 56 })]}>{clock(15)}</VStack>
    ),
    minimal: icon,
    expandedBottom: session,
  }
}

const deepWork = createLiveActivity<DeepWorkProps>(
  'DeepWorkActivity',
  DeepWorkLayout,
)

function instances() {
  try {
    return deepWork.getInstances()
  } catch {
    return []
  }
}

/**
 * Starts or updates the island countdown for the current block. It cannot
 * flip to the next block by itself; the app does that when it next runs.
 */
export function showDeepWork(session: DeepWorkSession, now: number): void {
  const props: DeepWorkProps = {
    focus: session.phase === 'focus',
    startsAt: deepWorkBlockStart(session, now),
    endsAt: session.endsAt ?? now + session.remainingMs,
    pausedAt: session.endsAt === null ? now : null,
  }
  const [activity] = instances()
  if (activity) void activity.update(props).catch(() => {})
  else deepWork.start(props)
}

export async function endDeepWork(): Promise<void> {
  await Promise.allSettled(
    instances().map((activity) => activity.end('immediate')),
  )
}
