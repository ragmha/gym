import { useCurrentTheme } from '@/hooks/use-current-theme'
import { darkTheme, lightTheme } from '@/theme'
import { renderHook } from '@/utils/test/test-utils'

const mockedUseColorScheme = jest.fn()

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => {
  return {
    default: mockedUseColorScheme,
  }
})

describe('useCurrentTheme', () => {
  afterEach(() => jest.resetAllMocks())

  it('should return light theme when color scheme is light', () => {
    mockedUseColorScheme.mockImplementation(() => 'light')
    const { result } = renderHook(() => useCurrentTheme())
    expect(result.current).toBe(lightTheme)
  })

  it('should return dark theme when color scheme is dark', () => {
    mockedUseColorScheme.mockImplementation(() => 'dark')
    const { result } = renderHook(() => useCurrentTheme())
    expect(result.current).toBe(darkTheme)
  })
})
