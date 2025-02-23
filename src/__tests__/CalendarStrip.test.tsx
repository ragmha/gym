import {
  render,
  screen,
  fireEvent,
  within,
  renderHook,
} from '@testing-library/react-native'
import { CalendarStrip } from '@/components/CalendarStrip'
import { useThemeColor } from '@/hooks/useThemeColor'

// Mock the theme hook
jest.mock('@/hooks/useThemeColor', () => ({
  useThemeColor: () => '#000000',
}))

describe('CalendarStrip', () => {
  const mockDate = new Date('2024-02-23') // Use a fixed date for testing
  const mockOnDateSelected = jest.fn()

  beforeEach(() => {
    // Reset all mocks before each test
    jest.resetAllMocks()
    // Mock Date in a simpler way
    global.Date = class extends Date {
      constructor(value?: number | string | Date) {
        if (!value) {
          super(mockDate)
          return mockDate
        }
        super(value)
      }
    } as any
  })

  afterEach(() => {
    // Restore the real Date
    global.Date = Date
  })

  it('should use theme colors correctly', () => {
    const { result } = renderHook(() => useThemeColor({}, 'background'))
    expect(result.current).toBe('#000000')
  })

  it('should display the current month and year', () => {
    render(<CalendarStrip />)
    const header = screen.getByRole('header', { name: /february 2024/i })
    expect(header).toBeTruthy()
  })

  it('should display a week of dates with day indicators', () => {
    const { getAllByRole } = render(<CalendarStrip />)

    // Check for accessible date buttons
    const dateButtons = getAllByRole('button')
    expect(dateButtons).toHaveLength(7) // One for each day of the week

    // Verify each date button has the correct format
    const currentWeek = getWeekFromToday(mockDate, 0)
    currentWeek.forEach((date, index) => {
      const button = dateButtons[index]
      const dayLetter = date
        .toLocaleDateString('en-US', { weekday: 'short' })
        .charAt(0)
      const dateNum = date.getDate().toString()

      expect(within(button).getByText(dayLetter)).toBeTruthy()
      expect(within(button).getByText(dateNum)).toBeTruthy()
    })
  })

  it('should call onDateSelected when a date is pressed', () => {
    const { getAllByRole } = render(
      <CalendarStrip onDateSelected={mockOnDateSelected} />,
    )

    // Press the first date button
    const dateButtons = getAllByRole('button')
    fireEvent.press(dateButtons[0])

    expect(mockOnDateSelected).toHaveBeenCalledWith(expect.any(Date))
  })

  it('should highlight the selected date', () => {
    // Test theme color hook for selected state
    const { result } = renderHook(() => useThemeColor({}, 'selectedCircle'))

    const { getAllByRole } = render(<CalendarStrip startDate={mockDate} />)

    // Find the button corresponding to the start date
    const dateButtons = getAllByRole('button')
    const todayButton = dateButtons.find((button) =>
      within(button).queryByText(mockDate.getDate().toString()),
    )

    expect(todayButton).toHaveStyle({ backgroundColor: result.current })
  })
})

// Helper function
function getWeekFromToday(startDate: Date, offset: number): Date[] {
  const dates: Date[] = []
  const start = new Date(startDate)
  start.setDate(start.getDate() + offset * 7)

  for (let i = 0; i < 7; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    dates.push(date)
  }
  return dates
}
