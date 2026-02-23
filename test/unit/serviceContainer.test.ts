import { describe, it, expect, vi } from 'vitest'

vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: () => ({ get: vi.fn().mockReturnValue(undefined) }),
    fs: { readFile: vi.fn() },
    workspaceFolders: undefined,
  },
  Uri: { file: (p: string) => ({ fsPath: p }) },
  window: { showWarningMessage: vi.fn(), showInformationMessage: vi.fn() },
}))

vi.mock('../../src/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('../../src/statusBar', () => ({
  setUpdating: vi.fn(), setIdle: vi.fn(), setError: vi.fn(),
}))

vi.mock('../../src/state', () => ({
  getSourceState: vi.fn().mockReturnValue({ lastFetchAt: 0, lastContentHash: '', appliedKeys: [] }),
  saveSourceState: vi.fn(),
  isKeyOwnedByAnotherSource: vi.fn().mockReturnValue(false),
}))

import { createProductionServices, createTestServices } from '../../src/ServiceContainer'
import { RemoteSourceReader } from '../../src/sources/RemoteSourceReader'
import { LocalFileSourceReader } from '../../src/sources/LocalFileSourceReader'
import { ParserRegistry } from '../../src/parsers/ParserRegistry'
import { MergeStrategyRegistry } from '../../src/strategies/MergeStrategyRegistry'
import { UpdateOrchestrator } from '../../src/UpdateOrchestrator'

const mockCtx = {} as any

describe('createProductionServices', () => {
  it('returns an UpdateOrchestrator instance', () => {
    const { orchestrator } = createProductionServices(mockCtx)
    expect(orchestrator).toBeInstanceOf(UpdateOrchestrator)
  })

  it('includes RemoteSourceReader and LocalFileSourceReader in readers', () => {
    const { readers } = createProductionServices(mockCtx)
    expect(readers.some(r => r instanceof RemoteSourceReader)).toBe(true)
    expect(readers.some(r => r instanceof LocalFileSourceReader)).toBe(true)
  })

  it('parsers is a ParserRegistry', () => {
    const { parsers } = createProductionServices(mockCtx)
    expect(parsers).toBeInstanceOf(ParserRegistry)
  })

  it('mergeStrategies is a MergeStrategyRegistry', () => {
    const { mergeStrategies } = createProductionServices(mockCtx)
    expect(mergeStrategies).toBeInstanceOf(MergeStrategyRegistry)
  })
})

describe('createTestServices', () => {
  it('uses custom reader when provided', () => {
    const mockReader = { canHandle: vi.fn().mockReturnValue(true), read: vi.fn() }
    const { readers } = createTestServices(mockCtx, { readers: [mockReader] })
    expect(readers).toHaveLength(1)
    expect(readers[0]).toBe(mockReader)
  })

  it('uses default readers when no override', () => {
    const { readers } = createTestServices(mockCtx)
    expect(readers.length).toBeGreaterThan(0)
  })

  it('produces an orchestrator that uses the custom reader', async () => {
    const mockReader = {
      canHandle: vi.fn().mockReturnValue(true),
      read: vi.fn().mockResolvedValue('```jsonc\n"x": 1\n```'),
    }
    const { orchestrator } = createTestServices(mockCtx, { readers: [mockReader] })
    await orchestrator.runForSource(
      { name: 'test', url: 'https://x.com', targetKey: 'x', enabled: true } as any,
      false
    )
    expect(mockReader.read).toHaveBeenCalled()
  })
})
