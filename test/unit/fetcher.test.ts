import { describe, it, expect, vi, afterEach } from 'vitest'
import { hashContent, fetchRaw } from '../../src/sources/fetcher'

describe('hashContent', () => {
  it('returns a non-empty hex string', () => {
    const h = hashContent('hello world')
    expect(h).toMatch(/^[a-f0-9]+$/)
  })

  it('is deterministic', () => {
    expect(hashContent('abc')).toBe(hashContent('abc'))
  })

  it('differs for different inputs', () => {
    expect(hashContent('a')).not.toBe(hashContent('b'))
  })
})

describe('fetchRaw', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('returns response text on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'hello content',
    }) as any
    const result = await fetchRaw('https://example.com/file')
    expect(result).toBe('hello content')
  })

  it('throws on non-ok HTTP status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => '',
    }) as any
    await expect(fetchRaw('https://example.com/missing')).rejects.toThrow('HTTP 404')
  })

  it('clears the abort timer after success', async () => {
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout')
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'ok',
    }) as any
    await fetchRaw('https://example.com/file')
    expect(clearSpy).toHaveBeenCalled()
    clearSpy.mockRestore()
  })
})
