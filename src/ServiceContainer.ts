import type { ExtensionContext } from 'vscode'
import { RemoteSourceReader } from './sources/RemoteSourceReader'
import { LocalFileSourceReader } from './sources/LocalFileSourceReader'
import type { ISourceReader } from './sources/ISourceReader'
import { ParserRegistry } from './parsers/ParserRegistry'
import { MergeStrategyRegistry } from './strategies/MergeStrategyRegistry'
import { UpdateOrchestrator } from './UpdateOrchestrator'

export interface Services {
  readers: ISourceReader[]
  parsers: ParserRegistry
  mergeStrategies: MergeStrategyRegistry
  orchestrator: UpdateOrchestrator
}

export function createProductionServices(ctx: ExtensionContext): Services {
  const readers: ISourceReader[] = [new RemoteSourceReader(), new LocalFileSourceReader()]
  const parsers = new ParserRegistry()
  const mergeStrategies = new MergeStrategyRegistry()
  const orchestrator = new UpdateOrchestrator(readers, parsers, mergeStrategies, ctx)
  return { readers, parsers, mergeStrategies, orchestrator }
}

export function createTestServices(
  ctx: ExtensionContext,
  overrides: Partial<{
    readers: ISourceReader[]
    parsers: ParserRegistry
    mergeStrategies: MergeStrategyRegistry
  }> = {},
): Services {
  const readers = overrides.readers ?? [new RemoteSourceReader(), new LocalFileSourceReader()]
  const parsers = overrides.parsers ?? new ParserRegistry()
  const mergeStrategies = overrides.mergeStrategies ?? new MergeStrategyRegistry()
  const orchestrator = new UpdateOrchestrator(readers, parsers, mergeStrategies, ctx)
  return { readers, parsers, mergeStrategies, orchestrator }
}
