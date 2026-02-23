import * as path from 'path'
import * as vscode from 'vscode'
import Mocha from 'mocha'
import { glob } from 'glob'

const EXT_ID = 'tobiashochguertel.vscode-settings-updater'

/**
 * VS Code pre-marks `--extensionDevelopmentPath` extensions as `isActive=true`
 * WITHOUT calling `activate()`. When test code later calls `ext.activate()`,
 * VS Code sees `isActive=true` and returns `exports=undefined` (a no-op).
 *
 * Workaround: directly require the dist bundle and invoke `activate()` ourselves
 * using a stub ExtensionContext, before Mocha runs any tests. This registers
 * commands via the real shared `vscode` module so `executeCommand()` works.
 */
async function forceActivateExtension(): Promise<void> {
  const ext = vscode.extensions.getExtension(EXT_ID)
  if (!ext) {
    process.stderr.write(`[E2E] Extension ${EXT_ID} not found — skipping force-activate\n`)
    return
  }

  // If activate() already ran (ext.exports has our API), nothing to do
  if ((ext.exports as { activated?: true } | undefined)?.activated === true) {
    process.stderr.write('[E2E] Extension already activated\n')
    return
  }

  process.stderr.write('[E2E] Force-activating extension (VS Code dev-ext pre-marking workaround)\n')

  // Directly require the dist bundle (same module cache as VS Code's load)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const extMain = require(path.join(ext.extensionPath, 'dist', 'index')) as {
    activate: (ctx: vscode.ExtensionContext) => Promise<unknown>
  }

  // Minimal stub context — only the properties our activate() actually uses
  const stubMemento = {
    get: <T>(_key: string, defaultValue?: T) => defaultValue,
    update: async (_key: string, _value: unknown) => {},
    setKeysForSync: (_keys: string[]) => {},
    keys: () => [] as string[],
  }
  const ctx = {
    subscriptions: [],
    extensionPath: ext.extensionPath,
    extensionUri: ext.extensionUri,
    extensionMode: vscode.ExtensionMode.Test,
    extension: ext,
    workspaceState: stubMemento,
    globalState: stubMemento,
    secrets: {
      get: async (_key: string) => undefined as string | undefined,
      store: async (_key: string, _value: string) => {},
      delete: async (_key: string) => {},
      onDidChange: new vscode.EventEmitter<vscode.SecretStorageChangeEvent>().event,
    },
    asAbsolutePath: (rel: string) => path.join(ext.extensionPath, rel),
    storageUri: undefined,
    globalStorageUri: vscode.Uri.file(path.join(ext.extensionPath, '.storage')),
    logUri: vscode.Uri.file(path.join(ext.extensionPath, '.log')),
  } as unknown as vscode.ExtensionContext

  try {
    const result = await extMain.activate(ctx)
    process.stderr.write(`[E2E] activate() returned: ${JSON.stringify(result)}\n`)
    // Store the returned API in globalThis so extension.test.ts can access it
    ;(globalThis as Record<string, unknown>)._e2eExtApi = result
  } catch (err) {
    process.stderr.write(`[E2E] activate() threw: ${err}\n`)
  }
}

export async function run(): Promise<void> {
  await forceActivateExtension()

  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: 60000,
  })

  const testsRoot = path.resolve(__dirname, '.')

  return new Promise((resolve, reject) => {
    glob('**/*.test.js', { cwd: testsRoot })
      .then((files) => {
        files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)))
        mocha.run((failures) => {
          if (failures > 0) {
            reject(new Error(`${failures} tests failed.`))
          } else {
            resolve()
          }
        })
      })
      .catch(reject)
  })
}
