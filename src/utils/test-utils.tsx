import type { RenderOptions } from '@testing-library/react-native'

import type { FC, ReactElement, ReactNode } from 'react'
import React from 'react'

import { render } from '@testing-library/react-native'
import { ThemeProvider } from 'styled-components/native'

import { lightTheme } from '@/theme'

const AllTheProviders: FC<{ children: ReactNode }> = ({ children }) => {
  return <ThemeProvider theme={lightTheme}>{children}</ThemeProvider>
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

// re-export everything
export * from '@testing-library/react-native'

// override render method
export { customRender as render }
