import * as vscode from 'vscode'
import type { ExtensionContext } from 'vscode'
import { runStartupCheck, startPolling, stopPolling } from './lifecycle'
import { registerCommands } from './commands'
import { log, disposeLogger } from './logger'
import { createStatusBar, disposeStatusBar } from './statusBar'
import { startLocalWatchers, stopLocalWatchers } from './sources/localWatcher'
import { EXTENSION_ID } from './constants'

export async function activate(ctx: ExtensionContext): Promise<void> {
  console.log(`[${EXTENSION_ID}] activate() called`)
  try {
    log.info(`${EXTENSION_ID} activating`)
    createStatusBar()
    console.log(`[${EXTENSION_ID}] calling registerCommands`)
    registerCommands(ctx)
    const cmdsAfter = await vscode.commands.getCommands(true)
    console.log(`[${EXTENSION_ID}] after registerCommands, settingsUpdater cmds:`, cmdsAfter.filter(c => c.startsWith('settingsUpdater.')))
    startLocalWatchers(ctx)
    await runStartupCheck(ctx)
    startPolling(ctx)
    log.info(`${EXTENSION_ID} activated`)
    console.log(`[${EXTENSION_ID}] activate() complete`)
  } catch (err) {
    console.error(`[${EXTENSION_ID}] activate() ERROR:`, err)
    throw err
  }
}

export function deactivate(): void {
  stopPolling()
  stopLocalWatchers()
  disposeStatusBar()
  disposeLogger()
}
