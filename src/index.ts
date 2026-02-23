import type { ExtensionContext } from 'vscode'
import { runStartupCheck, startPolling, stopPolling } from './lifecycle'
import { registerCommands } from './commands'
import { log, disposeLogger } from './logger'
import { EXTENSION_ID } from './constants'

export async function activate(ctx: ExtensionContext): Promise<void> {
  log.info(`${EXTENSION_ID} activating`)
  registerCommands(ctx)
  await runStartupCheck(ctx)
  startPolling(ctx)
  log.info(`${EXTENSION_ID} activated`)
}

export function deactivate(): void {
  stopPolling()
  disposeLogger()
}
