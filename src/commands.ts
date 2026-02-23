import * as vscode from 'vscode'
import type { ExtensionContext } from 'vscode'
import { getEnabledSources, getConfig } from './config'
import { fetchAndApplySource } from './lifecycle'
import { getSourceState } from './state'
import { getLogger } from './logger'
import { CONFIG_NAMESPACE } from './constants'
import type { Source } from './sources/types'

export function registerCommands(ctx: ExtensionContext): void {
  ctx.subscriptions.push(
    // ---- updateAll ----
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

    // ---- updateSource ----
    vscode.commands.registerCommand('settingsUpdater.updateSource', async () => {
      const sources = getEnabledSources()
      if (sources.length === 0) {
        vscode.window.showInformationMessage('[Settings Updater] No enabled sources configured.')
        return
      }
      const items = sources.map(s => ({
        label: s.name,
        description: s.url ?? s.file ?? '',
        source: s,
      }))
      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a source to update now',
        title: 'Settings Updater: Update source',
      })
      if (!picked) return
      await fetchAndApplySource(ctx, picked.source, true)
    }),

    // ---- disableSource ----
    vscode.commands.registerCommand('settingsUpdater.disableSource', async () => {
      const sources = getEnabledSources()
      if (sources.length === 0) {
        vscode.window.showInformationMessage('[Settings Updater] No enabled sources to disable.')
        return
      }
      const items = sources.map(s => ({
        label: s.name,
        description: s.url ?? s.file ?? '',
        source: s,
      }))
      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a source to disable',
        title: 'Settings Updater: Disable source',
      })
      if (!picked) return
      await setSourceEnabled(picked.source.name, false)
      vscode.window.showInformationMessage(
        `[Settings Updater] Source "${picked.source.name}" disabled. Previously applied settings kept.`,
      )
    }),

    // ---- enableSource ----
    vscode.commands.registerCommand('settingsUpdater.enableSource', async () => {
      const allSources = getConfig<Source[]>(`${CONFIG_NAMESPACE}.sources`) ?? []
      const disabledSources = allSources.filter(s => s.enabled === false)
      if (disabledSources.length === 0) {
        vscode.window.showInformationMessage('[Settings Updater] No disabled sources found.')
        return
      }
      const items = disabledSources.map(s => ({
        label: s.name,
        description: s.url ?? s.file ?? '',
        source: s,
      }))
      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a source to enable',
        title: 'Settings Updater: Enable source',
      })
      if (!picked) return
      await setSourceEnabled(picked.source.name, true)
      // Trigger an immediate update for the newly enabled source
      const updatedSource = { ...picked.source, enabled: true }
      await fetchAndApplySource(ctx, updatedSource, true)
    }),

    // ---- showLog ----
    vscode.commands.registerCommand('settingsUpdater.showLog', () => {
      getLogger().show(true)
    }),

    // ---- openConfig ----
    vscode.commands.registerCommand('settingsUpdater.openConfig', async () => {
      await vscode.commands.executeCommand('workbench.action.openSettingsJson')
    }),

    // ---- showStatus ----
    vscode.commands.registerCommand('settingsUpdater.showStatus', async () => {
      const allSources = getConfig<Source[]>(`${CONFIG_NAMESPACE}.sources`) ?? []
      if (allSources.length === 0) {
        vscode.window.showInformationMessage(
          '[Settings Updater] No sources configured. Use "Open extension configuration" to add sources.',
        )
        return
      }

      const items = allSources.map(s => {
        const enabled = s.enabled !== false
        const state = getSourceState(ctx, s.name)
        const lastChecked = state.lastFetchAt
          ? new Date(state.lastFetchAt).toLocaleString()
          : 'never'
        const keysManaged = state.appliedKeys.length

        const icon = !enabled ? '⏸' : keysManaged > 0 ? '✅' : '⬜'
        return {
          label: `${icon} ${s.name}`,
          description: enabled ? `${keysManaged} key(s) managed` : 'disabled',
          detail: `Last checked: ${lastChecked}  |  Source: ${s.url ?? s.file ?? 'unknown'}`,
        }
      })

      await vscode.window.showQuickPick(items, {
        placeHolder: 'Source status overview (read-only)',
        title: 'Settings Updater: Source Status',
        canPickMany: false,
      })
    }),
  )
}

// ---------------------------------------------------------------------------
// Helper: toggle enabled flag in extension settings
// ---------------------------------------------------------------------------

async function setSourceEnabled(sourceName: string, enabled: boolean): Promise<void> {
  const config = vscode.workspace.getConfiguration()
  const sources = config.get<Source[]>(`${CONFIG_NAMESPACE}.sources`) ?? []
  const updated = sources.map(s =>
    s.name === sourceName ? { ...s, enabled } : s,
  )
  await config.update(`${CONFIG_NAMESPACE}.sources`, updated, vscode.ConfigurationTarget.Global)
}
