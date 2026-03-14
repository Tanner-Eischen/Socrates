import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Login from '../Login';
import * as AuthContext from '../../AuthContext';
import api from '../../api';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the AuthContext
vi.mock('../../AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock the api
vi.mock('../../api', () => ({
  default: {
    post: vi.fn(),
  },
}));

const mockLogin = vi.fn();

const renderLogin = () => {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
};

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (AuthContext.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      login: mockLogin,
      user: null,
      loading: false,
      logout: vi.fn(),
    });
  });

  it('renders login form with email and password fields', () => {
    renderLogin();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders toggle to switch between login and registration', () => {
    renderLogin();

    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
    expect(screen.getByText('Create account')).toBeInTheDocument();
  });

  it('shows name field when switching to registration mode', () => {
    renderLogin();

    const createAccountButton = screen.getByText('Create account');
    fireEvent.click(createAccountButton);

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
  });

  it('calls login API on form submission with valid credentials', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    renderLogin();

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('navigates to dashboard on successful login', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    renderLogin();

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('shows error for invalid credentials (401 error)', async () => {
    const error = {
      response: {
        status: 401,
        data: {},
      },
    };
    mockLogin.mockRejectedValueOnce(error);

    const toast = await import('react-hot-toast');
    renderLogin();

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.default.error).toHaveBeenCalledWith('Invalid email or password');
    });
  });

  it('shows error for network errors', async () => {
    const error = new Error('Network Error');
    mockLogin.mockRejectedValueOnce(error);

    const toast = await import('react-hot-toast');
    renderLogin();

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.default.error).toHaveBeenCalledWith(
        'Network Error'
      );
    });
  });

  it('calls register API when in registration mode', async () => {
    const mockApiPost = api.post as ReturnType<typeof vi.fn>;
    mockApiPost.mockResolvedValueOnce({
      data: { token: 'test-token', user: { id: '1', email: 'new@example.com' } },
    });

    const toast = await import('react-hot-toast');
    renderLogin();

    // Switch to registration mode
    const createAccountButton = screen.getByText('Create account');
    fireEvent.click(createAccountButton);

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: 'New User' } });
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/auth/register', {
        email: 'new@example.com',
        password: 'newpassword123',
        name: 'New User',
      });
    });

    await waitFor(() => {
      expect(toast.default.success).toHaveBeenCalledWith('Account created successfully!');
    });
  });

  it('shows error for duplicate email on registration (409 error)', async () => {
    const mockApiPost = api.post as ReturnType<typeof vi.fn>;
    const error = {
      response: {
        status: 409,
        data: {},
      },
    };
    mockApiPost.mockRejectedValueOnce(error);

    const toast = await import('react-hot-toast');
    renderLogin();

    // Switch to registration mode
    const createAccountButton = screen.getByText('Create account');
    fireEvent.click(createAccountButton);

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: 'Existing User' } });
    fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.default.error).toHaveBeenCalledWith('User with this email already exists');
    });
  });

  it('fills in demo credentials when clicking quick demo button', () => {
    renderLogin();

    const demoButton = screen.getByRole('button', { name: /quick demo/i });
    fireEvent.click(demoButton);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;

    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  it('shows loading state during form submission', async () => {
    mockLogin.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
    renderLogin();

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });
});
