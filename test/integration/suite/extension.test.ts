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
