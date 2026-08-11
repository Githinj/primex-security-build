import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const dir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(dir, 'src'),
      // 'server-only' is a build-time guard with no runtime; stub it for tests.
      'server-only': path.resolve(dir, 'src/test/server-only-stub.ts'),
    },
  },
  test: {
    environment: 'node',
    // `loadtest/` holds the streaming capacity harness (SEC-192). Its decision
    // logic — when to stop pushing load at a production server — is tested here
    // rather than trusted, so it runs with the rest of the suite.
    include: ['src/**/*.test.ts', 'loadtest/**/*.test.mjs'],
  },
})
