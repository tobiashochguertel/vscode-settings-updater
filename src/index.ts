import type { ExtensionContext } from 'vscode'
import { runStartupCheck, startPolling, stopPolling } from './lifecycle'
import { registerCommands } from './commands'
import { log, disposeLogger } from './logger'
import { createStatusBar, disposeStatusBar } from './statusBar'
import { startLocalWatchers, stopLocalWatchers } from './sources/localWatcher'
import { EXTENSION_ID } from './constants'

export async function activate(ctx: ExtensionContext): Promise<void> {
  log.info(`${EXTENSION_ID} activating`)
  createStatusBar()
  registerCommands(ctx)
  startLocalWatchers(ctx)
  await runStartupCheck(ctx)
  startPolling(ctx)
  log.info(`${EXTENSION_ID} activated`)
}

export function deactivate(): void {
  stopPolling()
  stopLocalWatchers()
  disposeStatusBar()
  disposeLogger()
}
