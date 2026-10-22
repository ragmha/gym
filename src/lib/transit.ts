import { z } from 'zod'

import {
  atTime,
  commuteSchema,
  stationSchema,
  type Commute,
  type Station,
} from '@/lib/planner'

const ENDPOINT = 'https://api.digitransit.fi/routing/v2/hsl/gtfs/v1'
export const transitKeySchema = z.string().regex(/^[\x21-\x7e]{1,256}$/)

async function queryHsl(
  query: string,
  key: string,
  signal: AbortSignal,
): Promise<unknown> {
  if (!transitKeySchema.safeParse(key).success) {
    throw new Error('Enter a valid Digitransit API key.')
  }
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'digitransit-subscription-key': key,
    },
    body: JSON.stringify({ query }),
    signal,
  })
  if (!response.ok) {
    throw new Error(
      response.status === 401 || response.status === 403
        ? 'HSL rejected the API key or its subscription. Review your key.'
        : 'HSL is unavailable. Try again.',
    )
  }
  const result = z
    .object({ data: z.unknown(), errors: z.array(z.unknown()).optional() })
    .safeParse(await response.json())
  if (!result.success || result.data.errors?.length) {
    throw new Error('HSL could not return this journey. Try again.')
  }
  return result.data.data
}

export async function searchStations(
  name: string,
  key: string,
  signal: AbortSignal,
): Promise<Station[]> {
  const term = name.trim()
  if (term.length < 2 || term.length > 100) {
    throw new Error('Enter 2 to 100 characters to find a station.')
  }
  const result = await queryHsl(
    `{ stations(name: ${JSON.stringify(term)}) { gtfsId name lat lon } }`,
    key,
    signal,
  )
  const parsed = z
    .object({ stations: z.array(stationSchema).max(500) })
    .safeParse(result)
  if (!parsed.success) throw new Error('HSL returned invalid station details.')
  return parsed.data.stations
}

const timeSchema = z.iso.datetime({ offset: true })
const journeySchema = z.object({
  start: timeSchema,
  end: timeSchema,
  legs: z
    .array(
      z.object({
        mode: z.string(),
        tripOnServiceDate: z
          .object({
            realTimeTripState: z
              .object({
                updated: z.boolean(),
                canceled: z.boolean(),
              })
              .nullable(),
          })
          .nullable(),
      }),
    )
    .min(1)
    .max(30),
})

export interface CommuteJourney {
  direction: 'To work' | 'Home'
  leaveMs: number
  arriveMs: number
  fetchedMs: number
  realtime: boolean
}

export async function fetchCommute(
  input: Commute,
  key: string,
  now: Date,
  signal: AbortSignal,
  direction?: CommuteJourney['direction'],
): Promise<CommuteJourney> {
  const commute = commuteSchema.parse(input)
  const toWork = direction
    ? direction === 'To work'
    : now.getTime() < atTime(now, commute.start)
  const origin = toWork ? commute.home : commute.work
  const destination = toWork ? commute.work : commute.home
  const originWalk = toWork ? commute.homeWalkMinutes : commute.workWalkMinutes
  const destinationWalk = toWork
    ? commute.workWalkMinutes
    : commute.homeWalkMinutes
  const targetMs = toWork
    ? atTime(now, commute.start) - destinationWalk * 60_000
    : Math.max(atTime(now, commute.end), now.getTime()) + originWalk * 60_000
  const coordinate = (station: Station) =>
    `{location:{coordinate:{latitude:${station.lat},longitude:${station.lon}}}}`
  const query = `{
    planConnection(
      origin: ${coordinate(origin)}
      destination: ${coordinate(destination)}
      dateTime: {${toWork ? 'latestArrival' : 'earliestDeparture'}: ${JSON.stringify(new Date(targetMs).toISOString())}}
      ${toWork ? 'last' : 'first'}: 5
      modes: {transit: {transit: [{mode: SUBWAY}]}}
    ) { edges { node { start end legs { mode tripOnServiceDate { realTimeTripState { updated canceled } } } } } }
  }`
  const result = await queryHsl(query, key, signal)
  const parsed = z
    .object({
      planConnection: z.object({
        edges: z.array(z.object({ node: journeySchema })).max(20),
      }),
    })
    .safeParse(result)
  if (!parsed.success) throw new Error('HSL returned invalid journey times.')
  const candidates = parsed.data.planConnection.edges
    .map(({ node }) => ({
      direction: toWork ? ('To work' as const) : ('Home' as const),
      leaveMs: Date.parse(node.start) - originWalk * 60_000,
      arriveMs: Date.parse(node.end) + destinationWalk * 60_000,
      fetchedMs: now.getTime(),
      realtime: node.legs
        .filter((leg) => leg.mode === 'SUBWAY')
        .every(
          (leg) => leg.tripOnServiceDate?.realTimeTripState?.updated === true,
        ),
      metro: node.legs.some((leg) => leg.mode === 'SUBWAY'),
      canceled: node.legs.some(
        (leg) => leg.tripOnServiceDate?.realTimeTripState?.canceled === true,
      ),
    }))
    .filter(
      (journey) =>
        journey.metro &&
        !journey.canceled &&
        journey.leaveMs >= now.getTime() &&
        journey.arriveMs > journey.leaveMs &&
        (!toWork || journey.arriveMs <= atTime(now, commute.start)),
    )
  candidates.sort((a, b) =>
    toWork ? b.leaveMs - a.leaveMs : a.leaveMs - b.leaveMs,
  )
  if (!candidates.length)
    throw new Error('No suitable upcoming metro journey was returned by HSL.')
  return candidates[0]
}
