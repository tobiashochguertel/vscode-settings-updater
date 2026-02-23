import * as assert from 'node:assert'
import * as vscode from 'vscode'

suite('Extension Integration Tests', () => {
  test('Extension is registered', async () => {
    const ext = vscode.extensions.getExtension('tobiashochguertel.vscode-settings-updater')
    assert.ok(ext, 'Extension not found in VS Code extensions')
  })

  test('All 7 commands are registered', async () => {
    const ext = vscode.extensions.getExtension('tobiashochguertel.vscode-settings-updater')
    if (ext && !ext.isActive) await ext.activate()

    const allCommands = await vscode.commands.getCommands(true)
    const required = [
      'settingsUpdater.updateAll',
      'settingsUpdater.updateSource',
      'settingsUpdater.disableSource',
      'settingsUpdater.enableSource',
      'settingsUpdater.showLog',
      'settingsUpdater.openConfig',
      'settingsUpdater.showStatus',
    ]
    for (const cmd of required) {
      assert.ok(allCommands.includes(cmd), `Missing command: ${cmd}`)
    }
  })
})

suite('Command Invocation', () => {
  test('settingsUpdater.showLog — does not throw', async () => {
    // This command shows the output channel, should always succeed
    await assert.doesNotReject(
      vscode.commands.executeCommand('settingsUpdater.showLog')
    )
  })

  test('settingsUpdater.showStatus — does not throw', async () => {
    // Opens WebView panel with source status
    await assert.doesNotReject(
      vscode.commands.executeCommand('settingsUpdater.showStatus')
    )
  })

  test('settingsUpdater.openConfig — does not throw', async () => {
    // Opens settings.json in the editor
    await assert.doesNotReject(
      vscode.commands.executeCommand('settingsUpdater.openConfig')
    )
  })

  test('settingsUpdater.updateAll — does not throw with empty sources config', async () => {
    // With no sources configured, updateAll should show info message not throw
    await assert.doesNotReject(
      vscode.commands.executeCommand('settingsUpdater.updateAll')
    )
  })
})

suite('Source Management Commands', () => {
  test('settingsUpdater.updateSource — does not throw with no sources', async () => {
    // With no sources, shows info message instead of QuickPick
    await assert.doesNotReject(
      vscode.commands.executeCommand('settingsUpdater.updateSource')
    )
  })

  test('settingsUpdater.disableSource — does not throw with no sources', async () => {
    await assert.doesNotReject(
      vscode.commands.executeCommand('settingsUpdater.disableSource')
    )
  })

  test('settingsUpdater.enableSource — does not throw with no disabled sources', async () => {
    await assert.doesNotReject(
      vscode.commands.executeCommand('settingsUpdater.enableSource')
    )
  })
})

suite('Extension Manifest', () => {
  test('Extension has correct publisher and id', async () => {
    const ext = vscode.extensions.getExtension('tobiashochguertel.vscode-settings-updater')
    assert.ok(ext, 'Extension not found')
    assert.strictEqual(ext.id, 'tobiashochguertel.vscode-settings-updater')
  })

  test('Extension package.json has non-empty version', async () => {
    const ext = vscode.extensions.getExtension('tobiashochguertel.vscode-settings-updater')
    assert.ok(ext, 'Extension not found')
    const pkg = ext.packageJSON as { version: string }
    assert.ok(pkg.version && pkg.version !== '', 'Version should be non-empty')
  })
})
