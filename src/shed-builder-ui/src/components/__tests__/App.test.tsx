import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock the heavy 3D components to avoid WebGL issues in tests
vi.mock('../ShedViewer3D', () => ({
  default: () => <div data-testid="shed-viewer">3D Viewer</div>,
}));

vi.mock('../../services/api', () => ({
  api: {
    register: vi.fn(),
    login: vi.fn(),
    listDesigns: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
    getDesign: vi.fn(),
    createDesign: vi.fn(),
    updateDesign: vi.fn(),
    deleteDesign: vi.fn(),
    getBom: vi.fn(),
    getCost: vi.fn(),
    listVersions: vi.fn().mockResolvedValue([]),
    createVersion: vi.fn(),
    restoreVersion: vi.fn(),
    changePassword: vi.fn(),
    downloadStl: vi.fn(),
    downloadPdf: vi.fn(),
  },
  getStoredToken: vi.fn(() => null),
  setStoredToken: vi.fn(),
}));

// We need to import AFTER mocking
const getApi = () => import('../../services/api');

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    try { localStorage.removeItem('shed-builder-token'); } catch { /* ignore */ }
    try { localStorage.removeItem('shed-builder-theme'); } catch { /* ignore */ }
  });

  it('shows register screen by default', () => {
    render(<App />);
    expect(screen.getByText('Create an account to get started.')).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('toggles to login screen', async () => {
    render(<App />);
    const signInButton = screen.getByRole('button', { name: /sign in/i });
    await userEvent.click(signInButton);
    expect(screen.getByText('Sign in to your account.')).toBeInTheDocument();
  });

  it('toggles back to register from login', async () => {
    render(<App />);
    // Go to login
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(screen.getByText('Sign in to your account.')).toBeInTheDocument();

    // Go back to register
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(screen.getByText('Create an account to get started.')).toBeInTheDocument();
  });

  it('clears token on auth:expired event', async () => {
    // Start authenticated by mocking getStoredToken to return a token
    const { getStoredToken } = await getApi();
    vi.mocked(getStoredToken).mockReturnValue('valid-token');

    const { unmount } = render(<App />);

    // Dispatch auth:expired
    act(() => {
      window.dispatchEvent(new Event('auth:expired'));
    });

    // Should show register screen (the "Get Started" button)
    await waitFor(() => {
      expect(screen.getByText('Create an account to get started.')).toBeInTheDocument();
    });

    unmount();
  });

  it('shows rate-limit snackbar on api:rate-limited event', async () => {
    render(<App />);

    act(() => {
      window.dispatchEvent(new CustomEvent('api:rate-limited'));
    });

    await waitFor(() => {
      expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
    });
  });
});
