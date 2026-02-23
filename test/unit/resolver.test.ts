import { describe, it, expect, vi } from 'vitest'
import { resolveUrl } from '../../src/sources/resolver'

// Mock config module
vi.mock('../../src/config', () => ({
  getGiteaBaseUrl: () => 'https://mygitea.example.com',
}))

describe('resolveUrl', () => {
  it('passes through full https URLs', () => {
    expect(resolveUrl('https://example.com/file.md')).toBe('https://example.com/file.md')
  })
  it('resolves github shorthand', () => {
    expect(resolveUrl('github:antfu/vscode-file-nesting-config@main/README.md'))
      .toBe('https://raw.githubusercontent.com/antfu/vscode-file-nesting-config/main/README.md')
  })
  it('resolves codeberg shorthand', () => {
    expect(resolveUrl('codeberg:user/repo@main/settings.jsonc'))
      .toBe('https://codeberg.org/user/repo/raw/branch/main/settings.jsonc')
  })
  it('resolves gitlab shorthand', () => {
    expect(resolveUrl('gitlab:user/repo@main/file.jsonc'))
      .toBe('https://gitlab.com/user/repo/-/raw/main/file.jsonc')
  })
  it('resolves gitea shorthand', () => {
    expect(resolveUrl('gitea:user/repo@main/file.jsonc'))
      .toBe('https://mygitea.example.com/user/repo/raw/branch/main/file.jsonc')
  })
  it('throws on unknown host', () => {
    expect(() => resolveUrl('bitbucket:user/repo@main/file')).toThrow()
  })
})
