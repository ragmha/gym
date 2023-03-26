/** @type {import('jest').Config} */

const config = {
  preset: 'react-native',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  verbose: true,
}

module.exports = config
