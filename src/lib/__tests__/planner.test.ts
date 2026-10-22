import {
  agendaPeriod,
  atTime,
  commuteSchema,
  freeBlocks,
  greeting,
  plannerDaySchema,
  reminderUrgency,
  suggestDayPlan,
  workBlock,
  type Reminder,
} from '@/lib/planner'

const now = new Date(2026, 9, 21, 10)
const reminder = (overrides: Partial<Reminder> = {}): Reminder => ({
  id: 'one',
  title: 'Task',
  dueMs: null,
  hasDueTime: false,
  priority: 0,
  completed: false,
  ...overrides,
})

describe('Today planning', () => {
  it.each([
    [0, 'Good night'],
    [6, 'Good morning'],
    [12, 'Good afternoon'],
    [18, 'Good evening'],
    [22, 'Good night'],
  ])('greets at local hour %i', (hour, expected) => {
    expect(greeting(new Date(2026, 9, 21, hour))).toBe(expected)
  })

  it('distinguishes date-only due today from overdue and timed urgency', () => {
    expect(
      reminderUrgency(reminder({ dueMs: atTime(now, '00:00') }), now),
    ).toBeNull()
    expect(
      reminderUrgency(
        reminder({ dueMs: new Date(2026, 9, 20).getTime() }),
        now,
      ),
    ).toBe('Overdue')
    expect(
      reminderUrgency(
        reminder({ dueMs: atTime(now, '09:30'), hasDueTime: true }),
        now,
      ),
    ).toBe('Overdue')
    expect(
      reminderUrgency(
        reminder({ dueMs: atTime(now, '10:30'), hasDueTime: true }),
        now,
      ),
    ).toBe('Due soon')
    expect(reminderUrgency(reminder({ priority: 1 }), now)).toBe(
      'High priority',
    )
    expect(reminderUrgency(reminder({ priority: 5 }), now)).toBeNull()
  })

  it('merges overlapping busy blocks, clips at 22:00 and excludes short gaps', () => {
    const block = (start: string, end: string) => ({
      startMs: atTime(now, start),
      endMs: atTime(now, end),
    })
    expect(
      freeBlocks(now, [
        block('11:00', '13:00'),
        block('12:00', '17:00'),
        block('09:00', '10:10'),
        block('17:10', '18:00'),
        block('23:00', '23:30'),
      ]),
    ).toEqual([block('10:10', '11:00'), block('18:00', '22:00')])
    expect(freeBlocks(new Date(2026, 9, 21, 23), [])).toEqual([])
    expect(freeBlocks(now, [block('00:00', '23:59')])).toEqual([])
  })

  it('reserves the stated weekday 9–5 and leaves weekends free', () => {
    expect(workBlock(now, null)).toEqual({
      startMs: atTime(now, '09:00'),
      endMs: atTime(now, '17:00'),
    })
    expect(workBlock(new Date(2026, 9, 24), null)).toBeNull()
  })

  it('accepts point events without blocking or fragmenting free time', () => {
    const point = {
      id: 'point',
      title: 'Deadline',
      startMs: atTime(now, '12:00'),
      endMs: atTime(now, '12:00'),
      allDay: false,
    }
    expect(
      plannerDaySchema.safeParse({
        calendarAccess: 'granted',
        remindersAccess: 'granted',
        events: [point],
        reminders: [],
      }).success,
    ).toBe(true)
    expect(freeBlocks(now, [point])).toEqual(freeBlocks(now, []))
  })

  it('validates stored commute preferences at the boundary', () => {
    const valid = {
      home: { gtfsId: 'HSL:1', name: 'Home station', lat: 60.2, lon: 24.9 },
      work: { gtfsId: 'HSL:2', name: 'Work station', lat: 60.1, lon: 24.8 },
      start: '09:00',
      end: '17:00',
      homeWalkMinutes: 5,
      workWalkMinutes: 8,
    }
    expect(commuteSchema.safeParse(valid).success).toBe(true)
    for (const input of [
      { ...valid, start: '25:00' },
      { ...valid, end: '08:00' },
      { ...valid, homeWalkMinutes: -1 },
      { ...valid, workWalkMinutes: Infinity },
      { ...valid, work: valid.home },
      { ...valid, home: { ...valid.home, lat: NaN } },
    ])
      expect(commuteSchema.safeParse(input).success).toBe(false)
  })

  it('requires confirmed completion fields and excludes completed tasks from urgency', () => {
    expect(
      reminderUrgency(reminder({ priority: 1, completed: true }), now),
    ).toBeNull()
    const { completed: _completed, ...missing } = reminder()
    expect(
      plannerDaySchema.safeParse({
        calendarAccess: 'granted',
        remindersAccess: 'granted',
        events: [],
        reminders: [missing],
      }).success,
    ).toBe(false)
  })

  it('groups only current-day times, without scheduling undated or old tasks', () => {
    expect(agendaPeriod(null, now)).toBe('Anytime')
    expect(agendaPeriod(new Date(2026, 9, 20, 8).getTime(), now)).toBe(
      'Anytime',
    )
    expect(agendaPeriod(atTime(now, '08:00'), now)).toBe('Morning')
    expect(agendaPeriod(atTime(now, '12:00'), now)).toBe('Afternoon')
    expect(agendaPeriod(atTime(now, '18:00'), now)).toBe('Night')
  })

  const planInput = () => ({
    now: new Date(2026, 9, 21, 7),
    day: {
      calendarAccess: 'granted' as const,
      remindersAccess: 'granted' as const,
      events: [],
      reminders: [reminder({ priority: 1 })],
    } as import('@/lib/planner').PlannerDay,
    commute: null,
    journeys: [],
    steps: 0 as number | null,
    gymFinished: false,
    deepWorkActive: false,
  })

  it('fits at most three deterministic non-overlapping proposals around Calendar, work and actual travel', () => {
    const input = planInput()
    input.day.events = [
      {
        id: 'meeting',
        title: 'Meeting',
        startMs: atTime(now, '07:00'),
        endMs: atTime(now, '08:30'),
        allDay: false,
      },
    ]
    const journeys = [
      { startMs: atTime(now, '08:45'), endMs: atTime(now, '09:00') },
      { startMs: atTime(now, '17:00'), endMs: atTime(now, '17:40') },
    ]
    const result = suggestDayPlan({ ...input, journeys })
    expect(
      result.map(({ id, startMs, endMs }) => [id, startMs, endMs]),
    ).toEqual([
      ['suggested-review', atTime(now, '08:30'), atTime(now, '08:45')],
      ['suggested-gym', atTime(now, '17:40'), atTime(now, '18:25')],
      ['suggested-walk', atTime(now, '18:25'), atTime(now, '18:40')],
    ])
    expect(suggestDayPlan({ ...input, journeys })).toEqual(result)
    const reserved = [
      ...input.day.events,
      ...journeys,
      workBlock(input.now, null)!,
    ]
    for (const [index, block] of result.entries()) {
      for (const other of [...reserved, ...result.slice(0, index)]) {
        expect(
          block.endMs <= other.startMs || block.startMs >= other.endMs,
        ).toBe(true)
      }
    }
  })

  it('never infers low steps from null and respects finished Gym and active focus evidence', () => {
    const input = planInput()
    input.day.reminders[0].completed = true
    expect(
      suggestDayPlan({ ...input, steps: null, gymFinished: true }).map(
        ({ id }) => id,
      ),
    ).toEqual(['suggested-focus'])
    expect(
      suggestDayPlan({
        ...input,
        steps: 0,
        gymFinished: true,
        deepWorkActive: true,
      }).map(({ id }) => id),
    ).toEqual(['suggested-walk'])
    expect(
      suggestDayPlan({
        ...input,
        steps: 20_000,
        gymFinished: true,
        deepWorkActive: true,
      }),
    ).toEqual([])
    input.day.remindersAccess = 'denied'
    input.day.reminders[0].completed = false
    expect(
      suggestDayPlan({
        ...input,
        steps: null,
        gymFinished: true,
        deepWorkActive: true,
      }),
    ).toEqual([])
  })

  it('requires a granted Calendar and a sufficiently long remaining gap, reserving all-day events', () => {
    const input = planInput()
    expect(suggestDayPlan({ ...input, day: null })).toEqual([])
    for (const calendarAccess of ['denied', 'undetermined'] as const)
      expect(
        suggestDayPlan({ ...input, day: { ...input.day, calendarAccess } }),
      ).toEqual([])
    input.day.events = [
      {
        id: 'away',
        title: 'Away',
        startMs: atTime(now, '00:00'),
        endMs: atTime(now, '23:59'),
        allDay: true,
      },
    ]
    expect(suggestDayPlan(input)).toEqual([])
    input.day.events = []
    expect(
      suggestDayPlan({ ...input, now: new Date(2026, 9, 21, 21, 46) }),
    ).toEqual([])
    expect(
      suggestDayPlan({ ...input, now: new Date(2026, 9, 21, 21, 45) }),
    ).toEqual([expect.objectContaining({ id: 'suggested-review' })])
    const shortGap = suggestDayPlan({
      ...input,
      now: new Date(2026, 9, 21, 21, 30),
      gymFinished: false,
      steps: null,
      day: { ...input.day, reminders: [] },
    })
    expect(shortGap).toEqual([
      expect.objectContaining({
        id: 'suggested-focus',
        endMs: atTime(now, '21:55'),
      }),
    ])
  })
})
