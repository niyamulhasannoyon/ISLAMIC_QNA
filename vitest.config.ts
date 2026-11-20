import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'tests/**/*.test.ts',
      'packages/*/tests/**/*.test.ts',
      'apps/web/tests/**/*.test.ts',
      'apps/web/src/**/*.test.ts',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/web/src'),
      '@repo/text-utils': path.resolve(__dirname, './packages/text-utils/src'),
      '@repo/api-client': path.resolve(__dirname, './packages/api-client/src'),
    },
  },
});
