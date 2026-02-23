import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockConfig: Record<string, unknown> = {}

vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: () => ({
      get: (key: string) => mockConfig[key],
    }),
  },
}))

import { getEnabledSources, getGlobalUpdateInterval, getGiteaBaseUrl, getDefaultParser } from '../../src/config'
import type { Source } from '../../src/sources/types'

beforeEach(() => {
  for (const k of Object.keys(mockConfig)) delete mockConfig[k]
})

describe('getEnabledSources', () => {
  it('returns empty array when no sources configured', () => {
    expect(getEnabledSources()).toEqual([])
  })

  it('returns all sources when enabled is undefined (default enabled)', () => {
    mockConfig['settingsUpdater.sources'] = [
      { name: 'a', url: 'https://example.com', targetKey: 'x' },
    ] as Source[]
    expect(getEnabledSources()).toHaveLength(1)
  })

  it('filters out sources with enabled: false', () => {
    mockConfig['settingsUpdater.sources'] = [
      { name: 'a', url: 'https://a.com', targetKey: 'x', enabled: true },
      { name: 'b', url: 'https://b.com', targetKey: 'y', enabled: false },
    ] as Source[]
    const result = getEnabledSources()
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('a')
  })
})

describe('getGlobalUpdateInterval', () => {
  it('returns default when not configured', () => {
    const result = getGlobalUpdateInterval()
    expect(typeof result).toBe('number')
    expect(result).toBeGreaterThan(0)
  })

  it('returns configured value', () => {
    mockConfig['settingsUpdater.autoUpdateInterval'] = 120
    expect(getGlobalUpdateInterval()).toBe(120)
  })
})

describe('getGiteaBaseUrl', () => {
  it('returns empty string when not configured', () => {
    expect(getGiteaBaseUrl()).toBe('')
  })

  it('returns configured value', () => {
    mockConfig['settingsUpdater.giteaBaseUrl'] = 'https://my.gitea.com'
    expect(getGiteaBaseUrl()).toBe('https://my.gitea.com')
  })
})

describe('getDefaultParser', () => {
  it('returns jsonc-block by default', () => {
    expect(getDefaultParser()).toBe('jsonc-block')
  })
})
