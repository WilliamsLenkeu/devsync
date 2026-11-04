import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPage } from './Register';

const { createAccount } = vi.hoisted(() => ({ createAccount: vi.fn() }));
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ register: createAccount }) }));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/register']}>
      <RegisterPage />
    </MemoryRouter>,
  );

describe('RegisterPage', () => {
  beforeEach(() => createAccount.mockReset());

  it('blocks submission when the password is too short', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText('Name'), 'Ada Lovelace');
    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'short');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Use at least 8 characters')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true');
    expect(createAccount).not.toHaveBeenCalled();
  });

  it('blocks submission when the email is invalid', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText('Name'), 'Ada Lovelace');
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email');
    await userEvent.type(screen.getByLabelText('Password'), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(createAccount).not.toHaveBeenCalled();
  });
});
