import { act, renderHook } from '@testing-library/react-native'

import { useColorScheme } from '@/hooks/useColorScheme.web'
import { useThemeStore } from '@/stores/ThemeStore'

const originalMatchMedia = window.matchMedia
const addEventListener = jest.fn()
const removeEventListener = jest.fn()

afterEach(() => {
  window.matchMedia = originalMatchMedia
  useThemeStore.setState({ preference: 'system' })
})

it('resolves dark system appearance after hydration and follows later changes', () => {
  window.matchMedia = jest.fn().mockReturnValue({
    matches: true,
    addEventListener,
    removeEventListener,
  })
  useThemeStore.setState({ preference: 'system' })
  const view = renderHook(() => useColorScheme())
  expect(view.result.current).toBe('dark')
  const onChange = addEventListener.mock.calls[0][1]
  act(() => onChange({ matches: false }))
  expect(view.result.current).toBe('light')
  view.unmount()
  expect(removeEventListener).toHaveBeenCalledWith('change', onChange)
})

it('keeps an explicit light preference on a dark system', () => {
  window.matchMedia = jest.fn().mockReturnValue({
    matches: true,
    addEventListener,
    removeEventListener,
  })
  useThemeStore.setState({ preference: 'light' })
  const view = renderHook(() => useColorScheme())
  expect(view.result.current).toBe('light')
})
