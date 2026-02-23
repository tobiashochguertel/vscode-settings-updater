import type { ISourceReader } from './ISourceReader'
import type { Source } from './types'
import { resolveUrl } from './resolver'
import { fetchRaw } from './fetcher'

export class RemoteSourceReader implements ISourceReader {
  canHandle(source: Source): boolean {
    return !!source.url
  }

  async read(source: Source): Promise<string> {
    const url = resolveUrl(source.url!)
    return fetchRaw(url)
  }
}
