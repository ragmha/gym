import styled from 'styled-components/native'

export const Card = {
  Container: styled.View(({ theme }) => ({
    backgroundColor: theme.colors.background,
    borderRadius: theme.spacing.sm,
    shadowColor: theme.colors.onSurface,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    padding: theme.spacing.md,
    flexDirection: 'column',
  })),
  TitleContainer: styled.View({
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  }),
  Title: styled.Text(({ theme }) => ({
    fontSize: theme.typography.h6.fontSize,
    fontWeight: theme.typography.h6.fontWeight,
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
