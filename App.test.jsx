import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import App from './App.jsx'
test('renders title', () => {
  render(<App />)
  expect(screen.getByText(/Liquid Cooling Calculator/i)).toBeInTheDocument()
})