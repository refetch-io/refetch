import { defineConfig } from 'vitest/config'

// Unit tests cover the shared, framework-free modules (src/lib and the pure
// helpers inside functions/); the app's Vite config (TanStack Start, Tailwind)
// isn't needed to run them.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ['src/**/*.test.ts', 'functions/**/*.test.js'],
    exclude: ['**/node_modules/**'],
    environment: 'node',
  },
})
