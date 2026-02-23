import { homedir } from 'node:os'
import * as path from 'node:path'
import * as vscode from 'vscode'

/**
 * Resolve a local file source path per spec §03:
 * 1. ~ → os.homedir()
 * 2. Absolute → as-is
 * 3. Relative + workspace open → first workspace folder root
 * 4. Relative + no workspace → as-is (caller handles file-not-found gracefully)
 */
export function resolveFilePath(rawPath: string): string {
  // Step 1: tilde expansion
  if (rawPath.startsWith('~')) {
    return rawPath.replace(/^~/, homedir())
  }
  // Step 2: absolute path
  if (path.isAbsolute(rawPath)) return rawPath
  // Step 3: relative + workspace
  const folders = vscode.workspace.workspaceFolders
  if (folders && folders.length > 0) {
    return path.join(folders[0].uri.fsPath, rawPath)
  }
  // Step 4: relative, no workspace — return as-is
  return rawPath
}
