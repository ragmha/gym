import type { FC, ReactNode } from 'react'

import styled from 'styled-components/native'

import { useCurrentTheme } from '@/hooks/use-current-theme'

type ColProps = {
  size?: number
  offset?: number
}

type RowProps = {
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch'
  justifyContent?:
    | 'flex-start'
    | 'flex-end'
    | 'center'
    | 'space-between'
    | 'space-around'
    | 'space-evenly'
  flexWrap?: 'wrap' | 'nowrap' | 'wrap-reverse'
  spacing?: number
}

export const Grid = {
  Container: styled.View(
    {
      flex: 1,
    },
    ({ theme }) => ({
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.background,
    }),
  ),
  Row: styled.View<RowProps>(
    { flexDirection: 'row' },
    ({ alignItems, justifyContent, flexWrap, spacing }) => ({
      alignItems: alignItems || 'stretch',
      justifyContent: justifyContent || 'flex-start',
      flexWrap: flexWrap || 'wrap',
      marginHorizontal: spacing ? -spacing / 2 : undefined,
    }),
  ),
  Col: styled.View<ColProps>(({ size = 1, offset, theme }) => ({
    flex: size,
    marginLeft: offset ? offset * (theme.grid.size || 0) : undefined,
    padding: theme.spacing.sm,
  })),
}

interface GridProviderProps {
  gridSize: number
  children: ReactNode
}
export const GridProvider: FC<GridProviderProps> = ({ children, gridSize }) => {
  const theme = useCurrentTheme()
  theme.grid.size = gridSize
  return <>{children}</>
}
