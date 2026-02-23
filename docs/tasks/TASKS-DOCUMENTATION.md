# VS Code Settings Updater — Tasks Documentation

**Created:** 2026-02-23
**Updated:** 2026-02-23
**Status:** In Progress

> Tracks remaining Phase 3 tasks for `tobiashochguertel/vscode-settings-updater`.
> Phase 1 (core scaffold) and Phase 2 (full feature set) are fully implemented and committed.
> This document covers Phase 3 polish, missing test coverage, and documentation.

---

## Generation Strategy

**Estimated Tasks:** ~10 tasks (2 Fixes, 4 Features, 2 Improvements, 2 Documentation)
**Chosen Strategy:** Single document, full detail (< 20 tasks)

---

## Quick Status Overview

| Category      | Total | Done | In Progress | TODO | Paused |
|---------------|-------|------|-------------|------|--------|
| Fixes         | 2     | 0    | 0           | 2    | 0      |
| Features      | 4     | 0    | 0           | 4    | 0      |
| Improvements  | 2     | 0    | 0           | 2    | 0      |
| Documentation | 2     | 0    | 0           | 2    | 0      |
| **TOTAL**     | **10**| **0**| **0**       | **10**| **0** |

---

## Table of Contents

- [Task Sets](#task-sets)
- [Fixes](#fixes)
- [Features](#features)
- [Improvements](#improvements)
- [Documentation](#documentation)
- [Task Summary](#task-summary)
- [Testing Notes](#testing-notes)
- [Implementation Notes](#implementation-notes)

---

## Task Sets

### Set 1: Developer Experience

**Priority:** High
**Description:** Missing tooling that every extension developer needs: a debug launch config, Taskfile polish, and unit tests for the state module (which is in the implementation plan but not yet created).

| Order | Task ID | Title                                          | Status  |
|-------|---------|------------------------------------------------|---------|
| 1     | T001    | Add `.vscode/launch.json` (Extension Host)     | 🔲 TODO |
| 2     | T002    | Add `state.test.ts` unit tests                 | 🔲 TODO |
| 3     | I002    | Add `debug` and `publish` tasks to Taskfile.yml| 🔲 TODO |

**Dependencies:** None

---

### Set 2: Command Polish

**Priority:** Medium
**Description:** Two commands have gaps vs. the software specification. `openConfig` needs to scroll to the `settingsUpdater` section. `showStatus` can optionally be upgraded to a WebView panel for richer output.

| Order | Task ID | Title                                          | Status  |
|-------|---------|------------------------------------------------|---------|
| 1     | F002    | `openConfig`: scroll to `settingsUpdater`      | 🔲 TODO |
| 2     | I001    | `showStatus`: upgrade to WebView panel         | 🔲 TODO |

**Dependencies:** None

---

### Set 3: Test Coverage

**Priority:** Medium
**Description:** Integration tests are listed in the implementation plan but not yet set up. Unit tests for the state module are also missing. Together these bring test coverage to production quality.

| Order | Task ID | Title                                          | Status  |
|-------|---------|------------------------------------------------|---------|
| 1     | F001    | Fix dead `pattern` variable in `localWatcher.ts`| 🔲 TODO |
| 2     | T002    | Add `state.test.ts` unit tests                 | 🔲 TODO |
| 3     | T003    | Scaffold integration tests (`test/integration/`)| 🔲 TODO |

**Dependencies:** None

---

### Set 4: Marketplace Readiness

**Priority:** Low
**Description:** Tasks required before publishing to the VS Code Marketplace: extension icon, gallery banner, and completed user-facing documentation.

| Order | Task ID | Title                                          | Status  |
|-------|---------|------------------------------------------------|---------|
| 1     | D001    | Complete end-user README.md                    | 🔲 TODO |
| 2     | D002    | Add CHANGELOG.md (initial v0.1.0 entry)        | 🔲 TODO |
| 3     | T004    | VS Code Marketplace assets (icon, galleryBanner)| 🔲 TODO |

**Dependencies:** D001 → T004 (README must be complete before publishing)

---

## Fixes

### F001 — Fix dead `pattern` variable in `localWatcher.ts`

**Status:** 🔲 TODO
**Priority:** 🔴 Low

**Description:**
In `src/sources/localWatcher.ts`, a `RelativePattern` is constructed and assigned to `pattern` but never used. The `createFileSystemWatcher` call correctly uses the `expanded` absolute path string directly. The dead variable adds noise and may confuse future maintainers.

**Current Behavior:**
```typescript
// pattern is created but never passed to createFileSystemWatcher
const pattern = new vscode.RelativePattern(vscode.Uri.file(expanded), '*')
const watcher = vscode.workspace.createFileSystemWatcher(expanded, ...)
```

**Expected Behavior:**
```typescript
// pattern variable removed; watcher uses expanded path string directly
const watcher = vscode.workspace.createFileSystemWatcher(expanded, ...)
```

**Implementation:**
- Remove the `pattern` variable and `RelativePattern` construction (3 lines)
- Confirm ESLint `no-unused-vars` would have caught this — add to CI notes

**Acceptance Criteria:**
- [ ] `pattern` variable and `RelativePattern` import usage removed
- [ ] `pnpm build` succeeds
- [ ] `pnpm lint` passes with no warnings

**Testing:**
- [ ] `pnpm build` and `pnpm lint` pass after change

**Dependencies:** None

---

### F002 — `openConfig`: scroll to `settingsUpdater` section

**Status:** 🔲 TODO
**Priority:** 🟡 Medium

**Description:**
The `settingsUpdater.openConfig` command currently executes `workbench.action.openSettingsJson`, which opens `settings.json` at the top of the file. The specification requires the command to scroll to the `settingsUpdater` section so the user can see their configuration immediately.

**Current Behavior:**
```typescript
vscode.commands.executeCommand('workbench.action.openSettingsJson')
// Opens settings.json but cursor is at line 1
```

**Expected Behavior:**
Opens `settings.json` and reveals the first occurrence of `"settingsUpdater` so the relevant section is visible in the editor.

**Implementation:**

```typescript
vscode.commands.registerCommand('settingsUpdater.openConfig', async () => {
  // Open global settings.json
  const uri = vscode.Uri.file(
    path.join(
      process.env.APPDATA ?? process.env.HOME ?? '',
      ...(process.platform === 'win32'
        ? ['Code', 'User', 'settings.json']
        : process.platform === 'darwin'
        ? ['Library', 'Application Support', 'Code', 'User', 'settings.json']
        : ['.config', 'Code', 'User', 'settings.json']),
    ),
  )
  // Use VS Code built-in command which handles cross-platform settings.json path
  await vscode.commands.executeCommand('workbench.action.openSettingsJson')

  // After the document opens, find and reveal the settingsUpdater section
  const editor = vscode.window.activeTextEditor
  if (!editor) return

  const text = editor.document.getText()
  const idx = text.indexOf('"settingsUpdater')
  if (idx === -1) return  // user hasn't configured anything yet

  const pos = editor.document.positionAt(idx)
  editor.selection = new vscode.Selection(pos, pos)
  editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter)
})
```

**Note:** The `workbench.action.openSettingsJson` command opens the global settings.json and gives back the active editor. The reveal step runs immediately after, but there may be a timing issue — if the document wasn't already open, the editor reference needs a small delay or event handling.

**Acceptance Criteria:**
- [ ] Running `Settings Updater: Open extension configuration` opens `settings.json`
- [ ] Editor scrolls to first `"settingsUpdater` occurrence (if it exists)
- [ ] If no `settingsUpdater` section exists, opens at top without error
- [ ] Works on Linux, macOS, and Windows

**Testing:**
- [ ] Manual test: configure a source, run command → cursor jumps to `settingsUpdater`
- [ ] Manual test: no sources configured → opens `settings.json` at top without error

**Dependencies:** None

---

## Features

### T001 — Add `.vscode/launch.json` (Extension Host debug config)

**Status:** 🔲 TODO
**Priority:** 🟢 High

**Description:**
The implementation plan lists `.vscode/launch.json` in the repository structure, but it was never created. Without it, developers cloning the repo cannot press F5 to debug the extension in a VS Code Extension Host. This is standard scaffolding for VS Code extension development.

**Implementation:**

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}"
      ],
      "outFiles": [
        "${workspaceFolder}/dist/**/*.js"
      ],
      "preLaunchTask": "${defaultBuildTask}"
    },
    {
      "name": "Extension Tests",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}",
        "--extensionTestsPath=${workspaceFolder}/dist/test/integration"
      ],
      "outFiles": [
        "${workspaceFolder}/dist/**/*.js"
      ],
      "preLaunchTask": "${defaultBuildTask}"
    }
  ]
}
```

Also create `.vscode/tasks.json` for the pre-launch build task:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "npm",
      "script": "build",
      "group": {
        "kind": "build",
        "isDefault": true
      },
      "problemMatcher": ["$esbuild-watch"],
      "label": "npm: build"
    }
  ]
}
```

**Acceptance Criteria:**
- [ ] `.vscode/launch.json` exists with "Run Extension" configuration
- [ ] F5 in VS Code launches the extension in a new Extension Development Host window
- [ ] Extension activates in the Extension Development Host
- [ ] `.vscode/tasks.json` triggers `pnpm build` before launch

**Testing:**
- [ ] Clone repo, open in VS Code, press F5 → Extension Development Host opens
- [ ] Extension activates (check Output > Settings Updater channel)

**Dependencies:** None

---

### T002 — Add `state.test.ts` unit tests

**Status:** 🔲 TODO
**Priority:** 🟢 High

**Description:**
The implementation plan specifies `test/unit/state.test.ts` as part of the test suite, covering state serialization. It was not created in Phase 1. The `state.ts` module manages `SourceState` persistence in `ExtensionContext.globalState` and the `isKeyOwnedByAnotherSource` safety check — both are critical to the extension's correctness and need unit test coverage.

**Implementation:**

Create `test/unit/state.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { getSourceState, saveSourceState, isKeyOwnedByAnotherSource } from '../../src/state'
import { defaultSourceState } from '../../src/sources/types'

// Mock ExtensionContext.globalState
function makeMockContext() {
  const store: Record<string, unknown> = {}
  return {
    globalState: {
      get: <T>(key: string, def?: T) => (store[key] as T) ?? def,
      update: (key: string, value: unknown) => { store[key] = value },
    },
  } as any
}

describe('state', () => {
  it('returns defaultSourceState for unknown source', () => {
    const ctx = makeMockContext()
    const state = getSourceState(ctx, 'unknown')
    expect(state).toEqual(defaultSourceState())
  })

  it('saves and retrieves SourceState', () => {
    const ctx = makeMockContext()
    const s = { lastFetchAt: 1000, lastContentHash: 'abc', appliedKeys: ['key1'] }
    saveSourceState(ctx, 'src', s)
    expect(getSourceState(ctx, 'src')).toEqual(s)
  })

  it('does not mix up states between sources', () => {
    const ctx = makeMockContext()
    saveSourceState(ctx, 'a', { ...defaultSourceState(), appliedKeys: ['x'] })
    saveSourceState(ctx, 'b', { ...defaultSourceState(), appliedKeys: ['y'] })
    expect(getSourceState(ctx, 'a').appliedKeys).toEqual(['x'])
    expect(getSourceState(ctx, 'b').appliedKeys).toEqual(['y'])
  })

  describe('isKeyOwnedByAnotherSource', () => {
    it('returns false when no other source owns the key', () => {
      const ctx = makeMockContext()
      saveSourceState(ctx, 'a', { ...defaultSourceState(), appliedKeys: ['foo'] })
      expect(isKeyOwnedByAnotherSource(ctx, 'foo', 'a')).toBe(false)
    })

    it('returns true when another source owns the key', () => {
      const ctx = makeMockContext()
      saveSourceState(ctx, 'a', { ...defaultSourceState(), appliedKeys: ['foo'] })
      saveSourceState(ctx, 'b', { ...defaultSourceState(), appliedKeys: ['foo'] })
      expect(isKeyOwnedByAnotherSource(ctx, 'foo', 'a')).toBe(true)
    })

    it('excludes the named source itself from the check', () => {
      const ctx = makeMockContext()
      saveSourceState(ctx, 'only', { ...defaultSourceState(), appliedKeys: ['bar'] })
      expect(isKeyOwnedByAnotherSource(ctx, 'bar', 'only')).toBe(false)
    })
  })
})
```

**Acceptance Criteria:**
- [ ] `test/unit/state.test.ts` created with tests covering `getSourceState`, `saveSourceState`, `isKeyOwnedByAnotherSource`
- [ ] All new tests pass: `pnpm test`
- [ ] Total passing tests increases (currently 14 → should reach ≥ 20)

**Testing:**
- [ ] `pnpm test` passes all tests
- [ ] Test coverage includes all three exported functions from `state.ts`

**Dependencies:** None

---

### T003 — Scaffold integration tests (`test/integration/`)

**Status:** 🔲 TODO
**Priority:** 🟡 Medium

**Description:**
The implementation plan includes `test/integration/` (optional, Phase 2). Integration tests for VS Code extensions require `@vscode/test-electron` which launches a real VS Code instance. This task scaffolds the framework and writes at least one smoke test to verify the extension activates.

**Implementation:**

1. Install dev dependency:
   ```bash
   pnpm add -D @vscode/test-electron @vscode/test-cli
   ```

2. Create `test/integration/index.ts` (test runner entry point):
   ```typescript
   import { run } from '@vscode/test-electron'
   import path from 'node:path'

   async function main() {
     const extensionDevelopmentPath = path.resolve(__dirname, '../../')
     const extensionTestsPath = path.resolve(__dirname, './suite')
     await run({ extensionDevelopmentPath, extensionTestsPath })
   }

   main().catch(console.error)
   ```

3. Create `test/integration/suite/index.ts`:
   ```typescript
   import * as vscode from 'vscode'

   suite('Extension Integration Tests', () => {
     test('Extension activates', async () => {
       const ext = vscode.extensions.getExtension('tobiashochguertel.vscode-settings-updater')
       assert(ext, 'Extension not found')
       await ext.activate()
       assert(ext.isActive, 'Extension did not activate')
     })

     test('All commands are registered', async () => {
       const commands = await vscode.commands.getCommands(true)
       const expected = [
         'settingsUpdater.updateAll', 'settingsUpdater.updateSource',
         'settingsUpdater.disableSource', 'settingsUpdater.enableSource',
         'settingsUpdater.showLog', 'settingsUpdater.openConfig',
         'settingsUpdater.showStatus',
       ]
       for (const cmd of expected) {
         assert(commands.includes(cmd), `Command not registered: ${cmd}`)
       }
     })
   })
   ```

4. Add `test:integration` script to `package.json`:
   ```json
   "test:integration": "node dist/test/integration/index.js"
   ```

5. Add integration test job to `ci.yml`.

**Acceptance Criteria:**
- [ ] `test/integration/` directory created with runner + smoke test suite
- [ ] `pnpm test:integration` runs without error in CI
- [ ] Smoke test verifies extension activates and all 7 commands are registered
- [ ] `ci.yml` updated to run integration tests on Ubuntu runner

**Testing:**
- [ ] `pnpm test` (unit) still passes
- [ ] `pnpm test:integration` smoke test passes in CI

**Dependencies:** T001 (`.vscode/launch.json` informs integration test structure)

---

### T004 — VS Code Marketplace assets (icon, galleryBanner)

**Status:** 🔲 TODO
**Priority:** 🔴 Low

**Description:**
Before publishing to the VS Code Marketplace, the extension needs a 128×128 PNG icon and optional gallery banner. These are configured in `package.json`. Without an icon, the Marketplace listing looks unprofessional and the extension may not pass Marketplace review guidelines.

**Implementation:**

1. Create `assets/` directory in the repository root.

2. Create a 128×128 PNG icon (`assets/icon.png`).
   - Simple design: settings gear icon + sync arrows, blue tones
   - Tools: any image editor, or generate with a script using `sharp` or `canvas`

3. Update `package.json`:
   ```json
   {
     "icon": "assets/icon.png",
     "galleryBanner": {
       "color": "#1e1e2e",
       "theme": "dark"
     },
     "keywords": ["settings", "sync", "updater", "jsonc", "file-nesting", "configuration"],
     "categories": ["Other"],
     "badges": []
   }
   ```

4. Verify `.vsixignore` (or `.vscode/.vsixignore`) excludes `docs/`, `test/`, `fixtures/` from the packaged extension.

**Acceptance Criteria:**
- [ ] `assets/icon.png` exists as a 128×128 PNG
- [ ] `package.json` has `"icon"`, `"galleryBanner"`, and `"keywords"` fields
- [ ] `pnpm package` produces a valid `.vsix` with the icon embedded
- [ ] `vsce ls` shows the icon file in the package manifest

**Testing:**
- [ ] `pnpm package` succeeds
- [ ] Install `.vsix` locally (`code --install-extension *.vsix`) → icon appears in Extensions sidebar

**Dependencies:** D001 (README must be complete before marketplace submission)

---

## Improvements

### I001 — `showStatus`: upgrade to WebView panel

**Status:** 🔲 TODO
**Priority:** 🔴 Low

**Description:**
The specification describes `showStatus` as opening a "VS Code **WebView panel** (or Quick Pick information list)". The Phase 2 implementation chose the Quick Pick approach, which is acceptable per spec. This improvement upgrades it to the richer WebView panel described in the spec's table format, showing last-checked timestamps, key counts, and error states in a persistent panel.

**Current State:**
`settingsUpdater.showStatus` shows a Quick Pick list that closes on selection. It provides the required information but cannot show a persistent view or formatted table.

**Proposed Changes:**
Replace the QuickPick with a `vscode.WebviewPanel` that renders an HTML table showing:
- Source name, enabled/disabled status, last checked, last changed, keys managed
- Error state for failed sources (highlighted in red/yellow)
- Auto-refresh on command re-run

**Benefits:**
- Persistent panel (doesn't close on click)
- Richer formatting (HTML table, icons, colors)
- Better UX for users with many sources

**Trade-offs:**
- More code to maintain (WebView HTML/CSS)
- Content Security Policy (CSP) must be set correctly
- No input needed, so QuickPick is "good enough" per spec

**Implementation:**

```typescript
// In commands.ts — replace showStatus QuickPick with WebView
vscode.commands.registerCommand('settingsUpdater.showStatus', async () => {
  const panel = vscode.window.createWebviewPanel(
    'settingsUpdaterStatus',
    'Settings Updater: Source Status',
    vscode.ViewColumn.One,
    { enableScripts: false },
  )
  panel.webview.html = renderStatusHtml(ctx)
})

function renderStatusHtml(ctx: ExtensionContext): string {
  const sources = getConfig<Source[]>(`${CONFIG_NAMESPACE}.sources`) ?? []
  const rows = sources.map(s => {
    const state = getSourceState(ctx, s.name)
    // ... build HTML table row
  }).join('\n')
  return `<!DOCTYPE html><html>...<table>${rows}</table></html>`
}
```

**Acceptance Criteria:**
- [ ] `showStatus` command opens a WebView panel (not QuickPick)
- [ ] Panel shows table: source name, status, last checked, keys managed
- [ ] Disabled sources shown with ⏸ indicator
- [ ] Error sources shown with ⚠ indicator and error message
- [ ] Panel has correct CSP header (no inline scripts unless `enableScripts: true`)

**Testing:**
- [ ] Run `showStatus` → WebView panel opens with source table
- [ ] Panel shows correct data for each source state
- [ ] Manual test with disabled source, errored source, and healthy source

**Dependencies:** None

---

### I002 — Add `debug` and `publish` tasks to Taskfile.yml

**Status:** 🔲 TODO
**Priority:** 🟡 Medium

**Description:**
The implementation plan (`07-implementation-plan.md`) lists `debug` and `publish` as standard Taskfile tasks, but they were not added. `debug` opens the Extension Host for local development, and `publish` calls `vsce publish`. Without these, developers must remember the raw commands.

**Current State:**
`Taskfile.yml` has: `build`, `watch`, `lint`, `format`, `test`, `package`, `install-local`.
Missing: `debug`, `publish`.

**Proposed Changes:**

Add to `Taskfile.yml`:

```yaml
  debug:
    desc: "Launch VS Code Extension Host for debugging"
    cmds:
      - code --extensionDevelopmentPath={{.ROOT_DIR}} --new-window

  publish:
    desc: "Publish extension to VS Code Marketplace (requires VSCE_PAT)"
    cmds:
      - pnpm publish
```

**Note:** The `debug` task relies on the `code` CLI being available. `publish` requires a `VSCE_PAT` environment variable (VS Code Personal Access Token).

**Acceptance Criteria:**
- [ ] `task debug` opens a new VS Code window with the extension loaded in development mode
- [ ] `task publish` calls `pnpm publish` (which calls `vsce publish`)
- [ ] `task --list` shows both new tasks with descriptions

**Testing:**
- [ ] `task --list` output includes `debug` and `publish`
- [ ] `task debug` launches VS Code (manual verification)

**Dependencies:** T001 (`.vscode/launch.json` should exist for a complete debug experience)

---

## Documentation

### D001 — Complete end-user README.md

**Status:** 🔲 TODO
**Priority:** 🟢 High

**Description:**
The current `README.md` has a brief feature list and Quick Start snippet but lacks a full configuration reference, usage examples, command documentation, and screenshots. A complete README is required before publishing to the VS Code Marketplace.

**Target Audience:** VS Code users who want to sync settings from Git repos or local files.

**Content Outline:**

1. **Header** — extension name, badges (VS Code Marketplace, CI status), short tagline
2. **Why** — problem statement (settings drift, team config, community patterns)
3. **Features** — feature list with icons
4. **Quick Start** — minimal working configuration example (antfu file-nesting use case)
5. **Configuration Reference**
   - `settingsUpdater.autoUpdateInterval`
   - `settingsUpdater.defaultParser`
   - `settingsUpdater.giteaBaseUrl`
   - Full Source Object schema with all properties
6. **URL Shorthand Reference** — table: `github:`, `codeberg:`, `gitlab:`, `gitea:`
7. **Merge Strategies** — `replace`, `merge-shallow`, `merge-deep` with before/after examples
8. **Commands Reference** — all 7 commands with descriptions
9. **Status Bar** — description of idle/updating/error states
10. **Inspiration** — credit to `antfu/vscode-file-nesting-config`
11. **License**

**Format:** Markdown with JSONC code blocks and Mermaid lifecycle diagram (reuse from `docs/`)

**Location:** `README.md` (repo root)

**Acceptance Criteria:**
- [ ] README has all 11 sections listed above
- [ ] Configuration reference matches the `package.json` schema exactly
- [ ] URL shorthand table is accurate (verified against `resolver.ts`)
- [ ] Merge strategy examples use actual before/after JSON (from spec `04-merge-strategies.md`)
- [ ] All 7 commands documented with exact palette titles
- [ ] Code examples are valid JSONC

**Testing:**
- [ ] All links in README resolve (internal anchors + external URLs)
- [ ] Code examples copy-paste into settings.json without error

**Dependencies:** None (can be written from spec alone; T004 depends on this)

---

### D002 — Add CHANGELOG.md (initial v0.1.0 entry)

**Status:** 🔲 TODO
**Priority:** 🟡 Medium

**Description:**
VS Code Marketplace guidelines strongly recommend a `CHANGELOG.md`. The `release.yml` GitHub Action publishes on `v*` tags, which conventionally reference the changelog. Without it, the Marketplace listing shows no release notes.

**Target Audience:** Users upgrading the extension, contributors tracking changes.

**Content Outline:**

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [0.1.0] — Initial release

### Added
- Multi-source settings sync from local JSONC files and Git repos
- Configurable merge strategies: `replace`, `merge-shallow`, `merge-deep`
- URL shorthands: `github:`, `codeberg:`, `gitlab:`, `gitea:`
- FileSystemWatcher for automatic local file source updates
- Polling with per-source configurable intervals
- Status bar item (idle / updating / error states)
- All 7 commands: updateAll, updateSource, disableSource, enableSource,
  showLog, openConfig, showStatus
- Key tracking and cleanup (removes keys dropped from a source)
- First-run silent apply (no prompt on first activation)
```

**Format:** Markdown, following [Keep a Changelog](https://keepachangelog.com/) format.

**Location:** `CHANGELOG.md` (repo root)

**Acceptance Criteria:**
- [ ] `CHANGELOG.md` created at repo root
- [ ] Follows Keep a Changelog format
- [ ] Lists all Phase 1 + Phase 2 features under `[0.1.0]`
- [ ] `package.json` has `"changelog": "CHANGELOG.md"` field (optional but recommended)

**Testing:**
- [ ] File is valid Markdown (no broken formatting)
- [ ] VS Code Marketplace preview renders it correctly

**Dependencies:** None

---

## Task Summary

| ID   | Category      | Title                                            | Priority   | Status  | Dependencies |
|------|---------------|--------------------------------------------------|------------|---------|--------------|
| F001 | Fix           | Fix dead `pattern` variable in `localWatcher.ts` | 🔴 Low     | 🔲 TODO | —            |
| F002 | Fix           | `openConfig`: scroll to `settingsUpdater`        | 🟡 Medium  | 🔲 TODO | —            |
| T001 | Feature       | Add `.vscode/launch.json` (Extension Host)       | 🟢 High    | 🔲 TODO | —            |
| T002 | Feature       | Add `state.test.ts` unit tests                   | 🟢 High    | 🔲 TODO | —            |
| T003 | Feature       | Scaffold integration tests                       | 🟡 Medium  | 🔲 TODO | T001         |
| T004 | Feature       | VS Code Marketplace assets (icon, galleryBanner) | 🔴 Low     | 🔲 TODO | D001         |
| I001 | Improvement   | `showStatus`: upgrade to WebView panel           | 🔴 Low     | 🔲 TODO | —            |
| I002 | Improvement   | Add `debug` and `publish` tasks to Taskfile.yml  | 🟡 Medium  | 🔲 TODO | T001         |
| D001 | Documentation | Complete end-user README.md                      | 🟢 High    | 🔲 TODO | —            |
| D002 | Documentation | Add CHANGELOG.md (initial v0.1.0 entry)          | 🟡 Medium  | 🔲 TODO | —            |

**Legend:**
- **Status**: ✅ Done | 🔄 In Progress | 🔲 TODO | ⏸️ Paused | ❌ Cancelled
- **Priority**: 🟢 High | 🟡 Medium | 🔴 Low

---

## Testing Notes

**Test Environment:** Node.js 20, pnpm 9, Vitest 2.x

### Baseline (Phase 1 + 2 — ✅ Done)

| Test File                    | Tests | Status        |
|------------------------------|-------|---------------|
| `test/unit/resolver.test.ts` | 6     | ✅ All pass   |
| `test/unit/parser.test.ts`   | 3     | ✅ All pass   |
| `test/unit/merge.test.ts`    | 5     | ✅ All pass   |
| **Total**                    | **14**| ✅ All pass   |

### After Phase 3

Expected test count after T002 (state tests) + T003 (integration):

| Test File                         | Tests | Status  |
|-----------------------------------|-------|---------|
| `test/unit/state.test.ts`         | ~6    | 🔲 TODO |
| `test/integration/suite/index.ts` | ~2    | 🔲 TODO |

---

## Implementation Notes

### Architecture Decisions

**Decision 1: QuickPick vs. WebView for `showStatus`**
- **Context:** Spec says "WebView panel (or Quick Pick information list)" — both allowed
- **Phase 2 choice:** QuickPick for speed and simplicity
- **Phase 3 path:** Upgrade to WebView (I001) if richer UX is desired
- **Rationale:** QuickPick satisfies the spec and ships faster; WebView is polish

**Decision 2: Native `fetch` vs. `ofetch` for `fetchRaw`**
- **Context:** `ofetch` doesn't expose `responseType: 'text'` correctly in its TypeScript types
- **Decision:** Use `globalThis.fetch` (native, Node 18+) with `AbortSignal.timeout`
- **Rationale:** No external dependency needed; VS Code runs on Node 18+

**Decision 3: State persistence in `globalState` (not workspace state)**
- **Context:** Extension writes to global `settings.json` only
- **Decision:** Persist `SourceState` in `ExtensionContext.globalState`
- **Rationale:** Content hashes and applied-key tracking are global (not per-workspace)

### Known Limitations

- **No authentication for private repos** — only public URLs are supported. Users with private repos must clone locally and use a `file:` source.
- **Single global settings.json target** — by design; VS Code workspace settings are not written (VS Code's scoped settings system handles workspace overrides naturally).
- **`showStatus` QuickPick closes on click** — not a bug (I001 upgrades this to WebView).
- **Integration tests require VS Code binary** — cannot run in standard CI without display server or `xvfb`. May need `xvfb-run` on Linux CI runners.

### Future Enhancements

- Authentication support (OAuth token in VS Code SecretStorage) for private repos
- `settingsUpdater.onConflict` — configurable conflict resolution when two sources write the same key differently
- Per-source notification suppression (`"silent": true`) for sources that update frequently
- VS Code workspace-level source overrides (`settingsUpdater.workspaceSources`)
