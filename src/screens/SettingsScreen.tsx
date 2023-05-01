import type { FC } from 'react'
import React from 'react'

import { FlatList } from 'react-native'
import styled from 'styled-components/native'

interface Data {
  id: string
  label: string
}

const data: Data[] = [{ id: '1', label: 'Theme' }]

const renderItem = ({ item }: { item: Data }) => (
  <Item>
    <ItemText>{item.label}</ItemText>
  </Item>
)

export const SettingsScreen: FC = () => {
  return (
    <Container>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={Separator}
      />
    </Container>
  )
}

const Container = styled.View(
  {
    flex: 1,
  },
  ({ theme }) => ({
    backgroundColor: theme.colors.background,
  }),
)

const Item = styled.TouchableOpacity(
  {
    padding: 16,
  },
  ({ theme }) => ({ backgroundColor: theme.colors.primary }),
)

const ItemText = styled.Text(({ theme }) => ({
  fontSize: `${theme.typography.body1.fontSize}px`,
  fontWeight: theme.typography.body1.fontWeight,
}))

const Separator = styled.View(
  {
    height: 1,
  },
  ({ theme }) => ({
    backgroundColor: theme.colors.surface,
  }),
)
