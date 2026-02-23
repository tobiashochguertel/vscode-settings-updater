import { describe, it, expect } from 'vitest'
import { getSourceState, saveSourceState, isKeyOwnedByAnotherSource } from '../../src/state'
import { defaultSourceState } from '../../src/sources/types'

function makeMockContext() {
  const store: Record<string, unknown> = {}
  return {
    globalState: {
      get: <T>(key: string, def?: T): T => (store[key] as T) ?? (def as T),
      update: (_key: string, value: unknown): Thenable<void> => {
        store[_key] = value
        return Promise.resolve()
      },
    },
  } as any
}

describe('getSourceState', () => {
  it('returns defaultSourceState() for an unknown source name', () => {
    const ctx = makeMockContext()
    expect(getSourceState(ctx, 'unknown')).toEqual(defaultSourceState())
  })
})

describe('saveSourceState + getSourceState', () => {
  it('round-trips: save then retrieve', async () => {
    const ctx = makeMockContext()
    const state = { lastFetchAt: 1234567890, lastContentHash: 'abc123', appliedKeys: ['editor.fontSize'] }
    await saveSourceState(ctx, 'mySource', state)
    expect(getSourceState(ctx, 'mySource')).toEqual(state)
  })
})

describe('multiple sources', () => {
  it('does not mix up state between sources', async () => {
    const ctx = makeMockContext()
    const stateA = { lastFetchAt: 1000, lastContentHash: 'hashA', appliedKeys: ['key.a'] }
    const stateB = { lastFetchAt: 2000, lastContentHash: 'hashB', appliedKeys: ['key.b'] }
    await saveSourceState(ctx, 'a', stateA)
    await saveSourceState(ctx, 'b', stateB)
    expect(getSourceState(ctx, 'a')).toEqual(stateA)
    expect(getSourceState(ctx, 'b')).toEqual(stateB)
  })
})

describe('isKeyOwnedByAnotherSource', () => {
  it('returns false when only the named source owns the key', async () => {
    const ctx = makeMockContext()
    await saveSourceState(ctx, 'src1', { lastFetchAt: 0, lastContentHash: '', appliedKeys: ['editor.fontSize'] })
    expect(isKeyOwnedByAnotherSource(ctx, 'editor.fontSize', 'src1')).toBe(false)
  })

  it('returns true when another source also has the key', async () => {
    const ctx = makeMockContext()
    await saveSourceState(ctx, 'src1', { lastFetchAt: 0, lastContentHash: '', appliedKeys: ['editor.fontSize'] })
    await saveSourceState(ctx, 'src2', { lastFetchAt: 0, lastContentHash: '', appliedKeys: ['editor.fontSize'] })
    expect(isKeyOwnedByAnotherSource(ctx, 'editor.fontSize', 'src1')).toBe(true)
  })

  it('excludes the named source from the check', async () => {
    const ctx = makeMockContext()
    await saveSourceState(ctx, 'src1', { lastFetchAt: 0, lastContentHash: '', appliedKeys: ['editor.fontSize'] })
    await saveSourceState(ctx, 'src2', { lastFetchAt: 0, lastContentHash: '', appliedKeys: ['editor.tabSize'] })
    expect(isKeyOwnedByAnotherSource(ctx, 'editor.fontSize', 'src1')).toBe(false)
  })
})
