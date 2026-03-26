import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
    coverage: {
      all: true,
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['**/*.d.ts', 'src/types.ts', 'src/types/**', 'src/utils/index.ts'],
      thresholds: {
        statements: 84,
        branches: 75,
        functions: 90,
        lines: 85,
      },
    },
  },
})
