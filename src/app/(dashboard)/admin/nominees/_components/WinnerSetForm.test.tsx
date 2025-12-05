@vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WinnerSetForm from './WinnerSetForm';

vi.mock('../../winners/actions', () => ({
  setCategoryWinner: vi.fn(),
}));
import { setCategoryWinner } from '../../winners/actions';

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: any[]) => toastSuccess(...args),
    error: (...args: any[]) => toastError(...args),
  },
}));

describe('WinnerSetForm (Admin): toasts e estados', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (setCategoryWinner as any).mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  it('sucesso: marca vencedor e exibe toast de sucesso', async () => {
    (setCategoryWinner as any).mockResolvedValueOnce({
      ok: true,
      data: { categoryId: 'cat_1', nomineeId: 'n1' },
    });

    render(<WinnerSetForm categoryId="cat_1" nomineeId="n1" />);
    fireEvent.click(screen.getByRole('button', { name: /Marcar como vencedor/i }));

    await waitFor(() => {
      expect(setCategoryWinner).toHaveBeenCalled();
      expect(toastSuccess).toHaveBeenCalled();
      const call = toastSuccess.mock.calls[0];
      expect(call?.[0]).toMatch(/Vencedor registrado/i);
    });
  });

  it('erro de permissão: exibe toast de acesso negado', async () => {
    (setCategoryWinner as any).mockResolvedValueOnce({
      ok: false,
      error: { code: 'AUTH_FORBIDDEN', message: 'Acesso negado' },
    });

    render(<WinnerSetForm categoryId="cat_1" nomineeId="n1" />);
    fireEvent.click(screen.getByRole('button', { name: /Marcar como vencedor/i }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalled();
      const call = toastError.mock.calls[0];
      expect(call?.[0]).toMatch(/Acesso negado/i);
    });
  });

  it('erro genérico: exibe toast padrão', async () => {
    (setCategoryWinner as any).mockResolvedValueOnce({
      ok: false,
      error: { code: 'DB_UPDATE_ERROR', message: 'Falha na base' },
    });

    render(<WinnerSetForm categoryId="cat_1" nomineeId="n1" />);
    fireEvent.click(screen.getByRole('button', { name: /Marcar como vencedor/i }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalled();
      const call = toastError.mock.calls[0];
      expect(call?.[0]).toMatch(/Não foi possível registrar o vencedor/i);
    });
  });

  it('desabilita quando disabled=true', () => {
    render(<WinnerSetForm categoryId="cat_1" nomineeId="n1" disabled={true} />);
    const btn = screen.getByRole('button', { name: /Marcar como vencedor/i });
    expect(btn).toBeDisabled();
  });

  it('exibe “Salvando...” durante pending', async () => {
    (setCategoryWinner as any).mockImplementationOnce(async () => {
      await new Promise(r => setTimeout(r, 10));
      return { ok: true, data: { categoryId: 'cat_1', nomineeId: 'n1' } };
    });

    render(<WinnerSetForm categoryId="cat_1" nomineeId="n1" />);
    fireEvent.click(screen.getByRole('button', { name: /Marcar como vencedor/i }));

    expect(await screen.findByRole('button', { name: /Salvando.../i })).toBeInTheDocument();
  });
});