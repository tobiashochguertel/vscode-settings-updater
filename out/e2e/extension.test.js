"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * E2E tests for vscode-settings-updater extension.
 *
 * These tests run INSIDE the VS Code Extension Development Host — no mocks,
 * no stubs. Every `vscode.*` call is the real VS Code API.
 *
 * Test runner: @vscode/test-cli (vscode-test CLI) via Mocha TDD suite.
 */
const assert = __importStar(require("assert"));
const vscode = __importStar(require("vscode"));
const os = __importStar(require("node:os"));
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const EXT_ID = 'tobiashochguertel.vscode-settings-updater';
async function getExtension() {
    const ext = vscode.extensions.getExtension(EXT_ID);
    assert.ok(ext, `Extension ${EXT_ID} not found in VS Code`);
    return ext;
}
async function activateExtension() {
    const ext = await getExtension();
    if (!ext.isActive) {
        await ext.activate();
    }
    // Small delay for VS Code IPC to propagate command registrations
    await new Promise(resolve => setTimeout(resolve, 500));
    return ext;
}
// ---------------------------------------------------------------------------
// Suite 1: Activation
// ---------------------------------------------------------------------------
suite('Activation', () => {
    suiteSetup(activateExtension);
    test('extension is registered in VS Code', async () => {
        const ext = await getExtension();
        assert.ok(ext, 'Extension not found');
    });
    test('extension activates without error', async () => {
        const ext = await activateExtension();
        assert.strictEqual(ext.isActive, true);
    });
    test('extension exposes package.json with correct publisher', async () => {
        const ext = await getExtension();
        const pkg = ext.packageJSON;
        assert.strictEqual(pkg.publisher, 'tobiashochguertel');
        assert.strictEqual(pkg.name, 'vscode-settings-updater');
        assert.ok(pkg.version.length > 0);
    });
});
// ---------------------------------------------------------------------------
// Suite 2: Command registration
// ---------------------------------------------------------------------------
suite('Command Registration', () => {
    const REQUIRED_COMMANDS = [
        'settingsUpdater.updateAll',
        'settingsUpdater.updateSource',
        'settingsUpdater.disableSource',
        'settingsUpdater.enableSource',
        'settingsUpdater.showLog',
        'settingsUpdater.openConfig',
        'settingsUpdater.showStatus',
    ];
    suiteSetup(activateExtension);
    // Verify commands are DECLARED in package.json (always true after build)
    test('all 7 commands are declared in package.json', () => {
        const ext = vscode.extensions.getExtension(EXT_ID);
        const contributes = ext?.packageJSON?.contributes;
        const declared = contributes?.commands?.map((c) => c.command) ?? [];
        for (const cmd of REQUIRED_COMMANDS) {
            assert.ok(declared.includes(cmd), `Command not declared in package.json: ${cmd}`);
        }
    });
    // Verify commands are REGISTERED by executing them; "command not found" = not registered.
    // Other errors (e.g., no sources, QuickPick) mean the command IS registered and running.
    for (const cmd of REQUIRED_COMMANDS) {
        test(`command "${cmd}" responds (is registered)`, async () => {
            try {
                await vscode.commands.executeCommand(cmd);
                // Succeeded — command is registered
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                // "command '...' not found" means it was never registered
                assert.ok(!msg.includes('not found'), `Command not registered: ${cmd}\n  error: ${msg}`);
                // Any OTHER error means the command IS registered but execution failed
                // (expected in tests — e.g. QuickPick cancelled, no sources, etc.)
            }
        });
    }
});
// ---------------------------------------------------------------------------
// Suite 3: Commands with no sources configured
// ---------------------------------------------------------------------------
suite('Commands — empty configuration', () => {
    suiteSetup(async () => {
        await activateExtension();
        // Ensure no sources are configured
        await vscode.workspace
            .getConfiguration()
            .update('settingsUpdater.sources', [], vscode.ConfigurationTarget.Global);
    });
    test('updateAll does not throw when no sources configured', async () => {
        await assert.doesNotReject(Promise.resolve(vscode.commands.executeCommand('settingsUpdater.updateAll')));
    });
    test('updateSource does not throw when no sources configured', async () => {
        await assert.doesNotReject(Promise.resolve(vscode.commands.executeCommand('settingsUpdater.updateSource')));
    });
    test('disableSource does not throw when no sources configured', async () => {
        await assert.doesNotReject(Promise.resolve(vscode.commands.executeCommand('settingsUpdater.disableSource')));
    });
    test('enableSource does not throw when no disabled sources', async () => {
        await assert.doesNotReject(Promise.resolve(vscode.commands.executeCommand('settingsUpdater.enableSource')));
    });
    test('showLog does not throw (reveals output channel)', async () => {
        await assert.doesNotReject(Promise.resolve(vscode.commands.executeCommand('settingsUpdater.showLog')));
    });
    test('showStatus does not throw (opens WebView panel)', async () => {
        await assert.doesNotReject(Promise.resolve(vscode.commands.executeCommand('settingsUpdater.showStatus')));
    });
    test('openConfig does not throw (opens settings.json)', async () => {
        await assert.doesNotReject(Promise.resolve(vscode.commands.executeCommand('settingsUpdater.openConfig')));
    });
});
// ---------------------------------------------------------------------------
// Suite 4: End-to-end — apply settings from a local JSONC file
// ---------------------------------------------------------------------------
suite('E2E — local JSONC source applies settings', () => {
    let tmpFile;
    // Use editor.wordWrap — a real VS Code setting we can set and verify
    const TARGET_KEY = 'editor.wordWrap';
    const EXPECTED_VALUE = 'on';
    const SOURCE_NAME = 'e2e-local-test';
    suiteSetup(async () => {
        await activateExtension();
        // Write a JSONC file with the setting we want to apply
        tmpFile = path.join(os.tmpdir(), `vscode-su-e2e-${Date.now()}.jsonc`);
        await fs.writeFile(tmpFile, JSON.stringify({ [TARGET_KEY]: EXPECTED_VALUE }, null, 2), 'utf8');
        // Configure the extension to use this local file as a source
        await vscode.workspace.getConfiguration().update('settingsUpdater.sources', [
            {
                name: SOURCE_NAME,
                file: tmpFile,
                parser: 'jsonc',
                targetKey: TARGET_KEY,
                mergeStrategy: 'replace',
                enabled: true,
                updateInterval: 60,
            },
        ], vscode.ConfigurationTarget.Global);
    });
    suiteTeardown(async () => {
        // Remove test source config
        await vscode.workspace
            .getConfiguration()
            .update('settingsUpdater.sources', [], vscode.ConfigurationTarget.Global);
        // Reset the setting we modified
        await vscode.workspace
            .getConfiguration()
            .update(TARGET_KEY, undefined, vscode.ConfigurationTarget.Global);
        // Remove temp file
        try {
            await fs.unlink(tmpFile);
        }
        catch {
            // ignore if already gone
        }
    });
    test('updateAll reads local JSONC file and writes setting to VS Code config', async () => {
        await vscode.commands.executeCommand('settingsUpdater.updateAll');
        // Give the async apply pipeline time to complete
        await new Promise(resolve => setTimeout(resolve, 1500));
        const applied = vscode.workspace.getConfiguration().get(TARGET_KEY);
        assert.strictEqual(applied, EXPECTED_VALUE, `Expected ${TARGET_KEY} to be "${EXPECTED_VALUE}" after updateAll, got "${applied}"`);
    });
    test('after source is disabled, updateAll no longer processes it', async () => {
        // Disable the source
        await vscode.workspace.getConfiguration().update('settingsUpdater.sources', [
            {
                name: SOURCE_NAME,
                file: tmpFile,
                parser: 'jsonc',
                targetKey: TARGET_KEY,
                mergeStrategy: 'replace',
                enabled: false, // disabled
                updateInterval: 60,
            },
        ], vscode.ConfigurationTarget.Global);
        // Manually change the setting to something else
        await vscode.workspace
            .getConfiguration()
            .update(TARGET_KEY, 'off', vscode.ConfigurationTarget.Global);
        await vscode.commands.executeCommand('settingsUpdater.updateAll');
        await new Promise(resolve => setTimeout(resolve, 500));
        // Value should remain 'off' because the source is disabled
        const applied = vscode.workspace.getConfiguration().get(TARGET_KEY);
        assert.strictEqual(applied, 'off', 'Disabled source should not overwrite the setting');
    });
});
//# sourceMappingURL=extension.test.js.map