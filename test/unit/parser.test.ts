import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseContent } from '../../src/sources/parser'

const fixturesDir = resolve(__dirname, '../../fixtures')

describe('parseContent - jsonc-block', () => {
  it('extracts jsonc block from markdown', () => {
    const raw = readFileSync(resolve(fixturesDir, 'file-nesting-readme.md'), 'utf8')
    const result = parseContent(raw, 'jsonc-block')
    expect(result).toHaveProperty('explorer.fileNesting.patterns')
    expect((result['explorer.fileNesting.patterns'] as any)['*.ts']).toBe('$(capture).js')
  })
  it('throws if no jsonc block found', () => {
    expect(() => parseContent('# No jsonc here', 'jsonc-block')).toThrow()
  })
})

describe('parseContent - jsonc-file', () => {
  it('parses a jsonc file directly', () => {
    const raw = readFileSync(resolve(fixturesDir, 'settings-overlay.jsonc'), 'utf8')
    const result = parseContent(raw, 'jsonc-file')
    expect(result).toHaveProperty('explorer.fileNesting.patterns')
    expect(result['editor.fontSize']).toBe(14)
  })
})
