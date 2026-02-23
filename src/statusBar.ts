import * as vscode from 'vscode'

const IDLE_TEXT = '$(sync) Settings Updater'
const UPDATING_TEXT = '$(sync~spin) Settings Updater'
const ERROR_TEXT = '$(warning) Settings Updater'

export interface IStatusBar {
  setUpdating(sourceName?: string): void
  setIdle(): void
  setError(message?: string): void
  dispose(): void
}

export class StatusBarController implements IStatusBar {
  private static instance: StatusBarController | null = null
  private readonly item: vscode.StatusBarItem

  private constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      -1000, // low priority — show on far right
    )
    this.item.command = 'settingsUpdater.showStatus'
    this.item.tooltip = 'Settings Updater — click to show source status'
    this.setIdle()
    this.item.show()
  }

  static getInstance(): StatusBarController {
    if (!StatusBarController.instance) {
      StatusBarController.instance = new StatusBarController()
    }
    return StatusBarController.instance
  }

  /** Call in tests to reset singleton between test runs */
  static reset(): void {
    StatusBarController.instance = null
  }

  getItem(): vscode.StatusBarItem {
    return this.item
  }

  setUpdating(sourceName?: string): void {
    this.item.text = UPDATING_TEXT
    this.item.tooltip = sourceName
      ? `Settings Updater — updating "${sourceName}"…`
      : 'Settings Updater — updating…'
  }

  setIdle(): void {
    this.item.text = IDLE_TEXT
    this.item.tooltip = 'Settings Updater — click to show source status'
    this.item.command = 'settingsUpdater.showStatus'
  }

  setError(message?: string): void {
    this.item.text = ERROR_TEXT
    this.item.tooltip = message
      ? `Settings Updater — error: ${message}`
      : 'Settings Updater — one or more sources failed (click to show log)'
    this.item.command = 'settingsUpdater.showLog'
  }

  dispose(): void {
    this.item.dispose()
    StatusBarController.instance = null
  }
}

export function createStatusBar(): vscode.StatusBarItem {
  return StatusBarController.getInstance().getItem()
}

export function setUpdating(sourceName?: string): void {
  StatusBarController.getInstance().setUpdating(sourceName)
}

export function setError(message?: string): void {
  StatusBarController.getInstance().setError(message)
}

export function setIdle(): void {
  StatusBarController.getInstance().setIdle()
}

export function disposeStatusBar(): void {
  StatusBarController.getInstance().dispose()
}
