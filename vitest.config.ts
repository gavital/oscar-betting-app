// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Ambiente global "node"; testes de UI devem usar "@vitest-environment jsdom" por arquivo
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['src/tests/setupTests.ts'],
    coverage: {
      enabled: false
    }
  },
  resolve: {
    alias: {
      '@/': '/src/'
    }
  }
});