import { expect, test } from 'e2e'

test('Settings shows Apple Health access and returns home', async ({
  app,
  screen,
}) => {
  await app.open()
  // First launch waits for Metro to bundle.
  await expect(screen.getByTestId('home-screen')).toBeVisible({
    timeout: 120_000,
  })

  await screen.getByRole('button', { name: 'Settings' }).tap()
  await expect(screen.getByTestId('settings-screen')).toBeVisible()
  await expect(screen.getByText('Apple Health')).toBeVisible()
  await expect(screen.getByTestId('review-health-access')).toBeEnabled()

  await screen.getByRole('button', { name: 'Back' }).tap()
  await expect(screen.getByTestId('home-screen')).toBeVisible()
})
