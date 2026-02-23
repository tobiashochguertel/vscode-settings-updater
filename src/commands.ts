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
      // Give VS Code a moment to open the document before trying to reveal
      await new Promise(resolve => setTimeout(resolve, 200))
      const editor = vscode.window.activeTextEditor
      if (!editor) return
      const text = editor.document.getText()
      const idx = text.indexOf('"settingsUpdater')
      if (idx === -1) return
      const pos = editor.document.positionAt(idx)
      editor.selection = new vscode.Selection(pos, pos)
      editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter)
    }),

    // ---- showStatus ----
    vscode.commands.registerCommand('settingsUpdater.showStatus', async () => {
      const allSources = getConfig<Source[]>(`${CONFIG_NAMESPACE}.sources`) ?? []

      const panel = vscode.window.createWebviewPanel(
        'settingsUpdaterStatus',
        'Settings Updater: Source Status',
        vscode.ViewColumn.One,
        { enableScripts: false },
      )

      panel.webview.html = buildStatusHtml(ctx, allSources)
    }),
  )
}

// ---------------------------------------------------------------------------
// Helper: build HTML for the status WebView panel
// ---------------------------------------------------------------------------

function buildStatusHtml(ctx: ExtensionContext, sources: Source[]): string {
  const rows = sources.map(s => {
    const enabled = s.enabled !== false
    const state = getSourceState(ctx, s.name)
    const lastChecked = state.lastFetchAt
      ? new Date(state.lastFetchAt).toLocaleString()
      : 'never'
    const keysManaged = state.appliedKeys.length
    const icon = !enabled ? '⏸' : keysManaged > 0 ? '✅' : '⬜'
    const status = !enabled ? 'disabled' : keysManaged > 0 ? 'active' : 'pending'
    const sourceRef = s.url ?? s.file ?? 'unknown'
    return `<tr>
      <td>${icon} ${escHtml(s.name)}</td>
      <td>${escHtml(status)}</td>
      <td>${escHtml(lastChecked)}</td>
      <td>${keysManaged}</td>
      <td><code>${escHtml(sourceRef)}</code></td>
    </tr>`
  }).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Settings Updater: Source Status</title>
<style>
  body { background: #1e1e2e; color: #cdd6f4; font-family: sans-serif; padding: 1rem; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #45475a; padding: 0.5rem 0.75rem; text-align: left; }
  th { background: #313244; }
  tr:nth-child(even) { background: #181825; }
  code { font-size: 0.9em; }
</style>
</head>
<body>
<h2>Settings Updater — Source Status</h2>
<table>
  <thead>
    <tr>
      <th>Source Name</th>
      <th>Status</th>
      <th>Last Checked</th>
      <th>Keys Managed</th>
      <th>Source URL/File</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>
</body>
</html>`
}

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
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
