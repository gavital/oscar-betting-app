// src/tests/setupTests.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock de revalidatePath como no-op para ambiente de testes
vi.mock('next/cache', () => {
  return {
    revalidatePath: vi.fn(() => undefined),
  };
});

// Disponibiliza fetch no ambiente de teste (Node), permitindo vi.spyOn(global, 'fetch')
if (!(globalThis as any).fetch) {
  vi.stubGlobal('fetch', vi.fn()); // stub básico; os testes sobrescrevem com mockResolvedValueOnce
}

// Stub de ResizeObserver para componentes que usam Radix/shadcn
if (!(globalThis as any).ResizeObserver) {
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  ;(globalThis as any).ResizeObserver = ResizeObserver as any
}

// Variáveis de ambiente padrão
process.env.ADMIN_EMAILS = process.env.ADMIN_EMAILS || 'admin@example.com';
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'anon-key';