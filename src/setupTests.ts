/// <reference types="jest" />
import '@testing-library/jest-native/extend-expect'
import { cleanup } from '@testing-library/react-native'
import mockAsyncStorage from './__mocks__/async-storage'

// Setup AsyncStorage mock
declare global {
  var AsyncStorage: typeof mockAsyncStorage
}

beforeEach(() => {
  // Setup AsyncStorage mock
  global.AsyncStorage = mockAsyncStorage
})

afterEach(() => {
  cleanup()
})
