import { parse as parseJsonc } from 'jsonc-parser'
import type { IParser } from './IParser'
import type { ParsedSettings } from '../sources/types'

export class JsoncFileParser implements IParser {
  canHandle(parserType: string): boolean {
    return parserType === 'jsonc' || parserType === 'json'
  }

  parse(content: string): ParsedSettings {
    const errors: any[] = []
    const result = parseJsonc(content, errors, { allowTrailingComma: true })
    if (errors.length > 0 || typeof result !== 'object') return {}
    return result as ParsedSettings
  }
}
