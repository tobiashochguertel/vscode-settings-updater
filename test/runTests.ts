import * as path from 'path'
import { runTests } from '@vscode/test-electron'

async function main() {
  try {
    // Extension root — must match --extensionDevelopmentPath
    const extensionDevelopmentPath = path.resolve(__dirname, '../../')
    // The test suite index — loaded in the SAME Extension Host as the development extension
    const extensionTestsPath = path.resolve(__dirname, './suite/index')

    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: ['--no-sandbox', '--disable-gpu'],
    })
  } catch {
    console.error('Failed to run tests')
    process.exit(1)
  }
}

main()
