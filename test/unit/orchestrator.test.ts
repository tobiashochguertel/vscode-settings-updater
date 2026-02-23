import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ISourceReader } from '../../src/sources/ISourceReader'
import type { Source } from '../../src/sources/types'
import { ParserRegistry } from '../../src/parsers/ParserRegistry'
import { MergeStrategyRegistry } from '../../src/strategies/MergeStrategyRegistry'
import { UpdateOrchestrator } from '../../src/UpdateOrchestrator'

// Mock vscode
vi.mock('vscode', () => ({
  window: {
    showInformationMessage: vi.fn().mockResolvedValue('Apply'),
    showWarningMessage: vi.fn().mockResolvedValue(undefined),
    createWebviewPanel: vi.fn(),
  },
  workspace: {
    getConfiguration: () => ({
      get: vi.fn().mockReturnValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
    }),
  },
  ConfigurationTarget: { Global: 1 },
}))

vi.mock('../../src/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('../../src/statusBar', () => ({
  setUpdating: vi.fn(),
  setIdle: vi.fn(),
  setError: vi.fn(),
}))

vi.mock('../../src/state', () => ({
  getSourceState: vi.fn().mockReturnValue({ lastFetchAt: 0, lastContentHash: '', appliedKeys: [] }),
  saveSourceState: vi.fn(),
  isKeyOwnedByAnotherSource: vi.fn().mockReturnValue(false),
}))

import * as statusBar from '../../src/statusBar'
import * as state from '../../src/state'

describe('UpdateOrchestrator', () => {
  const ctx = {} as any

  function makeReader(content: string): ISourceReader {
    return {
      canHandle: vi.fn().mockReturnValue(true),
      read: vi.fn().mockResolvedValue(content),
    }
  }

  function makeSource(overrides: Partial<Source> = {}): Source {
    return {
      name: 'test-source',
      url: 'https://example.com/settings',
      targetKey: 'explorer.fileNesting.patterns',
      enabled: true,
      ...overrides,
    } as Source
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset state mock to return empty state
    vi.mocked(state.getSourceState).mockReturnValue({ lastFetchAt: 0, lastContentHash: '', appliedKeys: [] })
  })

  it('calls setUpdating then setIdle on success', async () => {
    const raw = '```jsonc\n"explorer.fileNesting.patterns": { "*.ts": "*.js" }\n```'
    const orchestrator = new UpdateOrchestrator(
      [makeReader(raw)],
      new ParserRegistry(),
      new MergeStrategyRegistry(),
      ctx,
    )
    await orchestrator.runForSource(makeSource(), false)
    expect(statusBar.setUpdating).toHaveBeenCalledWith('test-source')
    expect(statusBar.setIdle).toHaveBeenCalled()
  })

  it('calls setIdle when no reader can handle source', async () => {
    const noopReader: ISourceReader = {
      canHandle: vi.fn().mockReturnValue(false),
      read: vi.fn(),
    }
    const orchestrator = new UpdateOrchestrator(
      [noopReader],
      new ParserRegistry(),
      new MergeStrategyRegistry(),
      ctx,
    )
    await orchestrator.runForSource(makeSource(), false)
    expect(statusBar.setIdle).toHaveBeenCalled()
    expect(statusBar.setError).not.toHaveBeenCalled()
  })

  it('calls setError when read throws', async () => {
    const errReader: ISourceReader = {
      canHandle: vi.fn().mockReturnValue(true),
      read: vi.fn().mockRejectedValue(new Error('network error')),
    }
    const orchestrator = new UpdateOrchestrator(
      [errReader],
      new ParserRegistry(),
      new MergeStrategyRegistry(),
      ctx,
    )
    await orchestrator.runForSource(makeSource(), false)
    expect(statusBar.setError).toHaveBeenCalled()
  })

  it('skips when hash unchanged (not prompt)', async () => {
    const raw = '```jsonc\n"explorer.fileNesting.patterns": { "*.ts": "*.js" }\n```'
    const hash = Buffer.from(raw).toString('base64').slice(0, 16)
    vi.mocked(state.getSourceState).mockReturnValue({
      lastFetchAt: Date.now(),
      lastContentHash: hash,
      appliedKeys: [],
    })
    const reader = makeReader(raw)
    const orchestrator = new UpdateOrchestrator(
      [reader],
      new ParserRegistry(),
      new MergeStrategyRegistry(),
      ctx,
    )
    await orchestrator.runForSource(makeSource(), false)
    // Should have read but then set idle (skip)
    expect(reader.read).toHaveBeenCalled()
    expect(statusBar.setIdle).toHaveBeenCalled()
  })

  it('does NOT skip hash check when prompt=true', async () => {
    const raw = '```jsonc\n"explorer.fileNesting.patterns": { "*.ts": "*.js" }\n```'
    const hash = Buffer.from(raw).toString('base64').slice(0, 16)
    vi.mocked(state.getSourceState).mockReturnValue({
      lastFetchAt: Date.now(),
      lastContentHash: hash,
      appliedKeys: [],
    })
    const reader = makeReader(raw)
    const orchestrator = new UpdateOrchestrator(
      [reader],
      new ParserRegistry(),
      new MergeStrategyRegistry(),
      ctx,
    )
    // Even with same hash, prompt=true should proceed past the dedup check
    await orchestrator.runForSource(makeSource(), true)
    expect(reader.read).toHaveBeenCalled()
    // Proceeds to apply — setUpdating called
    expect(statusBar.setUpdating).toHaveBeenCalled()
  })

  it('calls setIdle when parsed result is empty', async () => {
    const orchestrator = new UpdateOrchestrator(
      [makeReader('not a valid jsonc block')],
      new ParserRegistry(),
      new MergeStrategyRegistry(),
      ctx,
    )
    await orchestrator.runForSource(makeSource(), false)
    expect(statusBar.setIdle).toHaveBeenCalled()
  })
})
