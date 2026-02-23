import type { ParsedSettings } from '../sources/types'

export interface IMergeStrategy {
  /** Returns true if this strategy handles the given mergeStrategy string */
  canHandle(strategyName: string): boolean
  /** Apply strategy: compute the value to write to settings.json */
  apply(existing: unknown, incoming: ParsedSettings[string]): unknown
}
