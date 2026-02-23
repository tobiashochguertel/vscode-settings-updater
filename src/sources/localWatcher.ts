import * as vscode from 'vscode'
import type { ExtensionContext } from 'vscode'
import { getEnabledSources } from '../config'
import { fetchAndApplySource } from '../lifecycle'
import { log } from '../logger'
import { resolveFilePath } from './pathResolver'

const watchers: vscode.FileSystemWatcher[] = []

/**
 * Register FileSystemWatcher for each enabled source that has a `file` property.
 * On file change: re-read and apply (with prompt).
 * On file delete: log warning, keep previously applied settings (safety).
 */
export function startLocalWatchers(ctx: ExtensionContext): void {
  const localSources = getEnabledSources().filter(s => s.file)
  for (const source of localSources) {
    const expanded = resolveFilePath(source.file!)
    // Use the exact file path as glob pattern for a single-file watcher
    const watcher = vscode.workspace.createFileSystemWatcher(
      expanded,
      false, // ignoreCreateEvents
      false, // ignoreChangeEvents
      false, // ignoreDeleteEvents
    )

    watcher.onDidChange(async () => {
      log.info(`[${source.name}] Local file changed: ${expanded}`)
      await fetchAndApplySource(ctx, source, true)
    })

    watcher.onDidCreate(async () => {
      log.info(`[${source.name}] Local file created: ${expanded}`)
      await fetchAndApplySource(ctx, source, true)
    })

    watcher.onDidDelete(() => {
      log.warn(`[${source.name}] Local file deleted: ${expanded} — previously applied settings kept`)
      vscode.window.showWarningMessage(
        `[Settings Updater] Source "${source.name}": file was deleted. Previously applied settings have been kept.`,
      )
    })

    ctx.subscriptions.push(watcher)
    watchers.push(watcher)
    log.info(`[${source.name}] Watching local file: ${expanded}`)
  }
}

export function stopLocalWatchers(): void {
  for (const w of watchers) w.dispose()
  watchers.length = 0
}
