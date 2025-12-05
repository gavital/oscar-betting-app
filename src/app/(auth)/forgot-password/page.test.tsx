// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ForgotPasswordPage from './page';

vi.mock('@/app/(auth)/forgot/actions', () => ({
  sendResetEmail: vi.fn(),
}))
import { sendResetEmail } from '@/app/(auth)/forgot/actions';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: any[]) => toastSuccess(...args),
    error: (...args: any[]) => toastError(...args),
  },
}));

describe('ForgotPasswordPage (UI): envia reset e exibe toasts', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (sendResetEmail as any).mockReset();
    pushMock.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  it('sucesso: mostra toast e redireciona para /login', async () => {
    (sendResetEmail as any).mockResolvedValueOnce({ ok: true });

    render(<ForgotPasswordPage />);

    const input = screen.getByLabelText(/E-mail/i);
    fireEvent.change(input, { target: { value: 'user@example.com' } });

    fireEvent.click(screen.getByRole('button', { name: /Enviar link/i }));

    await waitFor(() => {
      expect(sendResetEmail).toHaveBeenCalled();
      expect(toastSuccess).toHaveBeenCalled();
      expect(pushMock).toHaveBeenCalledWith('/login');
    });
  });

  it('erro: mostra toast de erro com descrição', async () => {
    (sendResetEmail as any).mockResolvedValueOnce({
      ok: false,
      error: { code: 'AUTH_RESET_ERROR', message: 'Falha ao enviar link' },
    });

    render(<ForgotPasswordPage />);
    fireEvent.click(screen.getByRole('button', { name: /Enviar link/i }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalled();
      const call = toastError.mock.calls[0];
      expect(call?.[1]?.description).toMatch(/Falha ao enviar link/i);
    });
  });

  it('indica “Enviando...” enquanto pending', async () => {
    (sendResetEmail as any).mockImplementationOnce(async () => {
      await new Promise(res => setTimeout(res, 10));
      return { ok: true };
    });

    render(<ForgotPasswordPage />);
    fireEvent.click(screen.getByRole('button', { name: /Enviar link/i }));
    expect(await screen.findByRole('button', { name: /Enviando.../i })).toBeInTheDocument();
  });
});