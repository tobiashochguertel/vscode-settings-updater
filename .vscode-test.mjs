import { defineConfig } from '@vscode/test-cli'

export default defineConfig({
  files: 'out/e2e/**/*.test.js',
  launchArgs: [
    // Do NOT pass --disable-extensions: it prevents registerCommand() from working
    // for the development extension in the test host.
    '--no-sandbox',
    '--disable-gpu',
  ],
  mocha: {
    ui: 'tdd',
    timeout: 60000,
    color: true,
  },
})
