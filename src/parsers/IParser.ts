import type { ParsedSettings } from '../sources/types'

export interface IParser {
  /** Returns true if this parser can handle the given parserType string */
  canHandle(parserType: string): boolean
  /** Parse raw string content into a settings record */
  parse(content: string): ParsedSettings
}
