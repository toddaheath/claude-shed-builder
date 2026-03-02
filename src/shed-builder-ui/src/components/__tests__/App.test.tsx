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
  extractApiError: vi.fn((_err: unknown, fallback: string) => fallback),
}));

// We need to import AFTER mocking
const getApi = () => import('../../services/api');

describe('App', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset mock implementations that may have been changed by previous tests
    const { api: mockApi, getStoredToken, extractApiError } = await getApi();
    vi.mocked(getStoredToken).mockReturnValue(null);
    vi.mocked(mockApi.listDesigns).mockResolvedValue({ items: [], totalCount: 0 });
    vi.mocked(mockApi.listVersions).mockResolvedValue([]);
    vi.mocked(extractApiError).mockImplementation((_err: unknown, fallback: string) => fallback);
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

  it('registers successfully and shows authenticated view', async () => {
    const { api: mockApi, setStoredToken } = await getApi();
    vi.mocked(mockApi.register).mockResolvedValue({ token: 'new-token' });

    render(<App />);

    await userEvent.type(screen.getByLabelText(/name/i), 'Jane');
    await userEvent.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'Str0ng!Pass123');
    await userEvent.click(screen.getByRole('button', { name: /get started/i }));

    await waitFor(() => {
      expect(mockApi.register).toHaveBeenCalledWith({
        name: 'Jane',
        email: 'jane@example.com',
        password: 'Str0ng!Pass123',
      });
    });
    expect(vi.mocked(setStoredToken)).toHaveBeenCalledWith('new-token');
    expect(screen.getByText('Select or create a design to begin')).toBeInTheDocument();
  });

  it('shows error on registration failure', async () => {
    const { api: mockApi, extractApiError } = await getApi();
    vi.mocked(mockApi.register).mockRejectedValue({ response: { status: 409 } });
    vi.mocked(extractApiError).mockReturnValue('An account with this email already exists.');

    render(<App />);

    await userEvent.type(screen.getByLabelText(/name/i), 'Jane');
    await userEvent.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'Str0ng!Pass123');
    await userEvent.click(screen.getByRole('button', { name: /get started/i }));

    await waitFor(() => {
      expect(screen.getByText('An account with this email already exists.')).toBeInTheDocument();
    });
  });

  it('logs in successfully and shows authenticated view', async () => {
    const { api: mockApi, setStoredToken } = await getApi();
    vi.mocked(mockApi.login).mockResolvedValue({ token: 'login-token' });

    render(<App />);

    // Switch to login screen
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await userEvent.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'Str0ng!Pass123');
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mockApi.login).toHaveBeenCalledWith({
        email: 'jane@example.com',
        password: 'Str0ng!Pass123',
      });
    });
    expect(vi.mocked(setStoredToken)).toHaveBeenCalledWith('login-token');
    expect(screen.getByText('Select or create a design to begin')).toBeInTheDocument();
  });

  it('shows error on login failure', async () => {
    const { api: mockApi, extractApiError } = await getApi();
    vi.mocked(mockApi.login).mockRejectedValue(new Error('Unauthorized'));
    vi.mocked(extractApiError).mockReturnValue('Invalid email or password.');

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await userEvent.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password.')).toBeInTheDocument();
    });
  });

  it('signs out and returns to register screen', async () => {
    const { getStoredToken, setStoredToken } = await getApi();
    vi.mocked(getStoredToken).mockReturnValue('valid-token');

    const { unmount } = render(<App />);

    // Should be authenticated
    await waitFor(() => {
      expect(screen.getByLabelText('Sign out')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByLabelText('Sign out'));

    await waitFor(() => {
      expect(screen.getByText('Create an account to get started.')).toBeInTheDocument();
    });
    expect(vi.mocked(setStoredToken)).toHaveBeenCalledWith(null);

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
