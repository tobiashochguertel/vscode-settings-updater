import * as vscode from 'vscode'
import { OUTPUT_CHANNEL_NAME } from './constants'

let channel: vscode.OutputChannel | undefined

export function getLogger(): vscode.OutputChannel {
  if (!channel) channel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME)
  return channel
}

function ts(): string {
  return new Date().toISOString()
}

export const log = {
  info: (msg: string) => getLogger().appendLine(`[${ts()}] INFO  ${msg}`),
  warn: (msg: string) => getLogger().appendLine(`[${ts()}] WARN  ${msg}`),
  error: (msg: string) => getLogger().appendLine(`[${ts()}] ERROR ${msg}`),
}

export function disposeLogger(): void {
  channel?.dispose()
  channel = undefined
}
