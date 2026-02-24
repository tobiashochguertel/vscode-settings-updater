import * as fs from 'fs'
import * as path from 'path'
import type { ExtensionContext } from 'vscode'
import { log } from './logger'

const MAX_BACKUPS = 10

/**
 * Resolves the path to VS Code's global settings.json.
 * globalStorageUri is `…/User/globalStorage/<publisher>.<name>/`
 * settings.json lives two levels up at `…/User/settings.json`.
 */
function resolveSettingsPath(ctx: ExtensionContext): string {
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
 * Keeps at most MAX_BACKUPS copies; oldest are pruned automatically.
 * Safe to call even if settings.json doesn't exist yet.
 */
export async function backupSettingsJson(ctx: ExtensionContext): Promise<void> {
  // ctx.globalStorageUri may be absent in test stubs — skip backup silently
  if (!ctx.globalStorageUri?.fsPath) return

  const settingsPath = resolveSettingsPath(ctx)
  if (!fs.existsSync(settingsPath)) return

  const dir = backupDir(ctx)
  fs.mkdirSync(dir, { recursive: true })

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dest = path.join(dir, `settings-${stamp}.json`)

  try {
    fs.copyFileSync(settingsPath, dest)
    log.info(`[backup] settings.json → ${dest}`)
  } catch (err) {
    log.error(`[backup] Could not back up settings.json: ${err}`)
    return
  }

  pruneOldBackups(dir)
}

function pruneOldBackups(dir: string): void {
  try {
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith('settings-') && f.endsWith('.json'))
      .sort() // ISO timestamps sort chronologically

    const excess = files.length - MAX_BACKUPS
    if (excess > 0) {
      for (const f of files.slice(0, excess)) {
        fs.unlinkSync(path.join(dir, f))
        log.info(`[backup] pruned old backup: ${f}`)
      }
    }
  } catch (err) {
    log.error(`[backup] Could not prune backups: ${err}`)
  }
}
