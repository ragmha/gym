import { expect, test } from 'e2e'

// Default order; all goal icons share the page after Today.
const tiles = ['steps', 'gym', 'reading', 'praying', 'speaking']

test('Home shows every dashboard tile', async ({ app, screen }) => {
  // Resets the saved tile order; relaunches and waits for Metro.
  await app.clearState()
  await expect(screen.getByTestId('home-screen')).toBeVisible({
    timeout: 120_000,
  })

  await expect(screen.getByTestId('today-content')).toBeVisible()
  await screen.getByRole('button', { name: 'Show dashboard page 2 of 2' }).tap()
  for (const tile of tiles) {
    await expect(screen.getByTestId(`goal-tile-${tile}`)).toBeVisible()
  }
})
