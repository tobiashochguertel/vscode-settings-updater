import type { IMergeStrategy } from './IMergeStrategy'
import type { ParsedSettings } from '../sources/types'

function deepMerge(existing: unknown, incoming: unknown): unknown {
  if (
    existing !== null &&
    typeof existing === 'object' &&
    !Array.isArray(existing) &&
    typeof incoming === 'object' &&
    incoming !== null &&
    !Array.isArray(incoming)
  ) {
    const result = { ...(existing as Record<string, unknown>) }
    for (const [key, value] of Object.entries(incoming as Record<string, unknown>)) {
      result[key] = deepMerge(result[key], value)
    }
    return result
  }
  return incoming
}

export class MergeDeepStrategy implements IMergeStrategy {
  canHandle(strategyName: string): boolean {
    return strategyName === 'merge-deep'
  }

  apply(existing: unknown, incoming: ParsedSettings[string]): unknown {
    return deepMerge(existing, incoming)
  }
}
