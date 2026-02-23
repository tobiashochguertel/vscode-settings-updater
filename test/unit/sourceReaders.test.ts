import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock vscode (needed by LocalFileSourceReader)
vi.mock('vscode', () => ({
  Uri: { file: (p: string) => ({ fsPath: p, scheme: 'file' }) },
  workspace: {
    fs: {
      readFile: vi.fn(),
    },
    workspaceFolders: undefined as any,
  },
}))

// Mock fetcher (needed by RemoteSourceReader)
vi.mock('../../src/sources/fetcher', () => ({
  fetchRaw: vi.fn().mockResolvedValue('raw content'),
}))

// Mock resolver
vi.mock('../../src/sources/resolver', () => ({
  resolveUrl: vi.fn((url: string) => url),
}))

// Mock pathResolver
vi.mock('../../src/sources/pathResolver', () => ({
  resolveFilePath: vi.fn((p: string) => p),
}))

import { RemoteSourceReader } from '../../src/sources/RemoteSourceReader'
import { LocalFileSourceReader } from '../../src/sources/LocalFileSourceReader'
import type { Source } from '../../src/sources/types'
import * as vscode from 'vscode'
import { fetchRaw } from '../../src/sources/fetcher'

function source(overrides: Partial<Source>): Source {
  return { name: 'test', targetKey: 'x', enabled: true, ...overrides } as Source
}

describe('RemoteSourceReader', () => {
  const reader = new RemoteSourceReader()

  it('canHandle: true when url is set', () => {
    expect(reader.canHandle(source({ url: 'https://example.com' }))).toBe(true)
  })

  it('canHandle: false when url is not set', () => {
    expect(reader.canHandle(source({ file: '/path/to/file.jsonc' }))).toBe(false)
  })

  it('read: calls fetchRaw with resolved URL', async () => {
    const result = await reader.read(source({ url: 'https://example.com/file' }))
    expect(fetchRaw).toHaveBeenCalledWith('https://example.com/file')
    expect(result).toBe('raw content')
  })
})

describe('LocalFileSourceReader', () => {
  const reader = new LocalFileSourceReader()

  beforeEach(() => {
    vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(
      new TextEncoder().encode('file content') as any
    )
  })

  it('canHandle: true when file is set and url is not', () => {
    expect(reader.canHandle(source({ file: '/path/to/file.jsonc' }))).toBe(true)
  })

  it('canHandle: false when url is also set', () => {
    expect(reader.canHandle(source({ url: 'https://x.com', file: '/path' }))).toBe(false)
  })

  it('read: decodes file bytes to string', async () => {
    const result = await reader.read(source({ file: '/path/to/settings.jsonc' }))
    expect(result).toBe('file content')
  })
})
