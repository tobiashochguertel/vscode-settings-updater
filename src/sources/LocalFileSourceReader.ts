import * as vscode from 'vscode'
import type { ISourceReader } from './ISourceReader'
import type { Source } from './types'
import { resolveFilePath } from './pathResolver'

export class LocalFileSourceReader implements ISourceReader {
  canHandle(source: Source): boolean {
    return !!source.file && !source.url
  }

  async read(source: Source): Promise<string> {
    const expanded = resolveFilePath(source.file!)
    const uri = vscode.Uri.file(expanded)
    const bytes = await vscode.workspace.fs.readFile(uri)
    return new TextDecoder().decode(bytes)
  }
}
