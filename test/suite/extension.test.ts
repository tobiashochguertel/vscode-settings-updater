/**
 * E2E tests for vscode-settings-updater extension.
 *
 * These tests run INSIDE the VS Code Extension Development Host — no mocks,
 * no stubs. Every `vscode.*` call is the real VS Code API.
 *
 * Architecture note (VS Code 1.96+):
 *   The `--extensionTestsPath` runner has an isolated `vscode` proxy — commands
 *   registered by the development extension are NOT visible via getCommands(), and
 *   executeCommand() from the test proxy does NOT route to extension commands.
 *   The fix: the extension exports { activated, executeCommand } from activate().
 *   Tests call ext.exports.executeCommand() which uses the extension's own proxy.
 */
import * as assert from 'assert'
import * as vscode from 'vscode'
import * as os from 'node:os'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

const EXT_ID = 'tobiashochguertel.vscode-settings-updater'

/** Mirror of ExtensionTestAPI from src/index.ts — kept in sync manually. */
interface ExtensionTestAPI {
  activated: true
  executeCommand(command: string, ...args: unknown[]): Thenable<unknown>
}

type ExtInstance = vscode.Extension<ExtensionTestAPI>

async function getExtension(): Promise<ExtInstance> {
  const ext = vscode.extensions.getExtension<ExtensionTestAPI>(EXT_ID)
  assert.ok(ext, `Extension ${EXT_ID} not found in VS Code`)
  return ext
}

/** Ensure extension is activated and its exports are available (up to 10s). */
async function activateExtension(): Promise<ExtInstance> {
  const ext = await getExtension()
  if (!ext.isActive) {
    await ext.activate()
  }
  // Poll for ext.exports.activated — set by activate() return value
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    if ((ext.exports as ExtensionTestAPI | undefined)?.activated === true) break
    await new Promise<void>((resolve) => setTimeout(resolve, 200))
  }
  return ext
}

// ---------------------------------------------------------------------------
// Suite 0: Diagnostics
// ---------------------------------------------------------------------------
suite('Diagnostics', () => {
  test('ext.exports.activated is true after activate()', async () => {
    const ext = await activateExtension()
    const api = ext.exports as ExtensionTestAPI | undefined
    process.stderr.write(`[E2E-DIAG] ext.exports=${JSON.stringify(api)}\n`)
    assert.strictEqual(api?.activated, true, 'ext.exports.activated must be true')
  })

  test('ext.exports.executeCommand is a function', async () => {
    const ext = await activateExtension()
    const api = ext.exports as ExtensionTestAPI | undefined
    assert.strictEqual(typeof api?.executeCommand, 'function', 'ext.exports.executeCommand must be a function')
  })
})

// ---------------------------------------------------------------------------
// Suite 1: Activation
// ---------------------------------------------------------------------------
suite('Activation', () => {
  suiteSetup(activateExtension)

  test('extension is registered in VS Code', async () => {
    const ext = await getExtension()
    assert.ok(ext, 'Extension not found')
  })

  test('extension activates without error and exports API', async () => {
    const ext = await activateExtension()
    assert.strictEqual(ext.isActive, true, 'isActive must be true')
    assert.strictEqual((ext.exports as ExtensionTestAPI).activated, true, 'exports.activated must be true')
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

  let api: ExtensionTestAPI

  suiteSetup(async () => {
    const ext = await activateExtension()
    api = ext.exports as ExtensionTestAPI
  })

  // Verify commands are DECLARED in package.json
  test('all 7 commands are declared in package.json', () => {
    const ext = vscode.extensions.getExtension(EXT_ID)
    const contributes = (ext?.packageJSON as { contributes?: { commands?: { command: string }[] } })?.contributes
    const declared: string[] = contributes?.commands?.map((c) => c.command) ?? []
    for (const cmd of REQUIRED_COMMANDS) {
      assert.ok(declared.includes(cmd), `Command not declared in package.json: ${cmd}`)
    }
  })

  // Verify each command can be executed via ext.exports.executeCommand (real IPC)
  for (const cmd of REQUIRED_COMMANDS) {
    test(`command "${cmd}" is executable via ext.exports.executeCommand`, async () => {
      // showLog, openConfig, showStatus might open UI but should not throw
      await assert.doesNotReject(
        Promise.resolve(api.executeCommand(cmd)),
        `ext.exports.executeCommand('${cmd}') must not throw`,
      )
    })
  }
})

// ---------------------------------------------------------------------------
// Suite 3: Commands with no sources configured
// ---------------------------------------------------------------------------
suite('Commands — empty configuration', () => {
  let api: ExtensionTestAPI

  suiteSetup(async () => {
    const ext = await activateExtension()
    api = ext.exports as ExtensionTestAPI
    await vscode.workspace
      .getConfiguration()
      .update('settingsUpdater.sources', [], vscode.ConfigurationTarget.Global)
  })

  test('updateAll does not throw when no sources configured', async () => {
    await assert.doesNotReject(Promise.resolve(api.executeCommand('settingsUpdater.updateAll')))
  })

  test('updateSource does not throw when no sources configured', async () => {
    await assert.doesNotReject(Promise.resolve(api.executeCommand('settingsUpdater.updateSource')))
  })

  test('disableSource does not throw when no sources configured', async () => {
    await assert.doesNotReject(Promise.resolve(api.executeCommand('settingsUpdater.disableSource')))
  })

  test('enableSource does not throw when no disabled sources', async () => {
    await assert.doesNotReject(Promise.resolve(api.executeCommand('settingsUpdater.enableSource')))
  })

  test('showLog does not throw (reveals output channel)', async () => {
    await assert.doesNotReject(Promise.resolve(api.executeCommand('settingsUpdater.showLog')))
  })

  test('showStatus does not throw (opens WebView panel)', async () => {
    await assert.doesNotReject(Promise.resolve(api.executeCommand('settingsUpdater.showStatus')))
  })

  test('openConfig does not throw (opens settings.json)', async () => {
    await assert.doesNotReject(Promise.resolve(api.executeCommand('settingsUpdater.openConfig')))
  })
})

// ---------------------------------------------------------------------------
// Suite 4: End-to-end — apply settings from a local JSONC file
// ---------------------------------------------------------------------------
suite('E2E — local JSONC source applies settings', () => {
  let tmpFile: string
  let api: ExtensionTestAPI
  const TARGET_KEY = 'editor.wordWrap'
  const EXPECTED_VALUE = 'on'
  const SOURCE_NAME = 'e2e-local-test'

  suiteSetup(async () => {
    const ext = await activateExtension()
    api = ext.exports as ExtensionTestAPI

    tmpFile = path.join(os.tmpdir(), `vscode-su-e2e-${Date.now()}.jsonc`)
    await fs.writeFile(
      tmpFile,
      JSON.stringify({ [TARGET_KEY]: EXPECTED_VALUE }, null, 2),
      'utf8',
    )

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
    await vscode.workspace
      .getConfiguration()
      .update('settingsUpdater.sources', [], vscode.ConfigurationTarget.Global)
    await vscode.workspace
      .getConfiguration()
      .update(TARGET_KEY, undefined, vscode.ConfigurationTarget.Global)
    try {
      await fs.unlink(tmpFile)
    } catch {
      // ignore if already gone
    }
  })

  test('updateAll reads local JSONC file and writes setting to VS Code config', async () => {
    await api.executeCommand('settingsUpdater.updateAll')
    await new Promise<void>((resolve) => setTimeout(resolve, 1500))

    const applied = vscode.workspace.getConfiguration().get<string>(TARGET_KEY)
    assert.strictEqual(
      applied,
      EXPECTED_VALUE,
      `Expected ${TARGET_KEY} to be "${EXPECTED_VALUE}" after updateAll, got "${applied}"`,
    )
  })

  test('after source is disabled, updateAll no longer processes it', async () => {
    await vscode.workspace.getConfiguration().update(
      'settingsUpdater.sources',
      [
        {
          name: SOURCE_NAME,
          file: tmpFile,
          parser: 'jsonc',
          targetKey: TARGET_KEY,
          mergeStrategy: 'replace',
          enabled: false,
          updateInterval: 60,
        },
      ],
      vscode.ConfigurationTarget.Global,
    )
    await vscode.workspace
      .getConfiguration()
      .update(TARGET_KEY, 'off', vscode.ConfigurationTarget.Global)

    await api.executeCommand('settingsUpdater.updateAll')
    await new Promise<void>((resolve) => setTimeout(resolve, 500))

    const applied = vscode.workspace.getConfiguration().get<string>(TARGET_KEY)
    assert.strictEqual(applied, 'off', 'Disabled source should not overwrite the setting')
  })
})
