import { requireOptionalNativeModule } from 'expo'
import { z } from 'zod'

import { getHealthKitWriteNativeSupport } from '@/lib/healthSnapshot/healthKitWriteNativeSupport'
import { prayerLocationSchema, type PrayerLocation } from '@/lib/prayer'

export const PRAYER_NATIVE_VERSION = '1.0.23'
const ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search'

const resultsSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        admin1: z.string().optional(),
        country: z.string().optional(),
        timezone: z.string().optional(),
      }),
    )
    .optional(),
})

/** Sends only the typed query to Open-Meteo; nothing else leaves the device. */
export async function searchCities(
  query: string,
  signal: AbortSignal,
): Promise<PrayerLocation[]> {
  const name = query.trim()
  if (name.length < 2 || name.length > 100) {
    throw new Error('Enter 2 to 100 characters to find a city.')
  }
  const params = new URLSearchParams({
    name,
    count: '8',
    language: 'en',
    format: 'json',
  })
  const response = await fetch(`${ENDPOINT}?${params}`, { signal })
  if (!response.ok) throw new Error('City search is unavailable. Try again.')
  const parsed = resultsSchema.safeParse(await response.json())
  if (!parsed.success) throw new Error('City search returned invalid results.')
  return (parsed.data.results ?? []).flatMap((result) => {
    const location = prayerLocationSchema.safeParse({
      name: [result.name, result.admin1, result.country]
        .filter((part, index, parts) => part && parts.indexOf(part) === index)
        .join(', '),
      latitude: result.latitude,
      longitude: result.longitude,
      timezone: result.timezone,
    })
    return location.success ? [location.data] : []
  })
}

export function prayerNativeSupport(feature: string) {
  const support = getHealthKitWriteNativeSupport(PRAYER_NATIVE_VERSION, feature)
  if (support.available && !requireOptionalNativeModule('ExpoLocation')) {
    return {
      available: false as const,
      reason: 'build-required' as const,
      message: `A new iOS build is required to ${feature.toLowerCase()}. Install version ${PRAYER_NATIVE_VERSION} or later.`,
    }
  }
  return support
}

/** One coarse fix, rounded to ~1 km; asks for when-in-use permission. */
export async function currentLocation(): Promise<PrayerLocation> {
  const support = prayerNativeSupport('Use your location')
  if (!support.available) throw new Error(support.message)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Location: typeof import('expo-location') = require('expo-location')
  const { granted } = await Location.requestForegroundPermissionsAsync()
  if (!granted) {
    throw new Error('Allow location access in Settings, or search for a city.')
  }
  const { coords } = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Low,
  })
  const round = (value: number) => Math.round(value * 100) / 100
  const latitude = round(coords.latitude)
  const longitude = round(coords.longitude)
  // No reverse geocoding: CLGeocoder would send coordinates to Apple.
  return prayerLocationSchema.parse({
    name: 'Current location',
    latitude,
    longitude,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
}
