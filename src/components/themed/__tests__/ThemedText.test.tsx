import * as React from 'react'
import { render, screen } from '@testing-library/react-native'
import { ThemedText } from '../ThemedText'

describe('ThemedText', () => {
  it('renders text content correctly', () => {
    const testText = 'Snapshot test!'
    render(<ThemedText>{testText}</ThemedText>)

    const textElement = screen.getByText(testText)
    expect(textElement).toBeTruthy()
  })

  it('matches snapshot', () => {
    const { toJSON } = render(<ThemedText>Snapshot test!</ThemedText>)
    expect(toJSON()).toMatchSnapshot()
  })
})
