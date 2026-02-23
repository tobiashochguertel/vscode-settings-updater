/**
 * E2E tests for vscode-settings-updater extension.
 *
 * These tests run INSIDE the VS Code Extension Development Host — no mocks,
 * no stubs. Every `vscode.*` call is the real VS Code API.
 *
 * Architecture note (VS Code 1.96+):
 *   VS Code pre-marks `--extensionDevelopmentPath` extensions as `isActive=true`
 *   WITHOUT calling `activate()`. The workaround in `test/suite/index.ts` calls
 *   `activate()` directly before Mocha runs and stores the returned API in
 *   `globalThis._e2eExtApi`. Tests use this API to call extension commands.
 */
import * as assert from 'assert'
import * as vscode from 'vscode'
import * as os from 'node:os'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

const EXT_ID = 'tobiashochguertel.vscode-settings-updater'

/** Mirror of ExtensionTestAPI from src/index.ts */
interface ExtensionTestAPI {
  activated: true
  executeCommand(command: string, ...args: unknown[]): Thenable<unknown>
}

/**
 * Get the extension API set by forceActivateExtension() in index.ts.
 * Falls back to a wrapper around vscode.commands.executeCommand.
 */
function getApi(): ExtensionTestAPI {
  const api = (globalThis as Record<string, unknown>)._e2eExtApi as ExtensionTestAPI | undefined
  if (api?.activated === true) return api
  // Fallback — try the test context's vscode proxy directly
  return {
    activated: true,
    executeCommand: (cmd, ...args) => vscode.commands.executeCommand(cmd, ...args),
  }
}

async function getExtension() {
  const ext = vscode.extensions.getExtension(EXT_ID)
  assert.ok(ext, `Extension ${EXT_ID} not found in VS Code`)
  return ext
}

// ---------------------------------------------------------------------------
// Suite 0: Diagnostics — verify force-activation worked
// ---------------------------------------------------------------------------
suite('Diagnostics', () => {
  test('forceActivate stored API in globalThis._e2eExtApi', () => {
    const api = (globalThis as Record<string, unknown>)._e2eExtApi as ExtensionTestAPI | undefined
    process.stderr.write(`[E2E-DIAG] _e2eExtApi=${JSON.stringify(api)}\n`)
    assert.strictEqual(api?.activated, true, '_e2eExtApi.activated must be true (force-activate must have run)')
  })

  test('ext.exports.executeCommand is callable (via force-activate API)', async () => {
    const api = getApi()
    await assert.doesNotReject(
      Promise.resolve(api.executeCommand('settingsUpdater.showLog')),
      'executeCommand via force-activate API must not throw',
    )
  })
})

// ---------------------------------------------------------------------------
// Suite 1: Activation
// ---------------------------------------------------------------------------
suite('Activation', () => {
  test('extension is registered in VS Code', async () => {
    const ext = await getExtension()
    assert.ok(ext, 'Extension not found')
  })

  test('extension is marked active by VS Code', async () => {
    const ext = await getExtension()
    assert.strictEqual(ext.isActive, true, 'isActive must be true')
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

  // Verify commands are DECLARED in package.json
  test('all 7 commands are declared in package.json', () => {
    const ext = vscode.extensions.getExtension(EXT_ID)
    const contributes = (ext?.packageJSON as { contributes?: { commands?: { command: string }[] } })?.contributes
    const declared: string[] = contributes?.commands?.map((c) => c.command) ?? []
    for (const cmd of REQUIRED_COMMANDS) {
      assert.ok(declared.includes(cmd), `Command not declared in package.json: ${cmd}`)
    }
  })

  // Verify commands are EXECUTABLE via the force-activate API
  for (const cmd of REQUIRED_COMMANDS) {
    test(`command "${cmd}" is executable`, async () => {
      const api = getApi()
      await assert.doesNotReject(
        Promise.resolve(api.executeCommand(cmd)),
        `executeCommand('${cmd}') must not throw`,
      )
    })
  }
})

// ---------------------------------------------------------------------------
// Suite 3: Commands with no sources configured
// ---------------------------------------------------------------------------
suite('Commands — empty configuration', () => {
  suiteSetup(async () => {
    await vscode.workspace
      .getConfiguration()
      .update('settingsUpdater.sources', [], vscode.ConfigurationTarget.Global)
  })

  test('updateAll does not throw when no sources configured', async () => {
    await assert.doesNotReject(Promise.resolve(getApi().executeCommand('settingsUpdater.updateAll')))
  })

  test('updateSource does not throw when no sources configured', async () => {
    await assert.doesNotReject(Promise.resolve(getApi().executeCommand('settingsUpdater.updateSource')))
  })

  test('disableSource does not throw when no sources configured', async () => {
    await assert.doesNotReject(Promise.resolve(getApi().executeCommand('settingsUpdater.disableSource')))
  })

  test('enableSource does not throw when no disabled sources', async () => {
    await assert.doesNotReject(Promise.resolve(getApi().executeCommand('settingsUpdater.enableSource')))
  })

  test('showLog does not throw (reveals output channel)', async () => {
    await assert.doesNotReject(Promise.resolve(getApi().executeCommand('settingsUpdater.showLog')))
  })

  test('showStatus does not throw (opens WebView panel)', async () => {
    await assert.doesNotReject(Promise.resolve(getApi().executeCommand('settingsUpdater.showStatus')))
  })

  test('openConfig does not throw (opens settings.json)', async () => {
    await assert.doesNotReject(Promise.resolve(getApi().executeCommand('settingsUpdater.openConfig')))
  })
})

// ---------------------------------------------------------------------------
// Suite 4: End-to-end — apply settings from a local JSONC file
// ---------------------------------------------------------------------------
suite('E2E — local JSONC source applies settings', () => {
  let tmpFile: string
  const TARGET_KEY = 'editor.wordWrap'
  const EXPECTED_VALUE = 'on'
  const SOURCE_NAME = 'e2e-local-test'

  suiteSetup(async () => {
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
    await getApi().executeCommand('settingsUpdater.updateAll')
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

    await getApi().executeCommand('settingsUpdater.updateAll')
    await new Promise<void>((resolve) => setTimeout(resolve, 500))

    const applied = vscode.workspace.getConfiguration().get<string>(TARGET_KEY)
    assert.strictEqual(applied, 'off', 'Disabled source should not overwrite the setting')
  })
})
