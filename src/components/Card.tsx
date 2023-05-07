import styled from 'styled-components/native'

export const Card = {
  Container: styled.View(({ theme }) => ({
    backgroundColor: theme.colors.background,
    borderRadius: theme.spacing.sm,
    padding: theme.spacing.md,
    flexDirection: 'column',
    height: theme.spacing.xl * 3,
    borderColor: theme.colors.onSurface,
    borderWidth: 2,
  })),
  TitleContainer: styled.View({
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  }),
  Title: styled.Text(({ theme }) => ({
    fontSize: theme.typography.h6.fontSize,
    fontWeight: theme.typography.h6.fontWeight,
    color: theme.colors.onSurface,
  })),
  Icon: styled.View({
    alignItems: 'flex-end',
  }),
  Content: styled.Text(({ theme }) => ({
    fontSize: theme.typography.body1.fontSize,
    fontWeight: theme.typography.body1.fontWeight,
    color: theme.colors.onSurface,
  })),
}
