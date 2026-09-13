import { execFileSync } from 'node:child_process'
import path from 'node:path'

import { localDateKey } from '@/lib/healthSnapshot/dateKey'

describe('localDateKey', () => {
  it.each([
    { timezone: 'Asia/Riyadh', hour: 0 },
    { timezone: 'Pacific/Kiritimati', hour: 0 },
    { timezone: 'America/Adak', hour: 23 },
  ])(
    'keeps the local date across a UTC boundary in $timezone',
    ({ timezone, hour }) => {
      const output = execFileSync(
        'bun',
        [
          '-e',
          [
            'import { localDateKey } from "./src/lib/healthSnapshot/dateKey.ts";',
            'const date = new Date(2026, 8, 13, Number(process.argv[1]), 30);',
            'console.log(JSON.stringify({ local: localDateKey(date), utc: date.toISOString().slice(0, 10) }));',
          ].join('\n'),
          String(hour),
        ],
        {
          cwd: path.resolve(__dirname, '../../../..'),
          env: { ...process.env, TZ: timezone },
          encoding: 'utf8',
        },
      )
      const result: { local: string; utc: string } = JSON.parse(output)
      expect(result.local).toBe('2026-09-13')
      expect(result.utc).not.toBe(result.local)
    },
  )

  it('rejects an invalid date instead of inventing a calendar key', () => {
    expect(() => localDateKey(new Date(NaN))).toThrow(RangeError)
  })
})
