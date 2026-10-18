import { requireOptionalNativeModule } from 'expo'

import { makeSnapshot } from '@/components/dashboard/__fixtures__/healthSnapshot'
import { publishDailySummary } from '@/lib/widgets/publishDailySummary.ios'

const { publishDailySummary: publishFallback } = jest.requireActual<
  typeof import('../publishDailySummary')
>('../publishDailySummary.ts')
const mockUpdateTimeline = jest.fn()
const mockLoadLayout = jest.fn()

jest.mock('expo', () => ({
  requireOptionalNativeModule: jest.fn(),
}))
jest.mock('../DailySummaryWidget', () => {
  mockLoadLayout()
  return { default: { updateTimeline: mockUpdateTimeline } }
})

describe('publishDailySummary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdateTimeline.mockReset()
  })

  it('never loads the layout or native views in an older development client', () => {
    jest.mocked(requireOptionalNativeModule).mockReturnValue(null)
    expect(publishDailySummary(makeSnapshot())).toBeNull()
    expect(mockLoadLayout).not.toHaveBeenCalled()
    expect(mockUpdateTimeline).not.toHaveBeenCalled()
  })

  it('does not load any native module on web or Android', () => {
    expect(publishFallback(makeSnapshot())).toBeNull()
    expect(requireOptionalNativeModule).not.toHaveBeenCalled()
    expect(mockUpdateTimeline).not.toHaveBeenCalled()
  })

  it('publishes an expiring timeline on compatible clients', () => {
    jest.mocked(requireOptionalNativeModule).mockReturnValue({})
    expect(publishDailySummary(makeSnapshot())).toBeNull()
    expect(mockUpdateTimeline).toHaveBeenCalledWith([
      expect.objectContaining({ date: expect.any(Date) }),
      expect.objectContaining({
        props: expect.objectContaining({ expiresAt: 0 }),
      }),
    ])
  })

  it('reports update errors without logging Health readings or native details', () => {
    jest.mocked(requireOptionalNativeModule).mockReturnValue({})
    mockUpdateTimeline.mockImplementation(() => {
      throw new Error('private native detail')
    })
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      expect(publishDailySummary(makeSnapshot())).toMatch(
        /Unable to update Daily rings/,
      )
      expect(warn).toHaveBeenCalledWith(
        '[widgets] Unable to update daily rings',
      )
    } finally {
      warn.mockRestore()
    }
  })
})
