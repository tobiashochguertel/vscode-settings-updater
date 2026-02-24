import * as fs from 'fs'
import { parse as parseJsonc, printParseErrorCode } from 'jsonc-parser'
import type { ParseError } from 'jsonc-parser'
import type { ExtensionContext } from 'vscode'
import { log } from './logger'
import { resolveSettingsPath } from './backup'

export interface ValidationResult {
  valid: boolean
  errors: ParseErrorDetail[]
}

export interface ParseErrorDetail {
  code: string
  offset: number
  length: number
  line: number
  column: number
}

function offsetToPosition(content: string, offset: number): { line: number; column: number } {
  const before = content.slice(0, offset)
  const lines = before.split('\n')
  return { line: lines.length, column: lines[lines.length - 1].length + 1 }
}

/**
 * Validates a JSONC file for syntax errors.
 * Returns { valid: true } when the file does not exist (nothing to validate).
 */
export function validateJsoncFile(filePath: string): ValidationResult {
  if (!fs.existsSync(filePath)) return { valid: true, errors: [] }

  const content = fs.readFileSync(filePath, 'utf8')
  const raw: ParseError[] = []
  parseJsonc(content, raw, { allowTrailingComma: true })

  const errors: ParseErrorDetail[] = raw.map((e) => {
    const { line, column } = offsetToPosition(content, e.offset)
    return {
      code: printParseErrorCode(e.error),
      offset: e.offset,
      length: e.length,
      line,
      column,
    }
  })

  if (errors.length > 0) {
    log.error(`[validate] ${filePath} has ${errors.length} JSONC syntax error(s):`)
    for (const e of errors) {
      log.error(
        `[validate]   line ${e.line}:${e.column}  ${e.code}  (offset ${e.offset}, len ${e.length})`,
      )
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validates VS Code's global settings.json.
 * Skips silently (returns valid) when ctx.globalStorageUri is unavailable.
 *
 * Note on comment preservation: VS Code's getConfiguration().update() uses
 * jsonc-parser's modify() + applyEdits() under the hood, which performs
 * minimal textual edits and leaves all comments and formatting intact.
 * Validation here guards against edge-cases where a value itself is
 * structurally invalid or a bug in the extension produces malformed output.
 */
export function validateSettingsJson(ctx: ExtensionContext): ValidationResult {
  if (!ctx.globalStorageUri?.fsPath) return { valid: true, errors: [] }
  const filePath = resolveSettingsPath(ctx)
  return validateJsoncFile(filePath)
}
