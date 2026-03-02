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

  it('shows change password button when authenticated', async () => {
    const { getStoredToken } = await getApi();
    vi.mocked(getStoredToken).mockReturnValue('valid-token');

    const { unmount } = render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText('Change password')).toBeInTheDocument();
    });

    unmount();
  });

  it('opens change password dialog', async () => {
    const { getStoredToken } = await getApi();
    vi.mocked(getStoredToken).mockReturnValue('valid-token');

    const { unmount } = render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText('Change password')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByLabelText('Change password'));

    expect(screen.getByLabelText('Current Password')).toBeInTheDocument();
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Change Password/i })).toBeInTheDocument();

    unmount();
  });

  it('changes password successfully', async () => {
    const { getStoredToken, api: mockApi } = await getApi();
    vi.mocked(getStoredToken).mockReturnValue('valid-token');
    vi.mocked(mockApi.changePassword).mockResolvedValue(undefined as never);

    const { unmount } = render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText('Change password')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByLabelText('Change password'));
    await userEvent.type(screen.getByLabelText('Current Password'), 'OldPass123!@');
    await userEvent.type(screen.getByLabelText('New Password'), 'NewPass456!@');
    await userEvent.click(screen.getByRole('button', { name: /Change Password/i }));

    await waitFor(() => {
      expect(screen.getByText('Password changed successfully.')).toBeInTheDocument();
    });

    expect(mockApi.changePassword).toHaveBeenCalledWith('OldPass123!@', 'NewPass456!@');

    unmount();
  });

  it('shows error on change password failure', async () => {
    const { getStoredToken, api: mockApi, extractApiError } = await getApi();
    vi.mocked(getStoredToken).mockReturnValue('valid-token');
    vi.mocked(mockApi.changePassword).mockRejectedValue(new Error('wrong password'));
    vi.mocked(extractApiError).mockReturnValue('Current password is incorrect.');

    const { unmount } = render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText('Change password')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByLabelText('Change password'));
    await userEvent.type(screen.getByLabelText('Current Password'), 'WrongPass123!');
    await userEvent.type(screen.getByLabelText('New Password'), 'NewPass456!@');
    await userEvent.click(screen.getByRole('button', { name: /Change Password/i }));

    await waitFor(() => {
      expect(screen.getByText('Current password is incorrect.')).toBeInTheDocument();
    });

    unmount();
  });

  it('toggles dark mode when authenticated', async () => {
    const { getStoredToken } = await getApi();
    vi.mocked(getStoredToken).mockReturnValue('valid-token');

    const { unmount } = render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText('Toggle dark mode')).toBeInTheDocument();
    });

    // Click the dark mode toggle
    await userEvent.click(screen.getByLabelText('Toggle dark mode'));

    // The button should still be present after toggle
    expect(screen.getByLabelText('Toggle dark mode')).toBeInTheDocument();

    unmount();
  });

  it('shows empty state when no design is selected', async () => {
    const { getStoredToken } = await getApi();
    vi.mocked(getStoredToken).mockReturnValue('valid-token');

    const { unmount } = render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Select or create a design to begin')).toBeInTheDocument();
    });

    // Should not show undo/redo when no design is selected
    expect(screen.queryByLabelText('Undo')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Redo')).not.toBeInTheDocument();

    unmount();
  });

  it('shows 3D viewer after creating a design', async () => {
    const { getStoredToken, api: mockApi } = await getApi();
    vi.mocked(getStoredToken).mockReturnValue('valid-token');

    const newDesign = {
      id: 'new-id',
      name: 'New Shed',
      widthFeet: 10,
      widthInches: 0,
      depthFeet: 12,
      depthInches: 0,
      heightFeet: 8,
      heightInches: 0,
      roofPitch: 4,
      roofType: 'Gable' as const,
      openings: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    vi.mocked(mockApi.createDesign).mockResolvedValue(newDesign);
    vi.mocked(mockApi.listDesigns)
      .mockResolvedValueOnce({ items: [], totalCount: 0 })
      .mockResolvedValue({ items: [newDesign], totalCount: 1 });

    const { unmount } = render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Select or create a design to begin')).toBeInTheDocument();
    });

    // Open create dialog
    await userEvent.click(screen.getByLabelText('Create new design'));

    // Fill in the name and submit
    const nameInput = screen.getByLabelText('Design Name');
    await userEvent.type(nameInput, 'New Shed');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(screen.getByTestId('shed-viewer')).toBeInTheDocument();
    });

    // Undo/Redo should now be visible (design is active)
    expect(screen.getByLabelText('Undo')).toBeInTheDocument();
    expect(screen.getByLabelText('Redo')).toBeInTheDocument();

    unmount();
  });

  it('shows export buttons when a design is active', async () => {
    const { getStoredToken, api: mockApi } = await getApi();
    vi.mocked(getStoredToken).mockReturnValue('valid-token');

    const newDesign = {
      id: 'new-id',
      name: 'Export Test',
      widthFeet: 10,
      widthInches: 0,
      depthFeet: 12,
      depthInches: 0,
      heightFeet: 8,
      heightInches: 0,
      roofPitch: 4,
      roofType: 'Gable' as const,
      openings: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    vi.mocked(mockApi.createDesign).mockResolvedValue(newDesign);
    vi.mocked(mockApi.listDesigns)
      .mockResolvedValueOnce({ items: [], totalCount: 0 })
      .mockResolvedValue({ items: [newDesign], totalCount: 1 });

    const { unmount } = render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Select or create a design to begin')).toBeInTheDocument();
    });

    // Create a design to make export buttons appear
    await userEvent.click(screen.getByLabelText('Create new design'));
    await userEvent.type(screen.getByLabelText('Design Name'), 'Export Test');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Download PDF')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Download STL')).toBeInTheDocument();

    unmount();
  });

  it('does not show export buttons when no design is selected', async () => {
    const { getStoredToken } = await getApi();
    vi.mocked(getStoredToken).mockReturnValue('valid-token');

    const { unmount } = render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Select or create a design to begin')).toBeInTheDocument();
    });

    expect(screen.queryByLabelText('Download PDF')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Download STL')).not.toBeInTheDocument();

    unmount();
  });

  it('shows tabs when a design is selected', async () => {
    const { getStoredToken, api: mockApi } = await getApi();
    vi.mocked(getStoredToken).mockReturnValue('valid-token');

    const design = {
      id: 'd1',
      name: 'Test Shed',
      widthFeet: 10,
      widthInches: 0,
      depthFeet: 12,
      depthInches: 0,
      heightFeet: 8,
      heightInches: 0,
      roofPitch: 4,
      roofType: 'Gable' as const,
      openings: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    vi.mocked(mockApi.createDesign).mockResolvedValue(design);
    vi.mocked(mockApi.listDesigns)
      .mockResolvedValueOnce({ items: [], totalCount: 0 })
      .mockResolvedValue({ items: [design], totalCount: 1 });

    const { unmount } = render(<App />);

    // Open create dialog and create a design to get tabs to show
    await userEvent.click(screen.getByLabelText('Create new design'));
    const nameInput = screen.getByLabelText('Design Name');
    await userEvent.type(nameInput, 'Test Shed');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Design' })).toBeInTheDocument();
    });

    expect(screen.getByRole('tab', { name: 'BOM' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Versions' })).toBeInTheDocument();

    unmount();
  });
});
