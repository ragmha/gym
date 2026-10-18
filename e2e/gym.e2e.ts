import { expect, test } from 'e2e'

test('agent reaches the lifting programme from home', async ({
  app,
  agent,
  screen,
}) => {
  await app.open()
  await expect(screen.getByTestId('home-screen')).toBeVisible({
    timeout: 120_000,
  })

  await agent.act('Open the gym log, then open the lifting programme')
  await expect(screen.getByTestId('gym-lifting-screen')).toBeVisible()
  await agent.assert('A strength or lifting programme screen is shown')
})
