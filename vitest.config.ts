import { defineConfig } from 'vitest/config'

// Unit tests cover the shared, framework-free modules (src/lib); the app's Vite
// config (TanStack Start, Tailwind) isn't needed to run them.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
