import { addUserInteractionListener, createLiveActivity } from 'expo-widgets'
import { Platform } from 'react-native'

import {
  addStopListener,
  isReading,
  startReading,
  stopReading,
} from '@/lib/readingActivity'

jest.mock('@expo/ui/swift-ui', () => ({}))
jest.mock('@expo/ui/swift-ui/modifiers', () => ({}))
jest.mock('expo-widgets', () => {
  const factory = { start: jest.fn(), getInstances: jest.fn() }
  return {
    createLiveActivity: jest.fn(() => factory),
    addUserInteractionListener: jest.fn(() => ({ remove: jest.fn() })),
  }
})

const [[name, layout]] = jest.mocked(createLiveActivity).mock.calls
const reading = jest.mocked(createLiveActivity).mock.results[0].value as {
  start: jest.Mock
  getInstances: jest.Mock
}

// The widget extension evaluates the layout with only @expo/ui globals.
function renderLayout(props: {
  startedAt: number
  supportsInteractiveStop: boolean
}) {
  const components = ['Button', 'HStack', 'Image', 'Spacer', 'Text', 'VStack']
  const modifiers = [
    'font',
    'frame',
    'monospacedDigit',
    'multilineTextAlignment',
    'padding',
  ]
  const jsx = (type: string, elementProps: object) => ({
    type,
    props: elementProps,
  })
  const evaluate = new Function(
    ...components,
    ...modifiers,
    '_jsx',
    '_jsxs',
    '_jsxDEV',
    '_Fragment',
    '_jsxFileName',
    `return (${layout as unknown as string})`,
  )(
    ...components,
    ...modifiers.map((modifier) => (...args: unknown[]) => ({
      modifier,
      args,
    })),
    jsx,
    jsx,
    jsx,
    'Fragment',
    'readingActivity.tsx',
  )
  return evaluate(props)
}

beforeEach(() => {
  reading.start.mockReset()
  reading.getInstances.mockReset()
})

it('compiles a self-contained timer layout for the Dynamic Island', () => {
  expect(name).toBe('ReadingActivity')
  expect(typeof layout).toBe('string')

  const startedAt = new Date(2026, 8, 12, 21).getTime()
  const regions = renderLayout({
    startedAt,
    supportsInteractiveStop: true,
  })

  expect(Object.keys(regions)).toEqual([
    'banner',
    'compactLeading',
    'compactTrailing',
    'minimal',
    'expandedBottom',
  ])
  expect(regions.compactTrailing).toMatchObject({
    type: 'Text',
    props: { date: new Date(startedAt), dateStyle: 'timer' },
  })
  expect(regions.expandedBottom.props.children).toContainEqual({
    type: 'Button',
    props: { label: 'Stop', systemImage: 'stop.fill', target: 'stop' },
  })
})

it('instructs users on older iOS versions to stop from the Reading tile', () => {
  const regions = renderLayout({
    startedAt: new Date(2026, 8, 12, 21).getTime(),
    supportsInteractiveStop: false,
  })
  const children = regions.expandedBottom.props.children

  expect(children).not.toContainEqual(
    expect.objectContaining({ type: 'Button' }),
  )
  expect(children).toContainEqual(
    expect.objectContaining({
      type: 'Text',
      props: expect.objectContaining({
        children: 'Return to gym and tap Reading to stop',
      }),
    }),
  )
})

it('starts with the session start time and reports running activities', () => {
  startReading(1234)
  expect(reading.start).toHaveBeenCalledWith({
    startedAt: 1234,
    supportsInteractiveStop: Number.parseFloat(String(Platform.Version)) >= 17,
  })

  reading.getInstances.mockReturnValue([{}])
  expect(isReading()).toBe(true)
  reading.getInstances.mockReturnValue([])
  expect(isReading()).toBe(false)
  reading.getInstances.mockImplementation(() => {
    throw new Error('iOS 16.1 required')
  })
  expect(isReading()).toBe(false)
})

it('enables the interactive Stop button only on iOS 17 and later', () => {
  const originalVersion = Platform.Version
  try {
    Object.defineProperty(Platform, 'Version', {
      value: '16.2',
      configurable: true,
    })
    startReading(1234)
    expect(reading.start).toHaveBeenLastCalledWith({
      startedAt: 1234,
      supportsInteractiveStop: false,
    })

    Object.defineProperty(Platform, 'Version', {
      value: '17.0',
      configurable: true,
    })
    startReading(5678)
    expect(reading.start).toHaveBeenLastCalledWith({
      startedAt: 5678,
      supportsInteractiveStop: true,
    })
  } finally {
    Object.defineProperty(Platform, 'Version', {
      value: originalVersion,
      configurable: true,
    })
  }
})

it('dismisses every reading activity even if one already ended', async () => {
  const gone = { end: jest.fn(() => Promise.reject(new Error('not found'))) }
  const live = { end: jest.fn(() => Promise.resolve()) }
  reading.getInstances.mockReturnValue([gone, live])

  await expect(stopReading()).resolves.toBeUndefined()
  expect(gone.end).toHaveBeenCalledWith('immediate')
  expect(live.end).toHaveBeenCalledWith('immediate')

  reading.getInstances.mockImplementation(() => {
    throw new Error('unsupported')
  })
  await expect(stopReading()).resolves.toBeUndefined()
})

it('forwards only the Stop button from the Live Activity', () => {
  const listener = jest.fn()
  addStopListener(listener)
  const forward = jest.mocked(addUserInteractionListener).mock.calls[0][0]

  forward({
    source: 'ReadingActivity',
    target: 'other',
    timestamp: 1,
    type: 'ExpoWidgetsUserInteraction',
  })
  expect(listener).not.toHaveBeenCalled()
  forward({
    source: 'ReadingActivity',
    target: 'stop',
    timestamp: 2,
    type: 'ExpoWidgetsUserInteraction',
  })
  expect(listener).toHaveBeenCalledTimes(1)
})
