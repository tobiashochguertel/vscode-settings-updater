import * as vscode from 'vscode'
import type { ExtensionContext } from 'vscode'
import type { Source } from './sources/types'
import type { ISourceReader } from './sources/ISourceReader'
import { ParserRegistry } from './parsers/ParserRegistry'
import { MergeStrategyRegistry } from './strategies/MergeStrategyRegistry'
import { applySource, countChanges } from './apply'
import { getSourceState, saveSourceState } from './state'
import { getDefaultParser } from './config'
import { hashContent } from './sources/fetcher'
import { log } from './logger'
import { setUpdating, setIdle, setError } from './statusBar'
import { RollbackPerformedError } from './backup'

export class UpdateOrchestrator {
  constructor(
    private readonly readers: ISourceReader[],
    private readonly parsers: ParserRegistry,
    private readonly mergeStrategies: MergeStrategyRegistry,
    private readonly ctx: ExtensionContext,
  ) {}

  async runForSource(source: Source, prompt: boolean): Promise<void> {
    try {
      setUpdating(source.name)

      // 1. Find reader
      const reader = this.readers.find((r) => r.canHandle(source))
      if (!reader) {
        log.warn(`[${source.name}] Source has neither url nor file — skipping`)
        setIdle()
        return
      }

      // 2. Read raw content
      let raw: string
      try {
        raw = await reader.read(source)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        log.error(`[${source.name}] Error: ${msg}`)
        setError(msg)
        vscode.window.showWarningMessage(`[Settings Updater] "${source.name}" failed: ${msg}`)
        return
      }

      // 3. Deduplicate by content hash (URL sources only — preserve existing behavior)
      const contentHash = hashContent(raw)
      if (source.url) {
        const state = getSourceState(this.ctx, source.name)
        if (contentHash === state.lastContentHash) {
          log.info(`[${source.name}] No change detected, skipping`)
          saveSourceState(this.ctx, source.name, { ...state, lastFetchAt: Date.now() })
          setIdle()
          return
        }
      }

      // 4. Parse
      const parserType = source.parser ?? getDefaultParser()
      const parsed = this.parsers.parse(raw, parserType)

      // 5. Count changes
      const changeCount = countChanges(this.ctx, source, parsed)
      if (changeCount === 0) {
        log.info(`[${source.name}] Settings already up-to-date`)
        setIdle()
        return
      }

      // 6. Prompt if needed
      if (prompt) {
        const action = await vscode.window.showInformationMessage(
          `[Settings Updater] "${source.name}": ${changeCount} setting${changeCount !== 1 ? 's' : ''} will change.`,
          'Update',
          'Skip this time',
        )
        if (action !== 'Update') {
          log.info(`[${source.name}] User skipped update`)
          setIdle()
          return
        }
      }

      // 7. Apply
      const result = await applySource(this.ctx, source, parsed, contentHash)
      log.info(
        `[${source.name}] Applied: ${result.keysWritten.length} written, ${result.keysRemoved.length} removed`,
      )
      setIdle()
      vscode.window.showInformationMessage(
        `[Settings Updater] "${source.name}" updated successfully.`,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      if (e instanceof RollbackPerformedError) {
        log.error(
          `[${source.name}] Update failed — settings.json automatically rolled back: ${e.originalMessage}`,
        )
        log.info(`[${source.name}] Restored from: ${e.backupPath}`)
        vscode.window
          .showWarningMessage(
            `[Settings Updater] "${source.name}" update failed — settings.json has been automatically rolled back.`,
            'Show Log',
          )
          .then((choice) => {
            if (choice === 'Show Log') log.show()
          })
      } else {
        const msg = e instanceof Error ? e.message : String(e)
        log.error(`[${source.name}] Error: ${msg}`)
        vscode.window.showWarningMessage(`[Settings Updater] "${source.name}" failed: ${msg}`)
      }
    }
  }
}
