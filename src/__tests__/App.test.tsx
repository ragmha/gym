import App from '@/App'
import { render, screen } from '@/utils/test-utils'

it('renders correctly', () => {
  render(<App />)

  expect(screen.getByText(/Hello world/g)).toBeDefined()
})
