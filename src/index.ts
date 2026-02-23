import type { ExtensionContext } from 'vscode'
import { runStartupCheck, startPolling, stopPolling } from './lifecycle'
import { registerCommands } from './commands'
import { log, disposeLogger } from './logger'
import { createStatusBar, disposeStatusBar } from './statusBar'
import { startLocalWatchers, stopLocalWatchers } from './sources/localWatcher'
import { EXTENSION_ID } from './constants'

export async function activate(ctx: ExtensionContext): Promise<void> {
  process.stderr.write('[vscode-settings-updater] activate() starting\n')
  log.info(`${EXTENSION_ID} activating`)
  createStatusBar()
  registerCommands(ctx)
  process.stderr.write('[vscode-settings-updater] registerCommands() done\n')
  startLocalWatchers(ctx)
  await runStartupCheck(ctx)
  startPolling(ctx)
  log.info(`${EXTENSION_ID} activated`)
  process.stderr.write('[vscode-settings-updater] activate() complete\n')
}

export function deactivate(): void {
  stopPolling()
  stopLocalWatchers()
  disposeStatusBar()
  disposeLogger()
}
