import type { IMergeStrategy } from './IMergeStrategy'
import type { ParsedSettings } from '../sources/types'
import { ReplaceStrategy } from './ReplaceStrategy'
import { MergeShallowStrategy } from './MergeShallowStrategy'
import { MergeDeepStrategy } from './MergeDeepStrategy'

export class MergeStrategyRegistry {
  private readonly strategies: IMergeStrategy[]

  constructor(
    strategies: IMergeStrategy[] = [
      new ReplaceStrategy(),
      new MergeShallowStrategy(),
      new MergeDeepStrategy(),
    ],
  ) {
    this.strategies = strategies
  }

  apply(strategyName: string, existing: unknown, incoming: ParsedSettings[string]): unknown {
    const strategy = this.strategies.find((s) => s.canHandle(strategyName))
    // Default to replace if no match
    return strategy ? strategy.apply(existing, incoming) : incoming
  }
}
