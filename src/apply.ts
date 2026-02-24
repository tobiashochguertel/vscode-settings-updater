import * as vscode from 'vscode'
import type { ExtensionContext } from 'vscode'
import type { Source, ParsedSettings } from './sources/types'
import { applyMerge } from './merge'
import { getSourceState, saveSourceState, isKeyOwnedByAnotherSource } from './state'
import { log } from './logger'
import { backupSettingsJson } from './backup'

export interface ApplyResult {
  keysWritten: string[]
  keysRemoved: string[]
}

export async function applySource(
  ctx: ExtensionContext,
  source: Source,
  parsed: ParsedSettings,
  contentHash: string,
): Promise<ApplyResult> {
  const config = vscode.workspace.getConfiguration()
  const strategy = source.mergeStrategy ?? 'replace'
  const state = getSourceState(ctx, source.name)

  // Backup settings.json before making any changes
  await backupSettingsJson(ctx)

  // Determine which keys to write
  const keysToWrite: ParsedSettings = source.targetKey
    ? { [source.targetKey]: parsed[source.targetKey] ?? parsed }
    : parsed

  const keysWritten: string[] = []
  for (const [key, newValue] of Object.entries(keysToWrite)) {
    const existing = config.get(key)
    const merged = applyMerge(existing, newValue, strategy)
    await config.update(key, merged, vscode.ConfigurationTarget.Global)
    keysWritten.push(key)
    log.info(`[${source.name}] wrote "${key}" (strategy: ${strategy})`)
  }

  // Clean up keys removed from this source
  const keysRemoved: string[] = []
  const removed = state.appliedKeys.filter((k) => !keysWritten.includes(k))
  for (const key of removed) {
    if (!isKeyOwnedByAnotherSource(ctx, key, source.name)) {
      await config.update(key, undefined, vscode.ConfigurationTarget.Global)
      keysRemoved.push(key)
      log.info(`[${source.name}] removed "${key}" (no longer in source)`)
    }
  }

  // Persist updated state
  saveSourceState(ctx, source.name, {
    lastFetchAt: Date.now(),
    lastContentHash: contentHash,
    appliedKeys: keysWritten,
  })

  return { keysWritten, keysRemoved }
}

export function countChanges(
  ctx: ExtensionContext,
  source: Source,
  parsed: ParsedSettings,
): number {
  const config = vscode.workspace.getConfiguration()
  const state = getSourceState(ctx, source.name)
  const keysToWrite = source.targetKey
    ? { [source.targetKey]: parsed[source.targetKey] ?? parsed }
    : parsed

  let count = 0
  for (const [key, newValue] of Object.entries(keysToWrite)) {
    const existing = config.get(key)
    const strategy = source.mergeStrategy ?? 'replace'
    const merged = applyMerge(existing, newValue, strategy)
    if (JSON.stringify(existing) !== JSON.stringify(merged)) count++
  }
  // Removed keys
  count += state.appliedKeys.filter((k) => !Object.keys(keysToWrite).includes(k)).length
  return count
}
