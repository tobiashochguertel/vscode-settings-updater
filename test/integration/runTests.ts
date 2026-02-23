import { runTests } from '@vscode/test-electron'
import path from 'node:path'

async function main(): Promise<void> {
  const extensionDevelopmentPath = path.resolve(__dirname, '../../')
  const extensionTestsPath = path.resolve(__dirname, './suite/index')
  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
    // Disable other extensions to avoid interference in CI
    launchArgs: ['--disable-extensions', '--no-sandbox'],
    // Allow passing extra env vars into the extension host
    extensionTestsEnv: {
      VSCODE_SETTINGS_UPDATER_TEST: '1',
    },
  })
}

main().catch(err => {
  console.error('Integration test runner failed:', err)
  process.exit(1)
})
