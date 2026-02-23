import { createHash } from 'node:crypto'
import { FETCH_TIMEOUT_MS } from '../constants'

export async function fetchRaw(url: string): Promise<string> {
  // ofetch types only expose 'json' for responseType; use native fetch for text
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}
