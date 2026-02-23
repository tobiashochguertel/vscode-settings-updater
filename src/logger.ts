import * as vscode from 'vscode'
import { OUTPUT_CHANNEL_NAME } from './constants'

export interface ILogger {
  info(msg: string): void
  warn(msg: string): void
  error(msg: string): void
  show(): void
  dispose(): void
}

export class Logger implements ILogger {
  private static instance: Logger | null = null
  private readonly channel: vscode.OutputChannel

  private constructor() {
    this.channel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME)
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  /** Call in tests to reset singleton between test runs */
  static reset(): void {
    Logger.instance = null
  }

  getOutputChannel(): vscode.OutputChannel {
    return this.channel
  }

  info(msg: string): void {
    this.channel.appendLine(`[INFO]  ${new Date().toISOString()} ${msg}`)
  }

  warn(msg: string): void {
    this.channel.appendLine(`[WARN]  ${new Date().toISOString()} ${msg}`)
  }

  error(msg: string): void {
    this.channel.appendLine(`[ERROR] ${new Date().toISOString()} ${msg}`)
  }

  show(): void {
    this.channel.show()
  }

  dispose(): void {
    this.channel.dispose()
    Logger.instance = null
  }
}

// Backward-compat module-level accessor — delegates to Singleton
export const log: ILogger = {
  info: (msg) => Logger.getInstance().info(msg),
  warn: (msg) => Logger.getInstance().warn(msg),
  error: (msg) => Logger.getInstance().error(msg),
  show: () => Logger.getInstance().show(),
  dispose: () => Logger.getInstance().dispose(),
}

/** @deprecated Use Logger.getInstance().getOutputChannel() */
export function getLogger(): vscode.OutputChannel {
  return Logger.getInstance().getOutputChannel()
}

export function disposeLogger(): void {
  Logger.getInstance().dispose()
}
