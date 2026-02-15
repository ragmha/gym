// https://docs.expo.dev/guides/using-eslint/
import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import unusedImports from 'eslint-plugin-unused-imports'
import globals from 'globals'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
})

export default [
  ...compat.extends('expo'),
  eslintPluginPrettierRecommended,
  {
    ignores: ['dist/*', '.expo/*', 'android/*', 'ios/*', 'eslint.config.mjs'],
  },
  {
    files: ['babel.config.js', 'metro.config.js', 'app.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
      // Allow @ alias imports (configured in tsconfig.json)
      'import/no-unresolved': 'off',
      // Disable deprecated eslint-plugin-node rules (incompatible with ESLint 9+)
      'node/handle-callback-err': 'off',
      'node/no-callback-literal': 'off',
      'node/no-deprecated-api': 'off',
    },
  },
]
