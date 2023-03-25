import { render, screen } from '@testing-library/react-native';

import 'react-native';
import React from 'react';
import App from '../src/App';

it('renders correctly', () => {
  render(<App />);

  expect(screen.getByText(/Hello world/g)).toBeDefined();
});
