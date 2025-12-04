// src/tests/setupTests.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock de revalidatePath como no-op para ambiente de testes
vi.mock('next/cache', () => {
  return {
    revalidatePath: vi.fn(() => undefined),
  };
});

process.env.ADMIN_EMAILS = process.env.ADMIN_EMAILS || 'admin@example.com';
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'anon-key';