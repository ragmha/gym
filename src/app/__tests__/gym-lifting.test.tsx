import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native'
import { File } from 'expo-file-system'
import { useLocalSearchParams } from 'expo-router'
import { Linking, Platform } from 'react-native'
import {
  AppRemote,
  Auth,
  Content,
  Images,
  Player,
  SpotifyURI,
  useConnectionState,
  usePlayerState,
  useSession,
  type ContentItem,
  type PlayerState,
  type SpotifySession,
} from '@wwdrew/expo-spotify-sdk'

import FiveByFiveScreen from '@/app/gym/lifting/five-by-five'
import GymScreen from '@/app/gym/lifting/workout'
import { PROGRAMME } from '@/lib/gymProgramme'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import { useGymLogStore } from '@/stores/GymLogStore'

const mockReadArtwork = jest.fn<Promise<string>, [string]>()
const mockDeleteArtwork = jest.fn<void, [string]>()

jest.mock('expo-file-system', () => ({
  File: jest.fn((uri: string) => ({
    base64: () => mockReadArtwork(uri),
    delete: () => mockDeleteArtwork(uri),
  })),
}))

jest.mock('@wwdrew/expo-spotify-sdk', () => ({
  AppRemote: {
    connect: jest.fn(() => Promise.resolve()),
    disconnect: jest.fn(() => Promise.resolve()),
  },
  Auth: {
    isAvailable: jest.fn(() => true),
    cancelPending: jest.fn(() => Promise.resolve()),
    authenticate: jest.fn(() => Promise.resolve({ accessToken: 'token' })),
  },
  Content: {
    getRecommendedContentItems: jest.fn(),
    getChildren: jest.fn(),
  },
  Images: { load: jest.fn() },
  Player: {
    play: jest.fn(),
    pause: jest.fn(() => Promise.resolve()),
    resume: jest.fn(() => Promise.resolve()),
    skipNext: jest.fn(() => Promise.resolve()),
    skipPrevious: jest.fn(() => Promise.resolve()),
  },
  SpotifyURI: { unsafe: jest.fn((uri: string) => uri) },
  useConnectionState: jest.fn(() => 'disconnected'),
  usePlayerState: jest.fn(() => null),
  useSession: jest.fn(() => null),
}))

jest.mock('@/hooks/useThemeColor', () => {
  const { Colors } =
    jest.requireActual<typeof import('@/constants/Colors')>(
      '@/constants/Colors',
    )
  return { useTheme: jest.fn(() => Colors.dark) }
})

const playback: PlayerState = {
  track: {
    uri: 'spotify:track:lift',
    name: 'Lift',
    duration: 180_000,
    artist: { name: 'Zedd', uri: 'spotify:artist:zedd' },
    album: { name: 'Album', uri: 'spotify:album:album' },
    isSaved: false,
    isEpisode: false,
    isPodcast: false,
    isAdvertisement: false,
  },
  playbackPosition: 0,
  playbackSpeed: 1,
  isPaused: false,
  playbackOptions: { isShuffling: false, repeatMode: 0 },
  playbackRestrictions: {
    canSkipNext: true,
    canSkipPrevious: true,
    canRepeatTrack: true,
    canRepeatContext: true,
    canToggleShuffle: true,
    canSeek: true,
  },
  contextTitle: 'Playlist',
  contextUri: 'spotify:playlist:lift',
}
const recent: ContentItem = {
  identifier: 'recent',
  uri: 'spotify:app:recent',
  title: 'Recently played',
  subtitle: null,
  contentDescription: null,
  imageIdentifier: null,
  isAvailableOffline: false,
  isPlayable: false,
  isContainer: true,
  isPinned: false,
}
const playlist: ContentItem = {
  ...recent,
  identifier: 'lifting-mix',
  uri: 'spotify:user:listener:playlist:0123456789ABCDEFGHIJKL',
  title: 'Lifting mix',
  imageIdentifier: 'playlist-cover',
  isPlayable: true,
}
const artworkFile = 'file:///tmp/expo-spotify-image-test.png'

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(useConnectionState).mockReturnValue('disconnected')
  jest.mocked(usePlayerState).mockReturnValue(null)
  jest.mocked(useSession).mockReturnValue(null)
  jest
    .mocked(Content.getRecommendedContentItems)
    .mockReset()
    .mockResolvedValue([])
  jest.mocked(Content.getChildren).mockReset().mockResolvedValue([])
  jest.mocked(Images.load).mockReset().mockResolvedValue({ uri: artworkFile })
  jest.mocked(Player.play).mockReset().mockResolvedValue()
  mockReadArtwork.mockReset().mockResolvedValue('image-data')
  mockDeleteArtwork.mockReset()
  jest.mocked(useLocalSearchParams).mockReturnValue({ date: '2026-10-17' })
  useGymLogStore.setState({ programmeStart: '2026-10-17', logs: {} })
})

afterEach(() => {
  jest.useRealTimers()
  jest.restoreAllMocks()
})

describe('Lifting workout', () => {
  it('connects to Spotify only after an explicit tap', async () => {
    render(<GymScreen />)
    fireEvent.press(screen.getByTestId('gym-spotify-player'))
    fireEvent.press(screen.getByText('Connect Spotify'))

    await waitFor(() => {
      expect(Auth.authenticate).toHaveBeenCalledWith({
        scopes: ['app-remote-control'],
      })
      expect(AppRemote.connect).toHaveBeenCalledWith('token')
    })
  })

  it('cancels abandoned authorization and ignores its late result during a retry', async () => {
    let finishFirst!: (session: SpotifySession) => void
    let finishRetry!: (session: SpotifySession) => void
    jest
      .mocked(Auth.authenticate)
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finishFirst = resolve
        }),
      )
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finishRetry = resolve
        }),
      )
    render(<GymScreen />)
    fireEvent.press(screen.getByTestId('gym-spotify-player'))
    fireEvent.press(screen.getByText('Connect Spotify'))
    await waitFor(() => expect(Auth.authenticate).toHaveBeenCalledTimes(1))
    fireEvent.press(screen.getByLabelText('Close Spotify controls'))
    expect(Auth.cancelPending).toHaveBeenCalledTimes(2)
    expect(AppRemote.disconnect).not.toHaveBeenCalled()
    fireEvent.press(screen.getByTestId('gym-spotify-player'))
    await waitFor(() =>
      expect(screen.getByText('Connect Spotify')).toBeEnabled(),
    )
    fireEvent.press(screen.getByText('Connect Spotify'))
    await waitFor(() => expect(Auth.authenticate).toHaveBeenCalledTimes(2))

    const session: SpotifySession = {
      accessToken: 'cancelled-token',
      refreshToken: null,
      expirationDate: Date.now() + 60_000,
      scopes: ['app-remote-control'],
    }
    await act(async () => {
      finishFirst(session)
    })
    expect(AppRemote.connect).not.toHaveBeenCalled()
    expect(screen.getByText('Connecting…')).toBeDisabled()
    await act(async () => {
      finishRetry({ ...session, accessToken: 'retry-token' })
    })
    expect(AppRemote.connect).toHaveBeenCalledTimes(1)
    expect(AppRemote.connect).toHaveBeenCalledWith('retry-token')
    expect(screen.getByText('Connect Spotify')).toBeEnabled()
  })

  it('disconnects an abandoned App Remote connection before allowing a retry', async () => {
    let failFirst!: (error: Error) => void
    let finishDisconnect!: () => void
    jest.mocked(AppRemote.connect).mockReturnValueOnce(
      new Promise((_, reject) => {
        failFirst = reject
      }),
    )
    jest.mocked(AppRemote.disconnect).mockReturnValueOnce(
      new Promise((resolve) => {
        finishDisconnect = resolve
      }),
    )
    render(<GymScreen />)
    fireEvent.press(screen.getByTestId('gym-spotify-player'))
    fireEvent.press(screen.getByText('Connect Spotify'))
    await waitFor(() => expect(AppRemote.connect).toHaveBeenCalledTimes(1))

    fireEvent.press(screen.getByLabelText('Close Spotify controls'))
    expect(AppRemote.disconnect).toHaveBeenCalledTimes(1)
    expect(Auth.cancelPending).toHaveBeenCalledTimes(1)
    fireEvent.press(screen.getByTestId('gym-spotify-player'))
    await act(async () => {
      failFirst(new Error('Disconnected before connection completed'))
    })
    expect(screen.queryByText(/Could not connect/)).toBeNull()
    fireEvent.press(screen.getByText('Connecting…'))
    expect(screen.getByText('Connecting…')).toBeDisabled()
    expect(Auth.authenticate).toHaveBeenCalledTimes(1)

    await act(async () => {
      finishDisconnect()
    })
    fireEvent.press(screen.getByText('Connect Spotify'))
    await waitFor(() => expect(AppRemote.connect).toHaveBeenCalledTimes(2))
    expect(screen.getByText('Connect Spotify')).toBeEnabled()
  })

  it('shows Spotify playback and controls from the lifting screen', async () => {
    jest.mocked(useConnectionState).mockReturnValue('connected')
    jest.mocked(usePlayerState).mockReturnValue(playback)
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)

    render(<GymScreen />)
    expect(screen.getByText('Lift')).toBeTruthy()
    fireEvent.press(screen.getByTestId('gym-spotify-player'))
    expect(
      within(screen.getByTestId('gym-spotify-sheet')).getByText('Zedd'),
    ).toBeTruthy()
    await screen.findByText('No recent or recommended playlists available.')
    fireEvent.press(screen.getByLabelText('Next track'))
    expect(Player.skipNext).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.getByLabelText('Pause')).toBeEnabled())
    fireEvent.press(screen.getByLabelText('Pause'))
    expect(Player.pause).toHaveBeenCalledTimes(1)
    fireEvent.press(screen.getByRole('link', { name: 'Open Spotify' }))
    await waitFor(() => expect(open).toHaveBeenCalledWith('spotify://'))
    expect(AppRemote.connect).not.toHaveBeenCalled()
  })

  it('loads album art into memory and deletes the SDK temporary file', async () => {
    jest.mocked(useConnectionState).mockReturnValue('connected')
    jest.mocked(usePlayerState).mockReturnValue({
      ...playback,
      track: { ...playback.track, imageIdentifier: 'album-cover' },
    })
    render(<GymScreen />)

    const image = await screen.findByLabelText('Album art for Lift')
    expect(image.props.source).toEqual({
      uri: 'data:image/png;base64,image-data',
    })
    expect(Images.load).toHaveBeenCalledWith(
      { imageIdentifier: 'album-cover' },
      'medium',
    )
    expect(File).toHaveBeenCalledWith(artworkFile)
    expect(mockDeleteArtwork).toHaveBeenCalledWith(artworkFile)
    expect(Content.getRecommendedContentItems).not.toHaveBeenCalled()
  })

  it('discards a late cover after the track changes but still deletes its file', async () => {
    let finishOld!: (value: { uri: string }) => void
    jest.mocked(Images.load).mockReturnValueOnce(
      new Promise((resolve) => {
        finishOld = resolve
      }),
    )
    jest.mocked(useConnectionState).mockReturnValue('connected')
    jest.mocked(usePlayerState).mockReturnValue({
      ...playback,
      track: { ...playback.track, imageIdentifier: 'old-cover' },
    })
    const view = render(<GymScreen />)
    jest.mocked(usePlayerState).mockReturnValue({
      ...playback,
      track: {
        ...playback.track,
        name: 'Next song',
        imageIdentifier: 'new-cover',
      },
    })
    view.rerender(<GymScreen />)
    await screen.findByLabelText('Album art for Next song')
    const oldFile = 'file:///tmp/expo-spotify-image-old.png'
    await act(async () => {
      finishOld({ uri: oldFile })
    })

    expect(screen.queryByLabelText('Album art for Lift')).toBeNull()
    expect(
      screen.getByLabelText('Album art for Next song').props.source,
    ).toEqual({
      uri: 'data:image/png;base64,image-data',
    })
    expect(mockDeleteArtwork).toHaveBeenCalledWith(oldFile)
    expect(mockReadArtwork).not.toHaveBeenCalledWith(oldFile)
  })

  it('shows unavailable art and removes its file when decoding fails', async () => {
    mockReadArtwork.mockRejectedValueOnce(new Error('native read error'))
    jest.mocked(useConnectionState).mockReturnValue('connected')
    jest.mocked(usePlayerState).mockReturnValue({
      ...playback,
      track: { ...playback.track, imageIdentifier: 'broken-cover' },
    })
    render(<GymScreen />)
    await screen.findByLabelText('Album art for Lift, unavailable')
    expect(screen.getByText('No art')).toBeTruthy()
    expect(mockDeleteArtwork).toHaveBeenCalledWith(artworkFile)
    expect(screen.queryByText('native read error')).toBeNull()
  })

  it('browses recent playlists and their contents, plays a selection, and goes back', async () => {
    jest.useFakeTimers()
    const song: ContentItem = {
      ...playlist,
      identifier: 'song',
      uri: playback.track.uri,
      title: 'Lift',
      imageIdentifier: null,
      isContainer: false,
    }
    jest.mocked(useConnectionState).mockReturnValue('connected')
    jest.mocked(Content.getRecommendedContentItems).mockResolvedValue([recent])
    jest
      .mocked(Content.getChildren)
      .mockImplementation(async (item) =>
        item.uri === recent.uri ? [playlist] : [song],
      )
    render(<GymScreen />)
    expect(Content.getRecommendedContentItems).not.toHaveBeenCalled()
    fireEvent.press(screen.getByTestId('gym-spotify-player'))
    fireEvent.press(await screen.findByLabelText('Browse Recently played'))
    await screen.findByLabelText('Browse Lifting mix')
    await screen.findByLabelText('Cover art for Lifting mix')
    expect(Content.getRecommendedContentItems).toHaveBeenCalledWith('default')
    expect(Content.getChildren).toHaveBeenCalledWith(recent)

    jest
      .mocked(Player.play)
      .mockRejectedValueOnce(new Error('native playback error'))
    fireEvent.press(screen.getByLabelText('Play Lifting mix'))
    await screen.findByText(
      'Could not change playback. Try again or open Spotify.',
    )
    expect(SpotifyURI.unsafe).toHaveBeenCalledWith(playlist.uri)
    expect(Player.play).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('native playback error')).toBeNull()
    await waitFor(() =>
      expect(screen.getByLabelText('Play Lifting mix')).toBeEnabled(),
    )
    fireEvent.press(screen.getByLabelText('Play Lifting mix'))
    await waitFor(() => expect(Player.play).toHaveBeenCalledTimes(2))
    await waitFor(() =>
      expect(
        screen.queryByText(
          'Could not change playback. Try again or open Spotify.',
        ),
      ).toBeNull(),
    )
    expect(Player.play).toHaveBeenCalledWith(playlist.uri)

    fireEvent.press(screen.getByLabelText('Browse Lifting mix'))
    await screen.findByLabelText('Play Lift')
    expect(Content.getChildren).toHaveBeenCalledWith(playlist)
    fireEvent.press(screen.getByLabelText('Back to Spotify playlists'))
    await screen.findByLabelText('Browse Lifting mix')
    fireEvent.press(screen.getByLabelText('Back to Spotify playlists'))
    await screen.findByLabelText('Browse Recently played')
  })

  it('reports a playlist error, retries, and shows an honest empty state', async () => {
    jest.mocked(useConnectionState).mockReturnValue('connected')
    jest
      .mocked(Content.getRecommendedContentItems)
      .mockRejectedValueOnce(new Error('offline'))
    render(<GymScreen />)
    fireEvent.press(screen.getByTestId('gym-spotify-player'))
    await screen.findByText('Could not load Spotify content.')
    fireEvent.press(screen.getByText('Retry playlists'))
    await screen.findByText('No recent or recommended playlists available.')
    expect(Content.getRecommendedContentItems).toHaveBeenCalledTimes(2)
    expect(screen.queryByText('Could not load Spotify content.')).toBeNull()
  })

  it('ignores a late playlist response after disconnecting', async () => {
    let finish!: (items: ContentItem[]) => void
    jest.mocked(Content.getRecommendedContentItems).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    jest.mocked(useConnectionState).mockReturnValue('connected')
    const view = render(<GymScreen />)
    fireEvent.press(screen.getByTestId('gym-spotify-player'))
    expect(screen.getByLabelText('Loading Spotify playlists')).toBeTruthy()
    jest.mocked(useConnectionState).mockReturnValue('disconnected')
    view.rerender(<GymScreen />)
    await act(async () => {
      finish([playlist])
    })
    expect(screen.queryByLabelText('Browse Lifting mix')).toBeNull()
    expect(Images.load).not.toHaveBeenCalled()
    expect(screen.getByText('Connect Spotify')).toBeTruthy()
  })

  it.each(['web', 'android'] as const)(
    'opens Spotify without native browsing on %s',
    async (platform) => {
      jest.replaceProperty(Platform, 'OS', platform)
      jest.mocked(useConnectionState).mockReturnValue('connected')
      jest.mocked(usePlayerState).mockReturnValue({
        ...playback,
        track: { ...playback.track, imageIdentifier: 'album-cover' },
      })
      const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
      render(<GymScreen />)
      fireEvent.press(screen.getByTestId('gym-spotify-player'))
      fireEvent.press(screen.getByRole('link', { name: 'Open Spotify' }))
      await waitFor(() =>
        expect(open).toHaveBeenCalledWith(
          platform === 'web' ? 'https://open.spotify.com' : 'spotify://',
        ),
      )
      expect(Content.getRecommendedContentItems).not.toHaveBeenCalled()
      expect(Images.load).not.toHaveBeenCalled()
      expect(Auth.authenticate).not.toHaveBeenCalled()
      expect(screen.queryByText('Recent & recommended')).toBeNull()
    },
  )

  it('logs a set and finishes the workout', () => {
    render(<GymScreen />)

    const first = PROGRAMME[0].exercises[0]
    expect(screen.getByText(PROGRAMME[0].title)).toBeTruthy()
    expect(screen.queryByTestId('gym-finish')).toBeNull()

    fireEvent.changeText(screen.getByTestId(`gym-kg-${first.id}`), '42.5')
    fireEvent.press(screen.getByTestId(`gym-save-set-${first.id}`))
    expect(
      screen.getByLabelText(`Set 1: ${first.reps} reps × 42.5 kg`),
    ).toBeTruthy()
    expect(screen.getByText(/Set: 2 of 3/i)).toBeTruthy()
    expect(screen.getByTestId('gym-rest-timer')).toBeTruthy()

    fireEvent.press(screen.getByLabelText('1 rep max'))
    expect(screen.getByTestId('gym-one-rep-max')).toHaveTextContent(/63\.8 kg/)

    // The rating is a full-screen page after the final exercise has a set.
    expect(screen.queryByTestId('gym-finish')).toBeNull()
    const last = PROGRAMME[0].exercises.at(-1)!
    for (let i = 1; i < PROGRAMME[0].exercises.length; i++)
      fireEvent.press(screen.getByLabelText('Next exercise'))
    expect(screen.getByLabelText('Next exercise')).toBeDisabled()
    fireEvent.press(screen.getByTestId(`gym-save-set-${last.id}`))
    expect(screen.queryByTestId('gym-finish')).toBeNull()
    fireEvent.press(screen.getByLabelText('Next exercise'))
    expect(screen.queryByTestId(`gym-exercise-${last.id}`)).toBeNull()
    expect(screen.queryByTestId('gym-notes')).toBeNull()
    fireEvent.press(screen.getByTestId('gym-finish'))

    expect(screen.getByTestId('gym-finished')).toBeTruthy()
    expect(screen.queryByTestId(`gym-save-set-${first.id}`)).toBeNull()
    expect(screen.queryByTestId('gym-rest-timer')).toBeNull()
    expect(useGymLogStore.getState().logs['2026-10-17']).toMatchObject({
      day: '1',
      rating: 7,
    })
  })

  it('plans five set circles for To Failure exercises', () => {
    useGymLogStore.setState({ programmeStart: '2026-10-17' })
    render(<GymScreen />)
    const failure = PROGRAMME[0].exercises.findIndex(
      (e) => e.sets === 'To Failure',
    )
    for (let i = 0; i < failure; i++)
      fireEvent.press(screen.getByLabelText('Next exercise'))
    const { reps } = PROGRAMME[0].exercises[failure]
    expect(screen.getByLabelText('Log set 1')).toBeTruthy()
    expect(screen.getByLabelText(`Set 5: target ${reps} reps`)).toBeTruthy()
    expect(screen.queryByLabelText(/^(Log set|Set) 6/)).toBeNull()
  })

  it('undoes the last set and stops its rest timer', () => {
    useGymLogStore.setState({ programmeStart: '2026-10-17' })
    render(<GymScreen />)
    const first = PROGRAMME[0].exercises[0]
    fireEvent.press(screen.getByTestId(`gym-save-set-${first.id}`))
    expect(screen.getByTestId(`gym-set-${first.id}-1`)).toBeTruthy()

    fireEvent.press(screen.getByTestId(`gym-undo-set-${first.id}`))
    expect(screen.queryByTestId(`gym-set-${first.id}-1`)).toBeNull()
    expect(screen.queryByTestId('gym-rest-timer')).toBeNull()
    expect(
      useGymLogStore.getState().logs['2026-10-17']?.sets[first.id] ?? [],
    ).toHaveLength(0)
  })

  it('times adjustable rest between sets', () => {
    jest.useFakeTimers()
    useGymLogStore.setState({ programmeStart: '2026-10-17' })
    render(<GymScreen />)
    const first = PROGRAMME[0].exercises[0]
    expect(screen.queryByTestId('gym-rest-timer')).toBeNull()

    fireEvent.press(screen.getByTestId(`gym-save-set-${first.id}`))
    expect(screen.getByLabelText('Resting 0:00')).toBeTruthy()
    expect(screen.getByText('Rest 2:00')).toBeTruthy()

    act(() => jest.advanceTimersByTime(65_000))
    expect(screen.getByLabelText('Resting 1:05')).toBeTruthy()

    fireEvent.press(screen.getByLabelText('Add 15 seconds of rest'))
    expect(screen.getByText('Rest 2:15')).toBeTruthy()
    act(() => jest.advanceTimersByTime(75_000))
    expect(screen.getByText('Rest done')).toBeTruthy()

    // The adjustment carries over to the next set of the same exercise.
    fireEvent.press(screen.getByTestId(`gym-save-set-${first.id}`))
    expect(screen.getByLabelText('Resting 0:00')).toBeTruthy()
    expect(screen.getByText('Rest 2:15')).toBeTruthy()

    fireEvent.press(screen.getByLabelText('Dismiss rest timer'))
    expect(screen.queryByTestId('gym-rest-timer')).toBeNull()
  })

  it('moves to the next exercise once the planned sets are done', () => {
    useGymLogStore.setState({ programmeStart: '2026-10-17' })
    render(<GymScreen />)
    const [first, second] = PROGRAMME[0].exercises
    const planned = typeof first.sets === 'number' ? first.sets : 5
    for (let i = 0; i < planned; i++) {
      expect(screen.getByTestId(`gym-exercise-${first.id}`)).toBeTruthy()
      fireEvent.press(screen.getByTestId(`gym-save-set-${first.id}`))
    }
    expect(screen.getByTestId(`gym-exercise-${second.id}`)).toBeTruthy()
    expect(screen.getByTestId('gym-rest-timer')).toBeTruthy()

    // An extra "+" set stays on its exercise.
    fireEvent.press(screen.getByLabelText('Previous exercise'))
    fireEvent.press(screen.getByLabelText(`Log set ${planned + 1}`))
    expect(
      screen.getByTestId(`gym-set-${first.id}-${planned + 1}`),
    ).toBeTruthy()
  })

  it('opens the rating page after the final planned set', () => {
    useGymLogStore.setState({ programmeStart: '2026-10-17' })
    render(<GymScreen />)
    const { exercises } = PROGRAMME[0]
    const last = exercises.at(-1)!
    for (let i = 1; i < exercises.length; i++)
      fireEvent.press(screen.getByLabelText('Next exercise'))
    const planned = typeof last.sets === 'number' ? last.sets : 5
    for (let i = 0; i < planned; i++)
      fireEvent.press(screen.getByTestId(`gym-save-set-${last.id}`))
    expect(screen.getByTestId('gym-finish')).toBeTruthy()

    fireEvent.press(screen.getByLabelText('Previous exercise'))
    expect(screen.getByTestId(`gym-exercise-${last.id}`)).toBeTruthy()
  })

  it('opens a finished day on its summary', () => {
    useGymLogStore.setState({
      programmeStart: '2026-10-17',
      logs: {
        '2026-10-17': {
          day: '1',
          sets: {},
          rating: 8,
          finishedAt: new Date(2026, 9, 17, 9).toISOString(),
        },
      },
    })
    render(<GymScreen />)
    expect(screen.getByTestId('gym-finished')).toHaveTextContent(/rated 8\/10/)
  })

  it('steps rest from the shown target after clamping', () => {
    useGymLogStore.setState({ programmeStart: '2026-10-17' })
    render(<GymScreen />)
    const first = PROGRAMME[0].exercises[0]
    const reps = screen.getByTestId(`gym-reps-${first.id}`)
    fireEvent.changeText(reps, String(first.reps - 1))
    fireEvent.press(screen.getByTestId(`gym-save-set-${first.id}`))
    for (let i = 0; i < 12; i++)
      fireEvent.press(screen.getByLabelText('Remove 15 seconds of rest'))
    expect(screen.getByText('Rest 0:30')).toBeTruthy()

    // Hitting the target lowers the base below the floor; +15 still shows.
    fireEvent.changeText(reps, String(first.reps))
    fireEvent.press(screen.getByTestId(`gym-save-set-${first.id}`))
    expect(screen.getByText('Rest 0:30')).toBeTruthy()
    fireEvent.press(screen.getByLabelText('Add 15 seconds of rest'))
    expect(screen.getByText('Rest 0:45')).toBeTruthy()
  })

  it('expands the exercise card to full screen', () => {
    useGymLogStore.setState({ programmeStart: '2026-10-17' })
    render(<GymScreen />)
    expect(screen.getByText(PROGRAMME[0].title)).toBeTruthy()
    expect(screen.getByText('Lifting')).toBeTruthy()

    fireEvent.press(screen.getByLabelText('Full screen'))
    expect(screen.queryByText(PROGRAMME[0].title)).toBeNull()
    expect(screen.queryByText('Lifting')).toBeNull()
    expect(screen.queryByLabelText('Back to programme overview')).toBeNull()

    fireEvent.press(screen.getByLabelText('Exit full screen'))
    expect(screen.getByText(PROGRAMME[0].title)).toBeTruthy()
  })

  it('blocks saving an invalid weight', () => {
    useGymLogStore.setState({ programmeStart: '2026-10-17' })
    render(<GymScreen />)
    const first = PROGRAMME[0].exercises[0]
    fireEvent.changeText(screen.getByTestId(`gym-kg-${first.id}`), '0')
    expect(screen.getByTestId(`gym-save-set-${first.id}`)).toBeDisabled()
  })

  it('shows rest days without exercises', () => {
    useGymLogStore.setState({ programmeStart: '2026-10-12' })
    render(<GymScreen />)
    expect(screen.getByText('Active rest day. Cardio only.')).toBeTruthy()
    expect(screen.queryByTestId('gym-finish')).toBeNull()
  })

  it('moves between exercises one at a time', () => {
    useGymLogStore.setState({ programmeStart: '2026-10-17' })
    render(<GymScreen />)
    const [first, second] = PROGRAMME[0].exercises
    expect(screen.getByTestId(`gym-exercise-${first.id}`)).toBeTruthy()
    expect(screen.getByLabelText('Previous exercise')).toBeDisabled()

    fireEvent.press(screen.getByLabelText('Next exercise'))
    expect(screen.getByTestId(`gym-exercise-${second.id}`)).toBeTruthy()
    expect(screen.queryByTestId(`gym-exercise-${first.id}`)).toBeNull()
    expect(screen.getByText(second.title)).toBeTruthy()
  })

  it('blocks saving invalid reps', () => {
    useGymLogStore.setState({ programmeStart: '2026-10-17' })
    render(<GymScreen />)
    const first = PROGRAMME[0].exercises[0]
    fireEvent.changeText(screen.getByTestId(`gym-reps-${first.id}`), '')
    expect(screen.getByTestId(`gym-save-set-${first.id}`)).toBeDisabled()
  })

  it('opens an exercise demo from the info button', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          name: 'cable reverse-grip pushdown',
          gifUrl: 'https://static.exercisedb.dev/media/VjYliFZ.gif',
          targetMuscles: ['triceps'],
          secondaryMuscles: ['forearms'],
          equipments: ['cable'],
          instructions: ['Step:1 Attach a straight bar.'],
        },
      }),
    } as Response)
    const day = PROGRAMME.findIndex((d) =>
      d.exercises.some(
        (e) => e.title === 'Reverse-Grip Cable Triceps Pushdown',
      ),
    )
    useGymLogStore.setState({
      programmeStart: localDateKey(new Date(2026, 9, 17 - day)),
    })
    render(<GymScreen />)
    const index = PROGRAMME[day].exercises.findIndex(
      (e) => e.title === 'Reverse-Grip Cable Triceps Pushdown',
    )
    for (let i = 0; i < index; i++)
      fireEvent.press(screen.getByLabelText('Next exercise'))

    fireEvent.press(screen.getByTestId('gym-exercise-info'))

    expect(await screen.findByTestId('gym-exercise-info-media')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledWith(
      'https://oss.exercisedb.dev/api/v1/exercises/VjYliFZ',
      expect.anything(),
    )
    expect(screen.getByText('Attach a straight bar.')).toBeTruthy()
    fireEvent.press(screen.getByLabelText('Close'))
    expect(screen.queryByTestId('gym-exercise-info-sheet')).toBeNull()
    fetchMock.mockRestore()
  })

  it('runs a 5×5 short day without starting the programme', () => {
    render(<FiveByFiveScreen />)

    expect(screen.getByText('StrongLifts 5×5')).toBeTruthy()
    expect(screen.getByText('Workout A')).toBeTruthy()
    expect(screen.queryByTestId('gym-start-programme')).toBeNull()
    expect(screen.queryByTestId('gym-short-day')).toBeNull()
    expect(screen.getByTestId('gym-next-weight')).toHaveTextContent(
      /First 5×5 · start light/,
    )
    fireEvent.changeText(screen.getByTestId('gym-kg-squat'), '60')
    fireEvent.press(screen.getByTestId('gym-save-set-squat'))

    expect(useGymLogStore.getState().logs['2026-10-17']).toMatchObject({
      day: '5x5-A',
      sets: { squat: [{ reps: 5, kilograms: 60 }] },
    })
  })

  it('alternates to Workout B and suggests the next weight', () => {
    const full = Array.from({ length: 5 }, () => ({ reps: 5, kilograms: 60 }))
    useGymLogStore.setState({
      logs: {
        '2026-10-15': {
          day: '5x5-A',
          sets: { squat: full },
          finishedAt: null,
          rating: null,
        },
      },
    })
    render(<FiveByFiveScreen />)

    expect(screen.getByText('Workout B')).toBeTruthy()
    expect(screen.getByTestId('gym-next-weight')).toHaveTextContent(
      /Next 62\.5 kg · \+2\.5 kg after a full 5×5/,
    )
    expect(screen.getByTestId('gym-kg-squat')).toHaveProp('value', '62.5')
  })

  it('keeps a logged body-weight set instead of the suggested load', () => {
    const full = Array.from({ length: 5 }, () => ({ reps: 5, kilograms: 60 }))
    useGymLogStore.setState({
      logs: {
        '2026-10-15': {
          day: '5x5-A',
          sets: { squat: full },
          finishedAt: null,
          rating: null,
        },
        '2026-10-17': {
          day: '5x5-B',
          sets: { squat: [{ reps: 5, kilograms: null }] },
          finishedAt: null,
          rating: null,
        },
      },
    })
    render(<FiveByFiveScreen />)

    expect(screen.getByTestId('gym-kg-squat')).toHaveProp('value', '')
  })
})
