import { runTests } from '@vscode/test-electron'
import path from 'node:path'

async function main(): Promise<void> {
  const extensionDevelopmentPath = path.resolve(__dirname, '../../')
  const extensionTestsPath = path.resolve(__dirname, './suite/index')
  await runTests({ extensionDevelopmentPath, extensionTestsPath })
}

main().catch(err => {
  console.error('Integration test runner failed:', err)
  process.exit(1)
})
