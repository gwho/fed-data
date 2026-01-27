import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Environment
    environment: 'node',

    // Include patterns
    include: ['app/**/*.test.ts', 'app/**/*.test.tsx'],

    // Coverage (optional, run with --coverage)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['app/lib/**/*.ts'],
      exclude: ['app/lib/**/*.test.ts', 'app/lib/schemas/**'],
    },

    // Globals (describe, it, expect available without import)
    globals: true,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
