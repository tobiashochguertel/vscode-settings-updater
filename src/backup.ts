import * as fs from 'fs'
import * as path from 'path'
import type { ExtensionContext } from 'vscode'
import { log } from './logger'
import { getBackupLimit } from './config'

/**
 * Thrown by applySource when writes fail and the previous settings.json
 * backup was successfully restored. Orchestrator uses this to show a
 * user-facing "rolled back" notification instead of a generic failure.
 */
export class RollbackPerformedError extends Error {
  constructor(
    public readonly originalMessage: string,
    public readonly backupPath: string,
  ) {
    super(`${originalMessage} — settings.json rolled back to pre-update backup`)
    this.name = 'RollbackPerformedError'
  }
}

/**
 * Resolves the path to VS Code's global settings.json.
 * globalStorageUri is `…/User/globalStorage/<publisher>.<name>/`
 * settings.json lives two levels up at `…/User/settings.json`.
 */
export function resolveSettingsPath(ctx: ExtensionContext): string {
  return path.resolve(ctx.globalStorageUri.fsPath, '..', '..', 'settings.json')
}

/**
 * Returns the backup directory inside the extension's global storage.
 */
function backupDir(ctx: ExtensionContext): string {
  return path.join(ctx.globalStorageUri.fsPath, 'backups')
}

/**
 * Creates a timestamped backup of settings.json before any write.
 *
 * - Keeps at most `settingsUpdater.backupLimit` copies (default 100);
 *   oldest are pruned automatically.
 * - Returns the absolute path of the backup file so callers can roll back
 *   to it on failure, or `null` if the backup was skipped/failed.
 * - Safe to call even if settings.json does not exist yet.
 * - Skips silently when ctx.globalStorageUri is unavailable (unit test stubs).
 */
export async function backupSettingsJson(ctx: ExtensionContext): Promise<string | null> {
  if (!ctx.globalStorageUri?.fsPath) return null

  const settingsPath = resolveSettingsPath(ctx)
  if (!fs.existsSync(settingsPath)) {
    log.info(`[backup] settings.json not found at ${settingsPath} — skipping backup`)
    return null
  }

  const dir = backupDir(ctx)
  fs.mkdirSync(dir, { recursive: true })

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dest = path.join(dir, `settings-${stamp}.json`)

  try {
    fs.copyFileSync(settingsPath, dest)
    log.info(`[backup] Backed up settings.json → ${dest}  (source: ${settingsPath})`)
  } catch (err) {
    log.error(`[backup] Failed to back up ${settingsPath}: ${err}`)
    return null
  }

  pruneOldBackups(dir)
  return dest
}

/**
 * Restores settings.json from a previously created backup file.
 * Called automatically by applySource() when a write fails mid-way.
 */
export async function rollbackSettingsJson(
  ctx: ExtensionContext,
  backupPath: string,
): Promise<void> {
  if (!ctx.globalStorageUri?.fsPath) return

  const settingsPath = resolveSettingsPath(ctx)
  try {
    fs.copyFileSync(backupPath, settingsPath)
    log.info(`[backup] Rolled back settings.json ← ${backupPath}`)
  } catch (err) {
    log.error(`[backup] CRITICAL: Rollback failed — original backup is at ${backupPath}: ${err}`)
    throw err
  }
}

function pruneOldBackups(dir: string): void {
  try {
    const limit = getBackupLimit()
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith('settings-') && f.endsWith('.json'))
      .sort() // ISO timestamps sort chronologically

    const excess = files.length - limit
    if (excess > 0) {
      for (const f of files.slice(0, excess)) {
        fs.unlinkSync(path.join(dir, f))
        log.info(`[backup] Pruned old backup: ${f}`)
      }
    }
  } catch (err) {
    log.error(`[backup] Could not prune backups: ${err}`)
  }
}
