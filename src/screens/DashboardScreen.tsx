import { Card } from '@/components/Card'
import { Grid, GridProvider } from '@/components/Grid'

export const DashboardScreen = () => {
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
            <Card.Container>
              <Card.Title>Exercises</Card.Title>
              <Card.Content>5</Card.Content>
            </Card.Container>
          </Grid.Col>
        </Grid.Row>
      </Grid.Container>
    </GridProvider>
  )
}
