// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Ambiente global "node"; testes de UI devem usar "@vitest-environment jsdom" por arquivo
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environmentMatchGlobs: [
      ['src/**/*.test.tsx', 'jsdom'],
    ],
    testTimeout: 30000,
    hookTimeout: 30000,
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