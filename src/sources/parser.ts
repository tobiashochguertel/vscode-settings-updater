import { stripComments } from 'jsonc-parser'
import type { ParserType, ParsedSettings } from './types'

const JSONC_BLOCK_RE = /```jsonc\n([\s\S]*?)```/

/**
 * Parse raw file content into a settings object.
 */
export function parseContent(raw: string, parser: ParserType): ParsedSettings {
  if (parser === 'jsonc-block') return parseJsoncBlock(raw)
  return parseJsoncFile(raw)
}

function parseJsoncBlock(raw: string): ParsedSettings {
  const match = JSONC_BLOCK_RE.exec(raw)
  if (!match) throw new Error('No ```jsonc block found in file content')
  const block = match[1]
  // Wrap in braces (the upstream block is a settings snippet, not a root object)
  const wrapped = `{${block}}`
  return parseJsoncString(wrapped)
}

function parseJsoncFile(raw: string): ParsedSettings {
  return parseJsoncString(raw)
}

function parseJsoncString(raw: string): ParsedSettings {
  const cleaned = stripComments(raw)
  return JSON.parse(cleaned) as ParsedSettings
}
