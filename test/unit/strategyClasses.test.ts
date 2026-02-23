import { describe, it, expect } from 'vitest'
import { ReplaceStrategy } from '../../src/strategies/ReplaceStrategy'
import { MergeShallowStrategy } from '../../src/strategies/MergeShallowStrategy'
import { MergeDeepStrategy } from '../../src/strategies/MergeDeepStrategy'
import { MergeStrategyRegistry } from '../../src/strategies/MergeStrategyRegistry'

describe('ReplaceStrategy', () => {
  const s = new ReplaceStrategy()

  it('canHandle replace', () => expect(s.canHandle('replace')).toBe(true))
  it('canHandle: false for others', () => expect(s.canHandle('merge-shallow')).toBe(false))
  it('returns incoming value directly', () => {
    expect(s.apply({ a: 1 }, { b: 2 })).toEqual({ b: 2 })
  })
  it('works with primitive values', () => {
    expect(s.apply('old', 'new')).toBe('new')
  })
})

describe('MergeShallowStrategy', () => {
  const s = new MergeShallowStrategy()

  it('canHandle merge-shallow', () => expect(s.canHandle('merge-shallow')).toBe(true))
  it('merges top-level keys', () => {
    expect(s.apply({ a: 1, b: 2 }, { b: 99, c: 3 })).toEqual({ a: 1, b: 99, c: 3 })
  })
  it('does NOT deep merge nested objects', () => {
    const result = s.apply({ a: { x: 1, y: 2 } }, { a: { x: 99 } }) as any
    // shallow merge replaces the nested object entirely for key 'a'
    expect(result.a).toEqual({ x: 99 })
  })
  it('falls back to replace for non-object existing', () => {
    expect(s.apply('old', { a: 1 })).toEqual({ a: 1 })
  })
  it('falls back to replace for non-object incoming', () => {
    expect(s.apply({ a: 1 }, 'new')).toBe('new')
  })
})

describe('MergeDeepStrategy', () => {
  const s = new MergeDeepStrategy()

  it('canHandle merge-deep', () => expect(s.canHandle('merge-deep')).toBe(true))
  it('recursively merges nested objects', () => {
    const result = s.apply({ a: { x: 1, y: 2 }, b: 3 }, { a: { x: 99, z: 4 } }) as any
    expect(result).toEqual({ a: { x: 99, y: 2, z: 4 }, b: 3 })
  })
  it('returns incoming for non-object existing', () => {
    expect(s.apply('old', { a: 1 })).toEqual({ a: 1 })
  })
  it('deeply merges multiple levels', () => {
    const result = s.apply(
      { a: { b: { c: 1, d: 2 } } },
      { a: { b: { c: 99 } } }
    ) as any
    expect(result.a.b).toEqual({ c: 99, d: 2 })
  })
})

describe('MergeStrategyRegistry', () => {
  const registry = new MergeStrategyRegistry()

  it('dispatches replace', () => {
    expect(registry.apply('replace', 'old', 'new')).toBe('new')
  })

  it('dispatches merge-shallow', () => {
    expect(registry.apply('merge-shallow', { a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 })
  })

  it('dispatches merge-deep', () => {
    expect(registry.apply('merge-deep', { a: { x: 1 } }, { a: { y: 2 } })).toEqual({
      a: { x: 1, y: 2 },
    })
  })

  it('defaults to replace for unknown strategy name', () => {
    expect(registry.apply('unknown-strategy', 'old', 'new')).toBe('new')
  })

  it('accepts custom strategies via constructor injection', () => {
    const customStrategy = {
      canHandle: (name: string) => name === 'custom',
      apply: (_: unknown, incoming: unknown) => `custom:${incoming}`,
    }
    const customRegistry = new MergeStrategyRegistry([customStrategy])
    expect(customRegistry.apply('custom', null, 'value')).toBe('custom:value')
  })
})
