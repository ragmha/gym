import { expect, test } from 'e2e'

// Default tile order, six tiles per page.
const pages = [
  ['steps', 'gym', 'water', 'reading', 'praying', 'journal'],
  ['speaking', 'achievements', 'deep work'],
]

test('Home shows every dashboard tile', async ({ app, screen }) => {
  // Resets the saved tile order; relaunches and waits for Metro.
  await app.clearState()
  await expect(screen.getByTestId('home-screen')).toBeVisible({
    timeout: 120_000,
  })

  for (const [index, tiles] of pages.entries()) {
    await screen
      .getByRole('button', {
        name: `Show dashboard page ${index + 1} of ${pages.length}`,
      })
      .tap()
    for (const tile of tiles) {
      await expect(screen.getByTestId(`goal-tile-${tile}`)).toBeVisible()
    }
  }
})
