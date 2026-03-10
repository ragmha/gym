/* global jest */

// Mock for @kingstinct/react-native-healthkit
const mock = {
  isHealthDataAvailable: jest.fn(() => Promise.resolve(true)),
  requestAuthorization: jest.fn(() => Promise.resolve(true)),
  queryQuantitySamples: jest.fn(() => Promise.resolve([{ quantity: 5432 }])),
  queryCategorySamples: jest.fn(() => {
    const end = new Date()
    const start = new Date(end.getTime() - 6 * 60 * 60_000)
    return Promise.resolve([
      {
        value: 1,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
    ])
  }),
  getMostRecentQuantitySample: jest.fn(() =>
    Promise.resolve({ quantity: 72, unit: 'count/min' }),
  ),
  queryWorkoutSamples: jest.fn(() =>
    Promise.resolve([
      {
        workoutActivityType: 'TraditionalStrengthTraining',
        totalEnergyBurned: { quantity: 280 },
        totalDistance: { quantity: 0 },
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
      },
    ]),
  ),
}

module.exports = mock
