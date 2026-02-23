import { $fetch } from 'ofetch'
import { FETCH_TIMEOUT_MS } from '../constants'
import { createHash } from 'node:crypto'

export async function fetchRaw(url: string): Promise<string> {
  const raw = await $fetch<string>(url, {
    responseType: 'text',
    timeout: FETCH_TIMEOUT_MS,
  })
  return raw
}

export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}
