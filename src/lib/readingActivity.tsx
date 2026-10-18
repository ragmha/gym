import { Button, HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui'
import {
  font,
  frame,
  monospacedDigit,
  multilineTextAlignment,
  padding,
} from '@expo/ui/swift-ui/modifiers'
import { addUserInteractionListener, createLiveActivity } from 'expo-widgets'

interface ReadingProps {
  startedAt: number
}

// Compiled to a string for the widget extension: use only @expo/ui globals.
function ReadingLayout({ startedAt }: ReadingProps) {
  'widget'
  const since = new Date(startedAt)
  const book = <Image systemName="book.fill" color="#FF9500" />
  const session = (
    <HStack spacing={12}>
      <Image systemName="book.fill" color="#FF9500" size={28} />
      <VStack alignment="leading" spacing={2}>
        <Text modifiers={[font({ size: 15, weight: 'semibold' })]}>
          Reading
        </Text>
        <Text
          date={since}
          dateStyle="timer"
          modifiers={[
            font({ size: 28, weight: 'semibold' }),
            monospacedDigit(),
          ]}
        />
      </VStack>
      <Spacer />
      <Button label="Stop" systemImage="stop.fill" target="stop" />
    </HStack>
  )
  return {
    banner: <VStack modifiers={[padding({ all: 16 })]}>{session}</VStack>,
    compactLeading: book,
    compactTrailing: (
      <Text
        date={since}
        dateStyle="timer"
        modifiers={[
          monospacedDigit(),
          multilineTextAlignment('trailing'),
          frame({ width: 56 }),
        ]}
      />
    ),
    minimal: book,
    expandedBottom: session,
  }
}

const reading = createLiveActivity<ReadingProps>(
  'ReadingActivity',
  ReadingLayout,
)

export function isReading(): boolean {
  try {
    return reading.getInstances().length > 0
  } catch {
    return false
  }
}

/** Throws when Live Activities are off or unsupported on this device. */
export function startReading(startedAt: number): void {
  reading.start({ startedAt })
}

export async function stopReading(): Promise<void> {
  let activities: ReturnType<typeof reading.getInstances>
  try {
    activities = reading.getInstances()
  } catch {
    return
  }
  // Immediate dismissal keeps ended sessions out of getInstances().
  await Promise.allSettled(
    activities.map((activity) => activity.end('immediate')),
  )
}

/** The island's Stop button; only delivered while the app process runs. */
export function addStopListener(listener: () => void) {
  return addUserInteractionListener(({ target }) => {
    if (target === 'stop') listener()
  })
}
