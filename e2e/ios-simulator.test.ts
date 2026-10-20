import { resolveIosSimulatorUdid } from './ios-simulator'

const simulatorUdid = '12345678-1234-1234-1234-123456789abc'

describe('resolveIosSimulatorUdid', () => {
  it('returns the UDID of an available simulator with the exact name', () => {
    expect(
      resolveIosSimulatorUdid(
        {
          devices: {
            'iOS 26.0': [
              {
                name: 'iPhone 17 Pro',
                udid: simulatorUdid,
                isAvailable: true,
                state: 'Shutdown',
              },
            ],
          },
        },
        'iPhone 17 Pro',
      ),
    ).toBe(simulatorUdid)
  })

  it('prefers a matching booted simulator', () => {
    const bootedUdid = 'abcdef12-1234-1234-1234-123456789abc'
    expect(
      resolveIosSimulatorUdid(
        {
          devices: {
            'iOS 26.0': [
              {
                name: 'iPhone 17 Pro',
                udid: simulatorUdid,
                isAvailable: true,
                state: 'Shutdown',
              },
              {
                name: 'iPhone 17 Pro',
                udid: bootedUdid,
                isAvailable: true,
                state: 'Booted',
              },
            ],
          },
        },
        'iPhone 17 Pro',
      ),
    ).toBe(bootedUdid)
  })

  it('fails instead of falling back when no matching simulator is available', () => {
    expect(() =>
      resolveIosSimulatorUdid(
        {
          devices: {
            'iOS 26.0': [
              {
                name: 'iPhone 17 Pro',
                udid: simulatorUdid,
                isAvailable: false,
              },
              {
                name: 'Raghib’s iPhone 17 Pro',
                udid: 'abcdef12-1234-1234-1234-123456789abc',
                isAvailable: true,
              },
            ],
          },
        },
        'iPhone 17 Pro',
      ),
    ).toThrow('No available iOS simulator named "iPhone 17 Pro"')
  })
})
