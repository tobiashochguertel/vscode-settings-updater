import type { Source } from './types'

export interface ISourceReader {
  /** Returns true if this reader can handle the given source configuration */
  canHandle(source: Source): boolean
  /** Read raw string content from the source */
  read(source: Source): Promise<string>
}
