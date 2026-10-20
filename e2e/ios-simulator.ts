import { execFileSync } from 'node:child_process'

type Simulator = {
  name?: unknown
  udid?: unknown
  isAvailable?: unknown
  state?: unknown
}

type SimulatorInventory = {
  devices?: Record<string, Simulator[]>
}

export function resolveIosSimulatorUdid(
  inventory: unknown,
  deviceName: string,
): string {
  if (!inventory || typeof inventory !== 'object') {
    throw new Error('The iOS simulator inventory is invalid.')
  }

  const devices = (inventory as SimulatorInventory).devices
  if (!devices || typeof devices !== 'object') {
    throw new Error('The iOS simulator inventory does not contain devices.')
  }

  const matches = Object.values(devices)
    .flat()
    .filter(
      (device) =>
        device.name === deviceName &&
        device.isAvailable === true &&
        typeof device.udid === 'string' &&
        /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(device.udid),
    )

  const simulator =
    matches.find((device) => device.state === 'Booted') ?? matches[0]
  if (!simulator || typeof simulator.udid !== 'string') {
    throw new Error(
      `No available iOS simulator named "${deviceName}" was found. ` +
        'Create or install that simulator before running E2E tests.',
    )
  }

  return simulator.udid
}

export function getIosSimulatorUdid(deviceName: string): string {
  const inventory = execFileSync(
    'xcrun',
    ['simctl', 'list', 'devices', 'available', '--json'],
    { encoding: 'utf8' },
  )

  return resolveIosSimulatorUdid(JSON.parse(inventory), deviceName)
}
