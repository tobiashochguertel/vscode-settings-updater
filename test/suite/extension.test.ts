/**
 * E2E tests for vscode-settings-updater extension.
 *
 * These tests run INSIDE the VS Code Extension Development Host — no mocks,
 * no stubs. Every `vscode.*` call is the real VS Code API.
 *
 * Test runner: @vscode/test-electron with Mocha TDD suite.
 * The test index (suite/index.ts) is loaded via --extensionTestsPath in the
 * SAME Extension Host process as the development extension, which allows
 * vscode.commands.getCommands() to see commands registered by the extension.
 */
import * as assert from 'assert'
import * as vscode from 'vscode'
import * as os from 'node:os'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

const EXT_ID = 'tobiashochguertel.vscode-settings-updater'

async function getExtension() {
  const ext = vscode.extensions.getExtension(EXT_ID)
  assert.ok(ext, `Extension ${EXT_ID} not found in VS Code`)
  return ext
}

async function activateExtension() {
  const ext = await getExtension()
  if (!ext.isActive) {
    await ext.activate()
  }
  // Allow the extension's registerCommand() calls to propagate in the shared EH
  await new Promise<void>(resolve => setTimeout(resolve, 2000))
  return ext
}

// ---------------------------------------------------------------------------
// Suite 1: Activation
// ---------------------------------------------------------------------------
suite('Activation', () => {
  suiteSetup(activateExtension)

  test('extension is registered in VS Code', async () => {
    const ext = await getExtension()
    assert.ok(ext, 'Extension not found')
  })

  test('extension activates without error', async () => {
    const ext = await activateExtension()
    assert.strictEqual(ext.isActive, true)
  })

  test('extension exposes package.json with correct publisher', async () => {
    const ext = await getExtension()
    const pkg = ext.packageJSON as { publisher: string; name: string; version: string }
    assert.strictEqual(pkg.publisher, 'tobiashochguertel')
    assert.strictEqual(pkg.name, 'vscode-settings-updater')
    assert.ok(pkg.version.length > 0)
  })
})

// ---------------------------------------------------------------------------
// Suite 2: Command registration
// ---------------------------------------------------------------------------
suite('Command Registration', () => {
  const REQUIRED_COMMANDS = [
    'settingsUpdater.updateAll',
    'settingsUpdater.updateSource',
    'settingsUpdater.disableSource',
    'settingsUpdater.enableSource',
    'settingsUpdater.showLog',
    'settingsUpdater.openConfig',
    'settingsUpdater.showStatus',
  ]

  suiteSetup(activateExtension)

  // Verify commands are DECLARED in package.json (always true after build)
  test('all 7 commands are declared in package.json', () => {
    const ext = vscode.extensions.getExtension(EXT_ID)
    const contributes = (ext?.packageJSON as { contributes?: { commands?: { command: string }[] } })?.contributes
    const declared: string[] = contributes?.commands?.map((c) => c.command) ?? []
    for (const cmd of REQUIRED_COMMANDS) {
      assert.ok(declared.includes(cmd), `Command not declared in package.json: ${cmd}`)
    }
  })

  // Verify commands are REGISTERED via getCommands() — works because test runs in the SAME EH
  for (const cmd of REQUIRED_COMMANDS) {
    test(`command "${cmd}" is registered`, async () => {
      const all = await vscode.commands.getCommands(true)
      console.log(`[E2E] Total commands: ${all.length}, settingsUpdater: ${all.filter(c => c.startsWith('settingsUpdater')).join(', ') || 'NONE'}`)
      assert.ok(all.includes(cmd), `Command not registered: ${cmd}`)
    })
  }
})

// ---------------------------------------------------------------------------
// Suite 3: Commands with no sources configured
// ---------------------------------------------------------------------------
suite('Commands — empty configuration', () => {
  suiteSetup(async () => {
    await activateExtension()
    // Ensure no sources are configured
    await vscode.workspace
      .getConfiguration()
      .update('settingsUpdater.sources', [], vscode.ConfigurationTarget.Global)
  })

  test('updateAll does not throw when no sources configured', async () => {
    await assert.doesNotReject(Promise.resolve(vscode.commands.executeCommand('settingsUpdater.updateAll')))
  })

  test('updateSource does not throw when no sources configured', async () => {
    await assert.doesNotReject(Promise.resolve(vscode.commands.executeCommand('settingsUpdater.updateSource')))
  })

  test('disableSource does not throw when no sources configured', async () => {
    await assert.doesNotReject(Promise.resolve(vscode.commands.executeCommand('settingsUpdater.disableSource')))
  })

  test('enableSource does not throw when no disabled sources', async () => {
    await assert.doesNotReject(Promise.resolve(vscode.commands.executeCommand('settingsUpdater.enableSource')))
  })

  test('showLog does not throw (reveals output channel)', async () => {
    await assert.doesNotReject(Promise.resolve(vscode.commands.executeCommand('settingsUpdater.showLog')))
  })

  test('showStatus does not throw (opens WebView panel)', async () => {
    await assert.doesNotReject(Promise.resolve(vscode.commands.executeCommand('settingsUpdater.showStatus')))
  })

  test('openConfig does not throw (opens settings.json)', async () => {
    await assert.doesNotReject(Promise.resolve(vscode.commands.executeCommand('settingsUpdater.openConfig')))
  })
})

// ---------------------------------------------------------------------------
// Suite 4: End-to-end — apply settings from a local JSONC file
// ---------------------------------------------------------------------------
suite('E2E — local JSONC source applies settings', () => {
  let tmpFile: string
  // Use editor.wordWrap — a real VS Code setting we can set and verify
  const TARGET_KEY = 'editor.wordWrap'
  const EXPECTED_VALUE = 'on'
  const SOURCE_NAME = 'e2e-local-test'

  suiteSetup(async () => {
    await activateExtension()

    // Write a JSONC file with the setting we want to apply
    tmpFile = path.join(os.tmpdir(), `vscode-su-e2e-${Date.now()}.jsonc`)
    await fs.writeFile(
      tmpFile,
      JSON.stringify({ [TARGET_KEY]: EXPECTED_VALUE }, null, 2),
      'utf8',
    )

    // Configure the extension to use this local file as a source
    await vscode.workspace.getConfiguration().update(
      'settingsUpdater.sources',
      [
        {
          name: SOURCE_NAME,
          file: tmpFile,
          parser: 'jsonc',
          targetKey: TARGET_KEY,
          mergeStrategy: 'replace',
          enabled: true,
          updateInterval: 60,
        },
      ],
      vscode.ConfigurationTarget.Global,
    )
  })

  suiteTeardown(async () => {
    // Remove test source config
    await vscode.workspace
      .getConfiguration()
      .update('settingsUpdater.sources', [], vscode.ConfigurationTarget.Global)
    // Reset the setting we modified
    await vscode.workspace
      .getConfiguration()
      .update(TARGET_KEY, undefined, vscode.ConfigurationTarget.Global)
    // Remove temp file
    try {
      await fs.unlink(tmpFile)
    } catch {
      // ignore if already gone
    }
  })

  test('updateAll reads local JSONC file and writes setting to VS Code config', async () => {
    await vscode.commands.executeCommand('settingsUpdater.updateAll')
    // Give the async apply pipeline time to complete
    await new Promise<void>(resolve => setTimeout(resolve, 1500))

    const applied = vscode.workspace.getConfiguration().get<string>(TARGET_KEY)
    assert.strictEqual(
      applied,
      EXPECTED_VALUE,
      `Expected ${TARGET_KEY} to be "${EXPECTED_VALUE}" after updateAll, got "${applied}"`,
    )
  })

  test('after source is disabled, updateAll no longer processes it', async () => {
    // Disable the source
    await vscode.workspace.getConfiguration().update(
      'settingsUpdater.sources',
      [
        {
          name: SOURCE_NAME,
          file: tmpFile,
          parser: 'jsonc',
          targetKey: TARGET_KEY,
          mergeStrategy: 'replace',
          enabled: false, // disabled
          updateInterval: 60,
        },
      ],
      vscode.ConfigurationTarget.Global,
    )

    // Manually change the setting to something else
    await vscode.workspace
      .getConfiguration()
      .update(TARGET_KEY, 'off', vscode.ConfigurationTarget.Global)

    await vscode.commands.executeCommand('settingsUpdater.updateAll')
    await new Promise<void>(resolve => setTimeout(resolve, 500))

    // Value should remain 'off' because the source is disabled
    const applied = vscode.workspace.getConfiguration().get<string>(TARGET_KEY)
    assert.strictEqual(applied, 'off', 'Disabled source should not overwrite the setting')
  })
})
