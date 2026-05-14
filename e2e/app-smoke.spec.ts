import { expect, test } from '@playwright/test'

test.setTimeout(60_000)

test('loads the Expo web app shell', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  await expect(page.locator('body')).toBeVisible()
  await expect(
    page
      .getByText(/Fitness Metrics|Workout Progress|Workouts|Settings/)
      .first(),
  ).toBeVisible({ timeout: 30_000 })
})
