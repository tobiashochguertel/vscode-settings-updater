import { parse as parseJsonc } from 'jsonc-parser'
import type { IParser } from './IParser'
import type { ParsedSettings } from '../sources/types'

export class JsoncBlockParser implements IParser {
  canHandle(parserType: string): boolean {
    return parserType === 'jsonc-block'
  }

  parse(content: string): ParsedSettings {
    // Extract the ```jsonc ... ``` block from markdown
    const match = content.match(/```jsonc\n([\s\S]*?)```/)
    if (!match) return {}
    const block = match[1]
    // The block is a settings snippet without outer braces — wrap it
    const wrapped = `{${block}}`
    const errors: any[] = []
    const result = parseJsonc(wrapped, errors, { allowTrailingComma: true })
    if (errors.length > 0 || typeof result !== 'object') return {}
    return result as ParsedSettings
  }
}
