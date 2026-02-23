import type { IMergeStrategy } from './IMergeStrategy'
import type { ParsedSettings } from '../sources/types'

export class MergeShallowStrategy implements IMergeStrategy {
  canHandle(strategyName: string): boolean {
    return strategyName === 'merge-shallow'
  }

  apply(existing: unknown, incoming: ParsedSettings[string]): unknown {
    if (
      existing !== null &&
      typeof existing === 'object' &&
      !Array.isArray(existing) &&
      typeof incoming === 'object' &&
      incoming !== null &&
      !Array.isArray(incoming)
    ) {
      return { ...(existing as Record<string, unknown>), ...(incoming as Record<string, unknown>) }
    }
    return incoming
  }
}
