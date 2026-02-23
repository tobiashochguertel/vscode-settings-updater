import { describe, it, expect } from 'vitest'
import { applyMerge } from '../../src/merge'

describe('replace', () => {
  it('replaces existing value entirely', () => {
    expect(applyMerge({ a: 1, b: 2 }, { c: 3 }, 'replace')).toEqual({ c: 3 })
  })
})

describe('merge-shallow', () => {
  it('merges top-level keys, preserves existing sub-keys', () => {
    const existing = { a: 'old', b: 'keep' }
    const incoming = { a: 'new', c: 'add' }
    expect(applyMerge(existing, incoming, 'merge-shallow')).toEqual({ a: 'new', b: 'keep', c: 'add' })
  })
  it('falls back to replace for non-objects', () => {
    expect(applyMerge('old', 'new', 'merge-shallow')).toBe('new')
  })
})

describe('merge-deep', () => {
  it('recursively merges nested objects', () => {
    const existing = { a: { x: 1, y: 2 } }
    const incoming = { a: { x: 99, z: 3 } }
    expect(applyMerge(existing, incoming, 'merge-deep')).toEqual({ a: { x: 99, y: 2, z: 3 } })
  })
  it('concatenates arrays', () => {
    expect(applyMerge([1, 2], [3, 4], 'merge-deep')).toEqual([1, 2, 3, 4])
  })
})
