import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment
    environment: 'jsdom',

    // Global setup file
    setupFiles: ['./tests/setup.ts'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'out/',
        'release/',
        'drizzle/',
        'resources/',
        '**/*.test.{ts,tsx}',
        '**/*.config.{ts,js}',
        'src/main/**',  // Exclude main process from coverage (tested separately)
      ],
    },

    // Include patterns
    include: [
      'tests/**/*.{test,spec}.{ts,tsx}',
      'src/**/*.{test,spec}.{ts,tsx}',
    ],

    // Exclude patterns
    exclude: [
      'node_modules/',
      'dist/',
      'out/',
    ],

    // Aliases (same as electron.vite.config.ts)
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src/renderer'),
        '@main': path.resolve(__dirname, './src/main'),
      },
    },

    // Watch mode (default true, but --run disables it)
    watch: true,

    // Global globals
    globals: true,
  },

  // Resolve aliases for non-test files too
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
      '@main': path.resolve(__dirname, './src/main'),
    },
  },
})
