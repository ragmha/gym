import { render, screen } from '@testing-library/react-native'

import App from '../App'

it('renders correctly', () => {
  render(<App />)

  expect(screen.getByText(/Hello world/g)).toBeDefined()
})
