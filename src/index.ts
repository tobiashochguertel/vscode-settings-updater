import * as vscode from 'vscode'
import type { ExtensionContext } from 'vscode'
import { runStartupCheck, startPolling, stopPolling } from './lifecycle'
import { registerCommands } from './commands'
import { log, disposeLogger } from './logger'
import { createStatusBar, disposeStatusBar } from './statusBar'
import { startLocalWatchers, stopLocalWatchers } from './sources/localWatcher'
import { EXTENSION_ID } from './constants'

/**
 * API exported from activate() and accessible via `ext.exports` in E2E tests.
 *
 * The `--extensionTestsPath` runner has an isolated `vscode` proxy that cannot
 * see commands registered by the development extension. By returning an object
 * that wraps the extension's own `vscode.commands.executeCommand`, tests can
 * invoke extension commands through the correct IPC channel.
 */
export interface ExtensionTestAPI {
  /** True once activate() has completed. */
  readonly activated: true
  /** Execute a command using the extension's own vscode proxy (works in test mode). */
  executeCommand(command: string, ...args: unknown[]): Thenable<unknown>
}

export async function activate(ctx: ExtensionContext): Promise<ExtensionTestAPI> {
  log.info(`${EXTENSION_ID} activating`)
  createStatusBar()
  registerCommands(ctx)
  startLocalWatchers(ctx)
  await runStartupCheck(ctx)
  startPolling(ctx)
  log.info(`${EXTENSION_ID} activated`)

  return {
    activated: true,
    executeCommand: (cmd, ...args) => vscode.commands.executeCommand(cmd, ...args),
  }
}

export function deactivate(): void {
  stopPolling()
  stopLocalWatchers()
  disposeStatusBar()
  disposeLogger()
}
