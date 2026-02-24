import type { ExtensionContext } from 'vscode'
import type { SourceState } from './sources/types'
import { GLOBAL_STATE_SOURCES_KEY } from './constants'
import { defaultSourceState } from './sources/types'

type StateMap = Record<string, SourceState>

function readStateMap(ctx: ExtensionContext): StateMap {
  return ctx.globalState.get<StateMap>(GLOBAL_STATE_SOURCES_KEY) ?? {}
}

export function getSourceState(ctx: ExtensionContext, sourceName: string): SourceState {
  return readStateMap(ctx)[sourceName] ?? defaultSourceState()
}

export function saveSourceState(
  ctx: ExtensionContext,
  sourceName: string,
  state: SourceState,
): void {
  const map = readStateMap(ctx)
  map[sourceName] = state
  ctx.globalState.update(GLOBAL_STATE_SOURCES_KEY, map)
}

export function isKeyOwnedByAnotherSource(
  ctx: ExtensionContext,
  key: string,
  excludeSourceName: string,
): boolean {
  const map = readStateMap(ctx)
  return Object.entries(map).some(
    ([name, state]) => name !== excludeSourceName && state.appliedKeys.includes(key),
  )
}
