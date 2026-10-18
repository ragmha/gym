import { useSpeakingLogStore } from '@/stores/SpeakingLogStore'

const state = () => useSpeakingLogStore.getState()
const log = (at: string, transcript = 'Small PRs win.') => ({
  at,
  topicId: 'small-prs',
  style: 'solo' as const,
  capture: 'live' as const,
  seconds: 60,
  transcript,
})

beforeEach(() => useSpeakingLogStore.setState({ sessions: [] }))

describe('SpeakingLogStore', () => {
  it('keeps sessions newest first and replaces a re-saved session', () => {
    state().save(log('a'))
    state().save(log('b'))
    state().save(log('a', 'Small PRs win, finally.'))

    expect(state().sessions.map((s) => [s.at, s.transcript])).toEqual([
      ['a', 'Small PRs win, finally.'],
      ['b', 'Small PRs win.'],
    ])
  })

  it('ignores empty transcripts and deletes sessions', () => {
    state().save(log('a', '   '))
    state().save(log('b'))
    state().remove('b')
    expect(state().sessions).toEqual([])
  })
})
