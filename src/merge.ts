import type { MergeStrategy } from './sources/types'

export function applyMerge(
  existing: unknown,
  incoming: unknown,
  strategy: MergeStrategy,
): unknown {
  switch (strategy) {
    case 'replace':
      return incoming
    case 'merge-shallow':
      return mergeShallow(existing, incoming)
    case 'merge-deep':
      return mergeDeep(existing, incoming)
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function mergeShallow(existing: unknown, incoming: unknown): unknown {
  if (!isPlainObject(existing) || !isPlainObject(incoming)) return incoming
  return { ...existing, ...incoming }
}

function mergeDeep(existing: unknown, incoming: unknown): unknown {
  if (Array.isArray(existing) && Array.isArray(incoming)) {
    return [...existing, ...incoming]
  }
  if (!isPlainObject(existing) || !isPlainObject(incoming)) return incoming
  const result: Record<string, unknown> = { ...existing }
  for (const [key, value] of Object.entries(incoming)) {
    result[key] = mergeDeep(existing[key], value)
  }
  return result
}
