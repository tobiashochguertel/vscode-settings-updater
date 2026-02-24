export type MergeStrategy = 'replace' | 'merge-deep' | 'merge-shallow'
export type ParserType = 'jsonc-block' | 'jsonc-file'

export interface Source {
  name: string
  enabled?: boolean
  url?: string
  file?: string
  parser?: ParserType
  targetKey?: string
  mergeStrategy?: MergeStrategy
  updateInterval?: number
}

export interface SourceState {
  lastFetchAt: number // Unix timestamp ms; 0 if never fetched
  lastContentHash: string // SHA-256 hex of last fetched raw content; '' if never
  appliedKeys: string[] // settings.json keys written by this source
}

export type ParsedSettings = Record<string, unknown>

export function defaultSourceState(): SourceState {
  return { lastFetchAt: 0, lastContentHash: '', appliedKeys: [] }
}
