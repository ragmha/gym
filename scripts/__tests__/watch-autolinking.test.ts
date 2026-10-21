import { execFileSync } from 'node:child_process'
import path from 'node:path'

it('registers the Watch bridge with Expo, not just CocoaPods', () => {
  const root = path.resolve(__dirname, '../..')
  const resolved = JSON.parse(
    execFileSync(
      process.execPath,
      [
        'node_modules/expo-modules-autolinking/bin/expo-modules-autolinking.js',
        'resolve',
        '--platform',
        'apple',
        '--json',
      ],
      { cwd: root, encoding: 'utf8', timeout: 30_000 },
    ),
  )
  expect(resolved.modules).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        packageName: 'gym-watch',
        modules: expect.arrayContaining([
          expect.objectContaining({ class: 'GymWatchModule' }),
        ]),
      }),
    ]),
  )
})
