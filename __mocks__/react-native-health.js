const HealthPermission = {
  StepCount: 'StepCount',
  ActiveEnergyBurned: 'ActiveEnergyBurned',
  Workout: 'Workout',
}

const mockHealthKit = {
  initHealthKit: jest.fn((_permissions, callback) => callback(null, true)),
  getStepCount: jest.fn((_options, callback) =>
    callback(null, { value: 5432 }),
  ),
  getActiveEnergyBurned: jest.fn((_options, callback) =>
    callback(null, [{ value: 234 }, { value: 112 }]),
  ),
  getSamples: jest.fn((_options, callback) =>
    callback(null, [
      {
        activityName: 'TraditionalStrengthTraining',
        calories: 280,
        distance: 0,
        duration: 45,
        start: new Date().toISOString(),
        end: new Date().toISOString(),
      },
    ]),
  ),
}

module.exports = {
  default: mockHealthKit,
  HealthPermission,
}
