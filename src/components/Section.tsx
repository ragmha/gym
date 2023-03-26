import type { FC, ReactNode } from 'react'

import { View, Text } from 'react-native'
import styled from 'styled-components/native'

interface SectionProps {
  title: string
  children: ReactNode
}

const SectionContainer = styled(View)({
  marginTop: 8,
  paddingHorizontal: 16,
})

const SectionTitle = styled(Text)(
  {
    fontSize: 24,
  },
  ({ theme }) => ({
    color: theme.text,
  }),
)

const SectionContent = styled(Text)(
  {
    marginTop: 8,
    fontSize: 16,
  },
  ({ theme }) => ({
    color: theme.text,
  }),
)

export const Section: FC<SectionProps> = ({ title, children }) => (
  <SectionContainer>
    <SectionTitle>{title}</SectionTitle>
    <SectionContent>{children}</SectionContent>
  </SectionContainer>
)
