import * as vscode from 'vscode'
import type { ExtensionContext } from 'vscode'
import { getEnabledSources, getDefaultParser, getGlobalUpdateInterval } from './config'
import { resolveUrl } from './sources/resolver'
import { fetchRaw, hashContent } from './sources/fetcher'
import { parseContent } from './sources/parser'
import { getSourceState, saveSourceState } from './state'
import { applySource, countChanges } from './apply'
import { log } from './logger'
import { GLOBAL_STATE_INIT_KEY } from './constants'

const pollingTimers: NodeJS.Timeout[] = []

export async function runStartupCheck(ctx: ExtensionContext): Promise<void> {
  const initialized = ctx.globalState.get<boolean>(GLOBAL_STATE_INIT_KEY, false)

  if (!initialized) {
    ctx.globalState.update(GLOBAL_STATE_INIT_KEY, true)
    log.info('First run — applying all sources without prompt')
    for (const source of getEnabledSources()) {
      await fetchAndApplySource(ctx, source, false)
    }
    return
  }

  for (const source of getEnabledSources()) {
    if (source.file) continue  // handled by file watcher
    const state = getSourceState(ctx, source.name)
    const intervalMs = (source.updateInterval ?? getGlobalUpdateInterval()) * 60_000
    if (Date.now() - state.lastFetchAt >= intervalMs) {
      await fetchAndApplySource(ctx, source, true)
    }
  }
}

export function startPolling(ctx: ExtensionContext): void {
  const sources = getEnabledSources().filter(s => s.url)
  for (const source of sources) {
    const intervalMs = (source.updateInterval ?? getGlobalUpdateInterval()) * 60_000
    const timer = setInterval(() => fetchAndApplySource(ctx, source, true), intervalMs)
    pollingTimers.push(timer)
  }
}

export function stopPolling(): void {
  for (const t of pollingTimers) clearInterval(t)
  pollingTimers.length = 0
}

export async function fetchAndApplySource(
  ctx: ExtensionContext,
  source: { name: string; url?: string; file?: string; parser?: any; mergeStrategy?: any; targetKey?: string; updateInterval?: number; enabled?: boolean },
  prompt: boolean,
): Promise<void> {
  try {
    let raw: string
    let contentHash: string

    if (source.url) {
      const resolvedUrl = resolveUrl(source.url)
      log.info(`[${source.name}] Fetching ${resolvedUrl}`)
      raw = await fetchRaw(resolvedUrl)
      contentHash = hashContent(raw)
      const state = getSourceState(ctx, source.name)
      if (contentHash === state.lastContentHash) {
        log.info(`[${source.name}] No change detected, skipping`)
        saveSourceState(ctx, source.name, { ...state, lastFetchAt: Date.now() })
        return
      }
    } else if (source.file) {
      const expanded = source.file.replace(/^~/, require('os').homedir())
      const uri = vscode.Uri.file(expanded)
      const bytes = await vscode.workspace.fs.readFile(uri)
      raw = new TextDecoder().decode(bytes)
      contentHash = hashContent(raw)
    } else {
      log.warn(`[${source.name}] Source has neither url nor file — skipping`)
      return
    }

    const parser = source.parser ?? getDefaultParser()
    const parsed = parseContent(raw, parser)
    const changeCount = countChanges(ctx, source, parsed)

    if (changeCount === 0) {
      log.info(`[${source.name}] Settings already up-to-date`)
      return
    }

    if (prompt) {
      const action = await vscode.window.showInformationMessage(
        `[Settings Updater] "${source.name}": ${changeCount} setting${changeCount !== 1 ? 's' : ''} will change.`,
        'Update',
        'Skip this time',
      )
      if (action !== 'Update') {
        log.info(`[${source.name}] User skipped update`)
        return
      }
    }

    const result = await applySource(ctx, source, parsed, contentHash)
    log.info(`[${source.name}] Applied: ${result.keysWritten.length} written, ${result.keysRemoved.length} removed`)
    vscode.window.showInformationMessage(`[Settings Updater] "${source.name}" updated successfully.`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    log.error(`[${source.name}] Error: ${msg}`)
    vscode.window.showWarningMessage(`[Settings Updater] "${source.name}" failed: ${msg}`)
  }
}
