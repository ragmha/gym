import { expect, test, type Page, type TestInfo } from '@playwright/test'

type VisualRoute = {
  name: string
  path: string
  visibleText: string | RegExp
}

const visualRoutes: VisualRoute[] = [
  { name: 'home', path: '/', visibleText: 'Fitness Metrics' },
  { name: 'workouts', path: '/workouts', visibleText: /Active \(\d+\)/ },
  { name: 'settings', path: '/settings', visibleText: 'Appearance' },
]

test.describe('Expo Web visual screenshots', () => {
  test('captures primary app routes', async ({ page }, testInfo) => {
    for (const route of visualRoutes) {
      await page.goto(route.path)
      await expect(page.locator('body')).toContainText(route.visibleText)
      await captureScreenshot(page, testInfo, route.name)
    }
  })
})

async function captureScreenshot(
  page: Page,
  testInfo: TestInfo,
  routeName: string,
) {
  const projectName = testInfo.project.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  const screenshotPath = testInfo.outputPath(`${projectName}-${routeName}.png`)

  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
  })
  await testInfo.attach(`${projectName}-${routeName}`, {
    path: screenshotPath,
    contentType: 'image/png',
  })
}
