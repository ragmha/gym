import App from '@/App'
import { render, screen } from '@/utils/test/test-utils'

it('renders correctly', () => {
  render(<App />)

  expect(screen.getAllByText(/Exercises/g)).toBeDefined()
  expect(screen.getByText(/Weight/g)).toBeDefined()
  expect(screen.getAllByText(/Home/g)).toBeDefined()
})
