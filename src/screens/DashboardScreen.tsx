import type { StackParamList } from '@/navigation/types'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import type { FC } from 'react'

import { TouchableOpacity } from 'react-native'

import { Card } from '@/components/Card'
import { Grid, GridProvider } from '@/components/Grid'

type DashboardScreenProps = NativeStackScreenProps<StackParamList, 'Home'>

export const DashboardScreen: FC<DashboardScreenProps> = ({ navigation }) => {
  return (
    <GridProvider gridSize={8}>
      <Grid.Container>
        <Grid.Row>
          <Grid.Col size={4}>
            <Card.Container>
              <Card.TitleContainer>
                <Card.Title>Weight</Card.Title>
              </Card.TitleContainer>
              <Card.Content>150 lbs</Card.Content>
            </Card.Container>
          </Grid.Col>
          <Grid.Col size={4}>
            <TouchableOpacity onPress={() => navigation.navigate('Exercises')}>
              <Card.Container>
                <Card.Title>Exercises</Card.Title>
                <Card.Content>5</Card.Content>
              </Card.Container>
            </TouchableOpacity>
          </Grid.Col>
        </Grid.Row>
      </Grid.Container>
    </GridProvider>
  )
}
