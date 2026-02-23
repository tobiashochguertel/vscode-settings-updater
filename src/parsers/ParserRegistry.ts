import type { IParser } from './IParser'
import type { ParsedSettings } from '../sources/types'
import { JsoncBlockParser } from './JsoncBlockParser'
import { JsoncFileParser } from './JsoncFileParser'

export class ParserRegistry {
  private readonly parsers: IParser[]

  constructor(parsers: IParser[] = [new JsoncBlockParser(), new JsoncFileParser()]) {
    this.parsers = parsers
  }

  parse(content: string, parserType: string): ParsedSettings {
    const parser = this.parsers.find(p => p.canHandle(parserType))
    if (!parser) {
      // Fallback to jsonc-block for unknown types
      return new JsoncBlockParser().parse(content)
    }
    return parser.parse(content)
  }
}
