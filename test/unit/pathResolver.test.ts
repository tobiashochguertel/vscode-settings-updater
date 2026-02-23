import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as os from 'node:os'
import * as path from 'node:path'

vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: undefined as any,
  },
}))

import { resolveFilePath } from '../../src/sources/pathResolver'
import * as vscode from 'vscode'

describe('resolveFilePath', () => {
  it('expands ~ to homedir', () => {
    const result = resolveFilePath('~/foo/bar.jsonc')
    expect(result).toBe(path.join(os.homedir(), 'foo/bar.jsonc'))
  })

  it('returns absolute paths as-is', () => {
    const abs = '/absolute/path.jsonc'
    expect(resolveFilePath(abs)).toBe(abs)
  })

  it('resolves relative paths against workspace root when workspace is open', () => {
    vi.mocked(vscode.workspace).workspaceFolders = [
      { uri: { fsPath: '/workspace/root' } } as any
    ]
    expect(resolveFilePath('config/settings.jsonc')).toBe(
      path.join('/workspace/root', 'config/settings.jsonc')
    )
    vi.mocked(vscode.workspace).workspaceFolders = undefined as any
  })

  it('returns relative path as-is when no workspace open', () => {
    vi.mocked(vscode.workspace).workspaceFolders = undefined as any
    expect(resolveFilePath('config/settings.jsonc')).toBe('config/settings.jsonc')
  })
})
