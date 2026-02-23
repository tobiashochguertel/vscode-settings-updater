import { describe, it, expect } from 'vitest'
import { JsoncBlockParser } from '../../src/parsers/JsoncBlockParser'
import { JsoncFileParser } from '../../src/parsers/JsoncFileParser'
import { ParserRegistry } from '../../src/parsers/ParserRegistry'

describe('JsoncBlockParser', () => {
  const parser = new JsoncBlockParser()

  it('canHandle: true for jsonc-block', () => {
    expect(parser.canHandle('jsonc-block')).toBe(true)
  })

  it('canHandle: false for jsonc-file', () => {
    expect(parser.canHandle('jsonc-file')).toBe(false)
  })

  it('extracts settings from markdown jsonc block', () => {
    const md = '# Title\n\n```jsonc\n"editor.fontSize": 16\n```\n\nSome text'
    const result = parser.parse(md)
    expect(result['editor.fontSize']).toBe(16)
  })

  it('returns empty object when no jsonc block present', () => {
    expect(parser.parse('# No code block here')).toEqual({})
  })

  it('returns empty object for malformed jsonc in block', () => {
    const md = '```jsonc\nnot: valid: json:\n```'
    expect(parser.parse(md)).toEqual({})
  })

  it('handles trailing commas in jsonc block', () => {
    const md = '```jsonc\n"key": "value",\n```'
    const result = parser.parse(md)
    expect(result['key']).toBe('value')
  })
})

describe('JsoncFileParser', () => {
  const parser = new JsoncFileParser()

  it('canHandle: true for jsonc', () => {
    expect(parser.canHandle('jsonc')).toBe(true)
  })

  it('canHandle: true for json', () => {
    expect(parser.canHandle('json')).toBe(true)
  })

  it('canHandle: false for jsonc-block', () => {
    expect(parser.canHandle('jsonc-block')).toBe(false)
  })

  it('parses valid jsonc', () => {
    const content = '{ "editor.fontSize": 14, "editor.tabSize": 2 }'
    const result = parser.parse(content)
    expect(result['editor.fontSize']).toBe(14)
    expect(result['editor.tabSize']).toBe(2)
  })

  it('handles trailing commas in jsonc', () => {
    const result = parser.parse('{ "key": "val", }')
    expect(result['key']).toBe('val')
  })

  it('returns empty object for invalid content', () => {
    expect(parser.parse('not json at all }{{')).toEqual({})
  })
})

describe('ParserRegistry', () => {
  it('dispatches to JsoncBlockParser for jsonc-block', () => {
    const registry = new ParserRegistry()
    const md = '```jsonc\n"editor.fontSize": 20\n```'
    const result = registry.parse(md, 'jsonc-block')
    expect(result['editor.fontSize']).toBe(20)
  })

  it('dispatches to JsoncFileParser for jsonc', () => {
    const registry = new ParserRegistry()
    const result = registry.parse('{ "x": 1 }', 'jsonc')
    expect(result['x']).toBe(1)
  })

  it('falls back to JsoncBlockParser for unknown parser type', () => {
    const registry = new ParserRegistry()
    // unknown type → fallback produces {} since no block in content
    const result = registry.parse('plain text no block', 'unknown-type')
    expect(result).toEqual({})
  })

  it('accepts custom parsers via constructor injection', () => {
    const customParser = {
      canHandle: (t: string) => t === 'custom',
      parse: (_: string) => ({ 'custom.key': true }),
    }
    const registry = new ParserRegistry([customParser])
    expect(registry.parse('anything', 'custom')).toEqual({ 'custom.key': true })
  })
})
