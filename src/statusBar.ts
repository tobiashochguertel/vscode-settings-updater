import * as vscode from 'vscode'

let statusBarItem: vscode.StatusBarItem | undefined

const IDLE_TEXT = '$(sync) Settings Updater'
const UPDATING_TEXT = '$(sync~spin) Settings Updater'
const ERROR_TEXT = '$(warning) Settings Updater'

export function createStatusBar(): vscode.StatusBarItem {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    -1000, // low priority — show on far right
  )
  statusBarItem.command = 'settingsUpdater.showStatus'
  statusBarItem.tooltip = 'Settings Updater — click to show source status'
  setIdle()
  statusBarItem.show()
  return statusBarItem
}

export function setUpdating(sourceName?: string): void {
  if (!statusBarItem) return
  statusBarItem.text = UPDATING_TEXT
  statusBarItem.tooltip = sourceName
    ? `Settings Updater — updating "${sourceName}"…`
    : 'Settings Updater — updating…'
}

export function setError(message?: string): void {
  if (!statusBarItem) return
  statusBarItem.text = ERROR_TEXT
  statusBarItem.tooltip = message
    ? `Settings Updater — error: ${message}`
    : 'Settings Updater — one or more sources failed (click to show log)'
  statusBarItem.command = 'settingsUpdater.showLog'
}

export function setIdle(): void {
  if (!statusBarItem) return
  statusBarItem.text = IDLE_TEXT
  statusBarItem.tooltip = 'Settings Updater — click to show source status'
  statusBarItem.command = 'settingsUpdater.showStatus'
}

export function disposeStatusBar(): void {
  statusBarItem?.dispose()
  statusBarItem = undefined
}
