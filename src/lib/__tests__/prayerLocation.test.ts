import { searchCities } from '@/lib/prayerLocation'

const respond = (body: unknown, ok = true) =>
  jest
    .spyOn(global, 'fetch')
    .mockResolvedValue({ ok, json: async () => body } as Response)

describe('searchCities', () => {
  afterEach(() => jest.restoreAllMocks())

  it('sends only the query and labels each result', async () => {
    const fetch = respond({
      results: [
        {
          name: 'Helsinki',
          admin1: 'Uusimaa',
          country: 'Finland',
          latitude: 60.17,
          longitude: 24.94,
          timezone: 'Europe/Helsinki',
        },
        {
          name: 'Singapore',
          country: 'Singapore',
          latitude: 1.29,
          longitude: 103.85,
          timezone: 'Asia/Singapore',
        },
        { name: 'Bad', latitude: 120, longitude: 0 },
      ],
    })

    await expect(
      searchCities(' Helsinki ', new AbortController().signal),
    ).resolves.toEqual([
      {
        name: 'Helsinki, Uusimaa, Finland',
        latitude: 60.17,
        longitude: 24.94,
        timezone: 'Europe/Helsinki',
      },
      {
        name: 'Singapore',
        latitude: 1.29,
        longitude: 103.85,
        timezone: 'Asia/Singapore',
      },
    ])
    expect(fetch.mock.calls[0][0]).toBe(
      'https://geocoding-api.open-meteo.com/v1/search?name=Helsinki&count=8&language=en&format=json',
    )
  })

  it('reports failures instead of inventing places', async () => {
    const signal = new AbortController().signal
    await expect(searchCities('a', signal)).rejects.toThrow('2 to 100')
    respond({}, false)
    await expect(searchCities('Oslo', signal)).rejects.toThrow('unavailable')
    respond({ results: 'nope' })
    await expect(searchCities('Oslo', signal)).rejects.toThrow('invalid')
  })
})
