import * as vscode from 'vscode'
import type { ExtensionContext } from 'vscode'
import { getEnabledSources, getDefaultParser } from './config'
import { fetchAndApplySource } from './lifecycle'
import { getLogger } from './logger'

export function registerCommands(ctx: ExtensionContext): void {
  ctx.subscriptions.push(
    vscode.commands.registerCommand('settingsUpdater.updateAll', async () => {
      const sources = getEnabledSources()
      if (sources.length === 0) {
        vscode.window.showInformationMessage('[Settings Updater] No enabled sources configured.')
        return
      }
      for (const source of sources) {
        await fetchAndApplySource(ctx, source, true)
      }
    }),

    vscode.commands.registerCommand('settingsUpdater.showLog', () => {
      getLogger().show(true)
    }),

    vscode.commands.registerCommand('settingsUpdater.openConfig', async () => {
      await vscode.commands.executeCommand('workbench.action.openSettingsJson')
    }),

    // Stubs for Phase 2 commands
    vscode.commands.registerCommand('settingsUpdater.updateSource', () => {
      vscode.window.showInformationMessage('[Settings Updater] Coming in Phase 2.')
    }),
    vscode.commands.registerCommand('settingsUpdater.disableSource', () => {
      vscode.window.showInformationMessage('[Settings Updater] Coming in Phase 2.')
    }),
    vscode.commands.registerCommand('settingsUpdater.enableSource', () => {
      vscode.window.showInformationMessage('[Settings Updater] Coming in Phase 2.')
    }),
    vscode.commands.registerCommand('settingsUpdater.showStatus', () => {
      vscode.window.showInformationMessage('[Settings Updater] Coming in Phase 2.')
    }),
  )
}
