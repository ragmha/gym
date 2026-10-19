import { readFileSync } from 'fs'
import { dirname, join } from 'path'
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
  props: { text?: string; children?: unknown }
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

// Mirrors expo-widgets' native WidgetContext: evaluate the shipped Expo UI
// bundle, then the stringified layout, in an isolated JS context.
function renderWidget(props: Partial<DailySummaryProps>): WidgetNode {
  const { layout } = DailySummaryWidget as unknown as { layout: string }
  const bundle = join(
    dirname(require.resolve('expo-widgets/package.json')),
    'bundle/build/ExpoWidgets.bundle',
  )
  const context = createContext({})
  runInContext(readFileSync(bundle, 'utf8'), context)
  context.__expoWidgetLayout = runInContext(`(${layout})`, context)
  return context.__expoWidgetRender(props, {})
}

function ringCenters(tree: WidgetNode) {
  return findAll(tree, 'ZStackView').map((stack) => {
    const [gauge, label, ...rest] = childNodes(stack)
    expect(rest).toHaveLength(0)
    expect(gauge.type).toBe('GaugeView')
    // expo-widgets renders GaugeView without children, so slots never show.
    expect(childNodes(gauge)).toHaveLength(0)
    expect(label.type).toBe('TextView')
    return label.props.text
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

    expect(findAll(tree, 'GaugeView')).toHaveLength(3)
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
