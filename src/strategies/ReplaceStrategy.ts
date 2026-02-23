import type { IMergeStrategy } from './IMergeStrategy'
import type { ParsedSettings } from '../sources/types'

export class ReplaceStrategy implements IMergeStrategy {
  canHandle(strategyName: string): boolean {
    return strategyName === 'replace'
  }

  apply(_existing: unknown, incoming: ParsedSettings[string]): unknown {
    return incoming
  }
}
