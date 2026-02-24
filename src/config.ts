import * as vscode from 'vscode'
import type { Source, ParserType } from './sources/types'
import { CONFIG_NAMESPACE, DEFAULT_UPDATE_INTERVAL_MINUTES } from './constants'

export function getConfig<T>(key: string): T | undefined {
  return vscode.workspace.getConfiguration().get<T>(key)
}

export function getEnabledSources(): Source[] {
  const sources = getConfig<Source[]>(`${CONFIG_NAMESPACE}.sources`) ?? []
  return sources.filter((s) => s.enabled !== false)
}

export function getDefaultParser(): ParserType {
  return getConfig<ParserType>(`${CONFIG_NAMESPACE}.defaultParser`) ?? 'jsonc-block'
}

export function getGlobalUpdateInterval(): number {
  return (
    getConfig<number>(`${CONFIG_NAMESPACE}.autoUpdateInterval`) ?? DEFAULT_UPDATE_INTERVAL_MINUTES
  )
}

export function getBackupLimit(): number {
  return getConfig<number>(`${CONFIG_NAMESPACE}.backupLimit`) ?? 100
}

export function getGiteaBaseUrl(): string {
  return getConfig<string>(`${CONFIG_NAMESPACE}.giteaBaseUrl`) ?? ''
}
