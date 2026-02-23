import * as vscode from 'vscode'
import type { ExtensionContext } from 'vscode'
import { getEnabledSources, getGlobalUpdateInterval } from './config'
import { getSourceState, saveSourceState } from './state'
import { log } from './logger'
import { GLOBAL_STATE_INIT_KEY } from './constants'
import { setIdle } from './statusBar'
import type { Source } from './sources/types'
import { createProductionServices } from './ServiceContainer'

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
  source: Source,
  prompt: boolean,
): Promise<void> {
  const { orchestrator } = createProductionServices(ctx)
  return orchestrator.runForSource(source, prompt)
}
