import {
  type BabelFileResult,
  transformFileSync,
  transformSync,
  type TransformCaller,
  type TransformOptions,
} from '@babel/core'
import { dirname, resolve } from 'node:path'
import { runInNewContext, Script } from 'node:vm'

const root = resolve(__dirname, '../..')
const middlewarePath = resolve(
  dirname(require.resolve('zustand/package.json')),
  'esm/middleware.mjs',
)

interface MetroWebCaller extends TransformCaller {
  bundler: 'metro'
  platform: 'web'
  isServer: false
  isDev: boolean
}

function options(isDev: boolean): TransformOptions {
  const caller: MetroWebCaller = {
    name: 'metro',
    bundler: 'metro',
    platform: 'web',
    isServer: false,
    isDev,
    supportsStaticESM: false,
  }

  return {
    configFile: resolve(root, 'babel.config.js'),
    babelrc: false,
    envName: isDev ? 'development' : 'production',
    caller,
  }
}

function outputCode(result: BabelFileResult | null): string {
  if (!result?.code) {
    throw new Error('Babel did not emit JavaScript')
  }
  return result.code
}

describe.each([true, false])('web Babel configuration (isDev=%s)', (isDev) => {
  it('compiles the installed Zustand middleware as a classic Metro script', () => {
    const code = outputCode(transformFileSync(middlewarePath, options(isDev)))

    expect(() => new Script(code)).not.toThrow()
    expect(code).toContain('globalThis.__ExpoImportMetaRegistry')
  })

  it('preserves import.meta environment reads through the Expo runtime', () => {
    const code = outputCode(
      transformSync(
        'globalThis.mode = import.meta.env ? import.meta.env.MODE : undefined',
        {
          ...options(isDev),
          filename: resolve(root, 'web-import-meta.js'),
        },
      ),
    )
    const mode = isDev ? 'development' : 'production'
    const context: {
      __ExpoImportMetaRegistry: { env: { MODE: string } }
      mode?: string
    } = { __ExpoImportMetaRegistry: { env: { MODE: mode } } }

    runInNewContext(code, context)

    expect(context.mode).toBe(mode)
  })
})
