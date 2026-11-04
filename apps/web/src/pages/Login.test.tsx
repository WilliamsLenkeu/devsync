import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ApiError } from '@/lib/api';
import { LoginPage } from './Login';

const { login } = vi.hoisted(() => ({ login: vi.fn() }));
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ login }) }));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/login']}>
      <LoginPage />
    </MemoryRouter>,
  );

describe('LoginPage', () => {
  beforeEach(() => login.mockReset());

  it('blocks submission with an invalid email and reports it on the field', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email');
    await userEvent.type(screen.getByLabelText('Password'), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(login).not.toHaveBeenCalled();
  });

  it('shows the server message when credentials are rejected', async () => {
    login.mockImplementation(async () => {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Invalid email or password');
    });
    renderPage();
    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-pass');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(login).toHaveBeenCalledWith('ada@example.com', 'wrong-pass');
  });

  it('toggles password visibility with an accessible button', async () => {
    renderPage();
    const password = screen.getByLabelText('Password');
    expect(password).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
  });
});
