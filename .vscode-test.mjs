import { defineConfig } from '@vscode/test-cli'

export default defineConfig({
  files: 'out/e2e/**/*.test.js',
  // Disable all other extensions so tests run in a clean environment
  launchArgs: ['--disable-extensions'],
  mocha: {
    ui: 'tdd',
    timeout: 30000,
    color: true,
  },
})
