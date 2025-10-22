import { render, screen } from '@testing-library/react';
import App from './App';

test('renders home screen title', () => {
  const { unmount } = render(<App />);
  expect(screen.getByText(/emcrypted/i)).toBeInTheDocument();
  unmount();
});
