import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: () => ({
      get: vi.fn().mockReturnValue(undefined),
    }),
  },
}))

const mockSources: any[] = []
vi.mock('../../src/config', () => ({
  getEnabledSources: vi.fn(() => mockSources),
  getGlobalUpdateInterval: vi.fn(() => 60),
}))

const mockFetch = vi.fn().mockResolvedValue(undefined)
vi.mock('../../src/ServiceContainer', () => ({
  createProductionServices: vi.fn(() => ({
    orchestrator: { runForSource: mockFetch },
  })),
}))

const mockStateStore: Record<string, any> = {}
vi.mock('../../src/state', () => ({
  getSourceState: vi.fn((_ctx: any, name: string) =>
    mockStateStore[name] ?? { lastFetchAt: 0, lastContentHash: '', appliedKeys: [] }
  ),
  saveSourceState: vi.fn(),
}))

vi.mock('../../src/statusBar', () => ({
  setIdle: vi.fn(),
  setUpdating: vi.fn(),
  setError: vi.fn(),
}))

vi.mock('../../src/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { runStartupCheck, startPolling, stopPolling } from '../../src/lifecycle'

describe('lifecycle', () => {
  let ctx: any

  beforeEach(() => {
    vi.clearAllMocks()
    for (const k of Object.keys(mockStateStore)) delete mockStateStore[k]
    mockSources.length = 0
    ctx = {
      globalState: {
        get: vi.fn().mockReturnValue(false),
        update: vi.fn(),
      },
    }
  })

  afterEach(() => {
    stopPolling()
  })

  describe('runStartupCheck — first run', () => {
    it('applies all enabled sources silently (prompt=false) on first run', async () => {
      mockSources.push(
        { name: 'src1', url: 'https://a.com', enabled: true },
        { name: 'src2', url: 'https://b.com', enabled: true },
      )
      await runStartupCheck(ctx)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('sets initialized flag after first run', async () => {
      await runStartupCheck(ctx)
      expect(ctx.globalState.update).toHaveBeenCalledWith(
        expect.any(String),
        true
      )
    })
  })

  describe('runStartupCheck — subsequent run', () => {
    beforeEach(() => {
      ctx.globalState.get = vi.fn().mockReturnValue(true)
    })

    it('skips sources with unexpired interval', async () => {
      mockSources.push({ name: 'fresh', url: 'https://a.com', enabled: true, updateInterval: 60 })
      mockStateStore['fresh'] = { lastFetchAt: Date.now() - 1000, lastContentHash: '', appliedKeys: [] }
      await runStartupCheck(ctx)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('fetches sources with expired interval', async () => {
      mockSources.push({ name: 'stale', url: 'https://a.com', enabled: true, updateInterval: 60 })
      mockStateStore['stale'] = { lastFetchAt: Date.now() - 7_200_000, lastContentHash: '', appliedKeys: [] }
      await runStartupCheck(ctx)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('skips local file sources (handled by watcher)', async () => {
      mockSources.push({ name: 'local', file: '/path/to/file.jsonc', enabled: true })
      await runStartupCheck(ctx)
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('startPolling / stopPolling', () => {
    it('stopPolling clears all timers without error when none running', () => {
      expect(() => stopPolling()).not.toThrow()
    })

    it('startPolling creates timers for URL sources', () => {
      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval')
      mockSources.push(
        { name: 'src1', url: 'https://a.com', enabled: true },
        { name: 'src2', url: 'https://b.com', enabled: true },
      )
      startPolling(ctx)
      expect(setIntervalSpy).toHaveBeenCalledTimes(2)
      setIntervalSpy.mockRestore()
    })

    it('stopPolling clears all timers started by startPolling', () => {
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')
      mockSources.push({ name: 's', url: 'https://a.com', enabled: true })
      startPolling(ctx)
      stopPolling()
      expect(clearIntervalSpy).toHaveBeenCalled()
      clearIntervalSpy.mockRestore()
    })
  })
})
