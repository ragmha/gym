import { spawnSync } from 'node:child_process'
import path from 'node:path'

// App Store Connect rejects an upload (ITMS-90683) when a linked framework's
// purpose string is missing. Plugin mods run in reverse declaration order, so a
// `false` permission option can delete a string that a later plugin set.
const requiredPurposeStrings = [
  'NSCameraUsageDescription',
  'NSHealthShareUsageDescription',
  'NSHealthUpdateUsageDescription',
  'NSMicrophoneUsageDescription',
  'NSPhotoLibraryUsageDescription',
  'NSSpeechRecognitionUsageDescription',
]

describe('resolved iOS Info.plist', () => {
  let infoPlist: Record<string, unknown>

  beforeAll(() => {
    const result = spawnSync(
      'bunx',
      ['expo', 'config', '--type', 'introspect', '--json'],
      { cwd: path.resolve(__dirname, '../..'), encoding: 'utf8' },
    )
    expect(result.status).toBe(0)
    infoPlist = (
      JSON.parse(result.stdout) as {
        ios: { infoPlist: Record<string, unknown> }
      }
    ).ios.infoPlist
  })

  it.each(requiredPurposeStrings)('keeps %s', (key) => {
    expect(infoPlist[key]).toEqual(expect.stringMatching(/\S/))
  })
})
