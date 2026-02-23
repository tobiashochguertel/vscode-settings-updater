import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockStore: Record<string, unknown> = {}
const mockUpdates: Array<{ key: string; value: unknown }> = []

vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: () => ({
      get: (key: string) => mockStore[key],
      update: vi.fn(async (key: string, value: unknown) => {
        if (value === undefined) {
          delete mockStore[key]
        } else {
          mockStore[key] = value
        }
        mockUpdates.push({ key, value })
      }),
    }),
  },
  ConfigurationTarget: { Global: 1 },
}))

vi.mock('../../src/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const stateStore: Map<string, any> = new Map()

vi.mock('../../src/state', () => ({
  getSourceState: vi.fn((_ctx: any, name: string) =>
    stateStore.get(name) ?? { lastFetchAt: 0, lastContentHash: '', appliedKeys: [] }
  ),
  saveSourceState: vi.fn((_ctx: any, name: string, state: any) => {
    stateStore.set(name, state)
  }),
  isKeyOwnedByAnotherSource: vi.fn((_ctx: any, key: string, excludeName: string) => {
    for (const [name, state] of stateStore.entries()) {
      if (name !== excludeName && state.appliedKeys?.includes(key)) return true
    }
    return false
  }),
}))

import { countChanges, applySource } from '../../src/apply'
import type { Source } from '../../src/sources/types'

const mockCtx = {} as any

beforeEach(() => {
  for (const k of Object.keys(mockStore)) delete mockStore[k]
  mockUpdates.length = 0
  stateStore.clear()
  vi.clearAllMocks()
})

describe('countChanges', () => {
  it('replace strategy: returns 0 when existing === newValue', () => {
    mockStore['editor.fontSize'] = 14
    const source: Source = { name: 'test', mergeStrategy: 'replace' }
    const count = countChanges(mockCtx, source, { 'editor.fontSize': 14 })
    expect(count).toBe(0)
  })

  it('replace strategy: returns 1 when existing !== newValue', () => {
    mockStore['editor.fontSize'] = 14
    const source: Source = { name: 'test', mergeStrategy: 'replace' }
    const count = countChanges(mockCtx, source, { 'editor.fontSize': 16 })
    expect(count).toBe(1)
  })

  it('merge-shallow strategy: returns 0 when merge result equals existing', () => {
    mockStore['editor.settings'] = { fontSize: 14, theme: 'dark' }
    const source: Source = { name: 'test', mergeStrategy: 'merge-shallow' }
    // newValue is a subset with same values — merged result equals existing
    const count = countChanges(mockCtx, source, { 'editor.settings': { fontSize: 14 } })
    expect(count).toBe(0)
  })

  it('merge-deep strategy: returns correct count', () => {
    mockStore['editor.settings'] = { colors: { fg: 'white' } }
    const source: Source = { name: 'test', mergeStrategy: 'merge-deep' }
    // adds a new nested key — merged result differs from existing
    const count = countChanges(mockCtx, source, { 'editor.settings': { colors: { bg: 'black' } } })
    expect(count).toBe(1)
  })
})

describe('applySource', () => {
  it('writes all keys from parsed settings', async () => {
    const source: Source = { name: 'src1' }
    await applySource(mockCtx, source, { 'editor.fontSize': 16, 'editor.tabSize': 2 }, 'hash1')
    expect(mockStore['editor.fontSize']).toBe(16)
    expect(mockStore['editor.tabSize']).toBe(2)
  })

  it('result has correct keysWritten array', async () => {
    const source: Source = { name: 'src1' }
    const result = await applySource(mockCtx, source, { 'editor.fontSize': 16, 'editor.tabSize': 2 }, 'hash1')
    expect(result.keysWritten).toEqual(expect.arrayContaining(['editor.fontSize', 'editor.tabSize']))
    expect(result.keysWritten).toHaveLength(2)
  })

  it('removes key that was in previous appliedKeys but no longer in source', async () => {
    stateStore.set('src1', { lastFetchAt: 0, lastContentHash: '', appliedKeys: ['editor.oldKey'] })
    const source: Source = { name: 'src1' }
    const result = await applySource(mockCtx, source, { 'editor.fontSize': 16 }, 'hash2')
    expect(result.keysRemoved).toContain('editor.oldKey')
    expect(mockUpdates.some(u => u.key === 'editor.oldKey' && u.value === undefined)).toBe(true)
  })

  it('does NOT remove key if owned by another source', async () => {
    stateStore.set('src1', { lastFetchAt: 0, lastContentHash: '', appliedKeys: ['editor.sharedKey'] })
    stateStore.set('src2', { lastFetchAt: 0, lastContentHash: '', appliedKeys: ['editor.sharedKey'] })
    const source: Source = { name: 'src1' }
    const result = await applySource(mockCtx, source, { 'editor.fontSize': 16 }, 'hash2')
    expect(result.keysRemoved).not.toContain('editor.sharedKey')
    expect(mockUpdates.some(u => u.key === 'editor.sharedKey' && u.value === undefined)).toBe(false)
  })
})
