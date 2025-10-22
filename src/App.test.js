import { render, screen } from '@testing-library/react';
import App from './App';

test('renders home screen title', () => {
  render(<App />);
  const titleElement = screen.getByText(/EMCRYPTED/i);
  expect(titleElement).toBeInTheDocument();
});
