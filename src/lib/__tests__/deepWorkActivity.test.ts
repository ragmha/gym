import { createLiveActivity } from 'expo-widgets'

import { FOCUS_MS, pauseDeepWork, startDeepWork } from '@/lib/deepWork'
import { endDeepWork, showDeepWork } from '@/lib/deepWorkActivity'

jest.mock('@expo/ui/swift-ui', () => ({}))
jest.mock('@expo/ui/swift-ui/modifiers', () => ({}))
jest.mock('expo-widgets', () => {
  const factory = { start: jest.fn(), getInstances: jest.fn(() => []) }
  return { createLiveActivity: jest.fn(() => factory) }
})

const [[name, layout]] = jest.mocked(createLiveActivity).mock.calls
const factory = jest.mocked(createLiveActivity).mock.results[0].value as {
  start: jest.Mock
  getInstances: jest.Mock
}

// The widget extension evaluates the layout with only @expo/ui globals.
function renderLayout(props: object) {
  const components = ['HStack', 'Image', 'Spacer', 'Text', 'VStack']
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
  return new Function(
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
    'deepWorkActivity.tsx',
  )(props)
}

beforeEach(() => {
  factory.start.mockReset()
  factory.getInstances.mockReset().mockReturnValue([])
})

it('counts down the current block, frozen while paused', () => {
  expect(name).toBe('DeepWorkActivity')
  showDeepWork(pauseDeepWork(startDeepWork(0), 60_000), 100_000)
  const props = factory.start.mock.calls[0][0]
  expect(props).toEqual({
    focus: true,
    startsAt: 100_000 - 60_000,
    endsAt: 100_000 + FOCUS_MS - 60_000,
    pausedAt: 100_000,
  })

  const regions = renderLayout(props)
  expect(regions.compactTrailing.props.children).toMatchObject({
    type: 'Text',
    props: {
      timerInterval: {
        lower: new Date(props.startsAt),
        upper: new Date(props.endsAt),
      },
      countsDown: true,
      pauseTime: new Date(100_000),
    },
  })
})

it('updates a running activity instead of starting another, and ends all', async () => {
  const activity = {
    update: jest.fn().mockResolvedValue(undefined),
    end: jest.fn().mockResolvedValue(undefined),
  }
  factory.getInstances.mockReturnValue([activity])

  showDeepWork(startDeepWork(0), 0)
  expect(factory.start).not.toHaveBeenCalled()
  expect(activity.update).toHaveBeenCalledWith(
    expect.objectContaining({ focus: true, pausedAt: null }),
  )

  await endDeepWork()
  expect(activity.end).toHaveBeenCalledWith('immediate')
})
