import { createContext, runInContext } from 'vm'

import DailySummaryWidget from '@/lib/widgets/DailySummaryWidget'
import type { DailySummaryProps } from '@/lib/widgets/dailySummary'

jest.mock('@expo/ui/swift-ui', () => ({}))
jest.mock('@expo/ui/swift-ui/modifiers', () => ({}))
jest.mock('expo-widgets', () => ({
  createWidget: (name: string, layout: unknown) => ({ name, layout }),
}))

interface WidgetNode {
  type: string
  props: { children?: unknown }
}

const isNode = (value: unknown): value is WidgetNode =>
  !!value && typeof value === 'object' && 'type' in value

const childNodes = (node: WidgetNode) =>
  [node.props.children].flat().filter(isNode)

function findAll(node: WidgetNode, type: string): WidgetNode[] {
  return [
    ...(node.type === type ? [node] : []),
    ...childNodes(node).flatMap((child) => findAll(child, type)),
  ]
}

const components = ['VStack', 'HStack', 'ZStack', 'Gauge', 'Text', 'Spacer']
const modifiers = [
  'accessibilityLabel',
  'background',
  'font',
  'foregroundStyle',
  'frame',
  'gaugeStyle',
  'lineLimit',
  'padding',
  'tint',
  'widgetURL',
]

// expo-widgets serializes the layout and evaluates it natively against a
// prebuilt Expo UI bundle that only exists after an iOS build. Evaluate the
// same string in an isolated context with minimal element stubs instead.
function renderWidget(props: Partial<DailySummaryProps>): WidgetNode {
  const { layout } = DailySummaryWidget as unknown as { layout: string }
  const element = (type: string, elementProps: WidgetNode['props']) => ({
    type,
    props: elementProps,
  })
  const context = createContext({
    _jsx: element,
    _jsxs: element,
    ...Object.fromEntries(components.map((name) => [name, name])),
    ...Object.fromEntries(modifiers.map((name) => [name, () => name])),
  })
  return runInContext(`(${layout})`, context)(props)
}

function ringCenters(tree: WidgetNode) {
  return findAll(tree, 'ZStack').map((stack) => {
    const [gauge, label, ...rest] = childNodes(stack)
    expect(rest).toHaveLength(0)
    expect(gauge.type).toBe('Gauge')
    // expo-widgets renders GaugeView without children, so slots never show.
    expect(childNodes(gauge)).toHaveLength(0)
    expect(label.type).toBe('Text')
    return label.props.children
  })
}

const reading = {
  target: '20,000',
  color: '#83D7AB',
  value: '0',
  available: true,
  progress: 0,
}

describe('DailySummaryWidget', () => {
  it('overlays each ring percentage outside the Gauge', () => {
    const tree = renderWidget({
      updatedAt: '09:00',
      expiresAt: Date.now() + 60_000,
      readings: [
        { ...reading, label: 'STEPS' },
        { ...reading, label: 'WATER', value: '1.1 L', progress: 0.456 },
        { ...reading, label: 'ACTIVE KCAL', available: false },
      ],
    })

    expect(findAll(tree, 'Gauge')).toHaveLength(3)
    expect(ringCenters(tree)).toEqual(['0%', '45%', '--'])
  })

  it('shows unavailable ring centers when readings are missing or expired', () => {
    expect(ringCenters(renderWidget({}))).toEqual(['--', '--', '--'])
    expect(
      ringCenters(
        renderWidget({
          updatedAt: '09:00',
          expiresAt: Date.now() - 1,
          readings: [{ ...reading, label: 'STEPS', progress: 1 }],
        }),
      ),
    ).toEqual(['--'])
  })
})
