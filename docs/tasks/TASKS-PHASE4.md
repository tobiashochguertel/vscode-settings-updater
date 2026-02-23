# VS Code Settings Updater — Phase 4 Tasks Documentation

**Created:** 2026-02-23
**Updated:** 2026-02-23
**Status:** In Progress

> Phase 4 covers: spec gap fixes found during audit, SOLID architectural refactoring, and comprehensive test expansion.
> Phase 1 (scaffold), Phase 2 (full feature set), and Phase 3 (polish) are complete.

---

## Audit Findings

### Tasks Documentation (Phase 3) — ✅ All 10 tasks complete

### Specification Gaps Found (NOT covered by any previous task)

| Gap | Location | Severity |
|-----|----------|----------|
| `setIdle()` missing after `changeCount === 0` check | `lifecycle.ts:89` | 🔴 Bug |
| `countChanges()` compares raw `newValue` not merged result | `apply.ts:73` | 🔴 Bug |
| `require('os')` inside function bodies | `lifecycle.ts:74`, `localWatcher.ts:17` | 🟡 Code quality |
| `fetchAndApplySource` uses `parser?: any; mergeStrategy?: any` | `lifecycle.ts:53` | 🟡 Type safety |
| Relative path resolution incomplete (spec: workspace root fallback) | `lifecycle.ts:74`, `localWatcher.ts:17` | 🟡 Missing spec feature |

### SOLID Issues Identified

| Issue | Pattern Violated | Location |
|-------|-----------------|----------|
| `fetchAndApplySource` handles URL fetch, file read, hash, parse, prompt, apply | SRP | `lifecycle.ts` |
| Source type detection via `if (url) … else if (file)` | Open/Closed | `lifecycle.ts`, `localWatcher.ts` |
| Merge functions not behind interface | Strategy | `merge.ts` |
| Parsers not behind interface | Strategy | `parser.ts` |
| `pollingTimers`, `channel`, `statusBarItem` as module-level `let` | Singleton | lifecycle, logger, statusBar |
| `fetchAndApplySource` param typed as anonymous object with `any` | Type safety | `lifecycle.ts:53` |
| `commands.ts` directly calls `fetchAndApplySource` (lifecycle internal) | DIP | `commands.ts` |

---

## Quick Status Overview

| Category      | Total | Done | In Progress | TODO | Paused |
|---------------|-------|------|-------------|------|--------|
| Fixes         | 5     | 0    | 0           | 5    | 0      |
| Features      | 3     | 0    | 0           | 3    | 0      |
| Improvements  | 7     | 0    | 0           | 7    | 0      |
| Documentation | 1     | 0    | 0           | 1    | 0      |
| **TOTAL**     | **16**| **0**| **0**       |**16**| **0**  |

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

### Set 1: Spec Gap Fixes

**Priority:** High
**Description:** Five bugs and missing features found during spec audit. All are small, focused fixes. Must be done before refactoring to avoid carrying known bugs into the new architecture.

| Order | Task ID | Title                                              | Status  |
|-------|---------|---------------------------------------------------|---------|
| 1     | F010    | Fix missing `setIdle()` in up-to-date branch      | 🔲 TODO |
| 2     | F011    | Fix `countChanges` — use merged value, not raw    | 🔲 TODO |
| 3     | F012    | Fix `require()` calls → top-level imports         | 🔲 TODO |
| 4     | F013    | Fix `any` types in `fetchAndApplySource` param    | 🔲 TODO |
| 5     | F014    | Implement relative path resolution (spec §03)     | 🔲 TODO |

---

### Set 2: SOLID Refactoring

**Priority:** High
**Description:** Restructure the codebase using Strategy pattern, proper Singleton, and Dependency Injection so that lifecycle logic is testable and extensions (new source types, parsers, merge strategies) don't require modifying existing code.

| Order | Task ID | Title                                              | Status  |
|-------|---------|---------------------------------------------------|---------|
| 1     | I010    | Strategy pattern: `ISourceReader` interface        | 🔲 TODO |
| 2     | I011    | Strategy pattern: `IParser` interface              | 🔲 TODO |
| 3     | I012    | Strategy pattern: `IMergeStrategy` interface       | 🔲 TODO |
| 4     | I013    | Extract `UpdateOrchestrator` service class         | 🔲 TODO |
| 5     | I014    | Introduce `ServiceContainer` (dependency injection)| 🔲 TODO |
| 6     | I015    | Logger: class-based Singleton                      | 🔲 TODO |
| 7     | I016    | StatusBar: class-based Singleton                   | 🔲 TODO |

**Dependencies:** Set 1 fixes must be done first (carry fixes into new architecture)

---

### Set 3: Comprehensive Tests

**Priority:** High
**Description:** Expand test coverage to include `apply.ts`, testable `lifecycle` (post-DI), expanded integration tests that exercise command execution, and an E2E smoke test.

| Order | Task ID | Title                                              | Status  |
|-------|---------|---------------------------------------------------|---------|
| 1     | T010    | Unit tests for `apply.ts`                         | 🔲 TODO |
| 2     | T011    | Unit tests for `UpdateOrchestrator` (post-DI)     | 🔲 TODO |
| 3     | T012    | Expand integration tests (command execution)      | 🔲 TODO |
| 4     | D010    | Extension Try-Out Guide (manual verification)     | 🔲 TODO |

**Dependencies:** I013, I014 (UpdateOrchestrator must exist and be injectable)

---

## Fixes

### F010 — Fix missing `setIdle()` in up-to-date branch

**Status:** 🔲 TODO
**Priority:** 🟢 High

**Description:**
When `countChanges()` returns 0, `fetchAndApplySource` logs "Settings already up-to-date" and returns early. However, it never calls `setIdle()`. This means the status bar stays stuck on `$(sync~spin) Settings Updater` (the "updating" spinner) forever after a no-change cycle.

**Current Behavior:**
```typescript
// lifecycle.ts:88
if (changeCount === 0) {
  log.info(`[${source.name}] Settings already up-to-date`)
  return   // ← setIdle() never called; spinner stays
}
```

**Expected Behavior:**
```typescript
if (changeCount === 0) {
  log.info(`[${source.name}] Settings already up-to-date`)
  setIdle()
  return
}
```

**Implementation:** One-line fix in `src/lifecycle.ts`.

**Acceptance Criteria:**
- [ ] Status bar returns to `$(sync) Settings Updater` after an up-to-date check
- [ ] `pnpm build && pnpm test` passes

**Testing:**
- [ ] Configure a source that is already applied → run `updateAll` → status bar shows idle state

**Dependencies:** None

---

### F011 — Fix `countChanges`: use merged value, not raw `newValue`

**Status:** 🔲 TODO
**Priority:** 🟢 High

**Description:**
`countChanges()` currently compares `existing` (current `settings.json` value) against `newValue` (raw parsed value). This gives incorrect results for `merge-shallow` and `merge-deep` strategies, where the actual written value is `applyMerge(existing, newValue, strategy)`, not `newValue` itself.

**Example of incorrect behavior:**
```
existing: { "*.ts": "old.js", "*.go": "test.go" }
newValue:  { "*.ts": "new.js" }
strategy:  merge-shallow
actual_result: { "*.ts": "new.js", "*.go": "test.go" }  ← only *.ts changes
countChanges: 1 (✅ correct in this case)

But with:
existing: { "*.ts": "same" }
newValue:  { "*.ts": "same" }
strategy:  merge-shallow
actual_result: { "*.ts": "same" }  ← no change
countChanges: 0 (✅ correct here too)

But with:
existing: { "a": 1 }
newValue:  { "b": 2 }
strategy:  merge-shallow
actual_result: { "a": 1, "b": 2 }  ← adds "b"
countChanges reports: 1 change (comparing existing {a:1} vs newValue {b:2} → JSON differs ✅)
```

Actually the main bug is: `applyMerge` result may equal `existing` even when `newValue !== existing`. The prompt would say "1 setting will change" but after applying, nothing actually changes.

**Fix:**
```typescript
// In apply.ts countChanges()
for (const [key, newValue] of Object.entries(keysToWrite)) {
  const existing = config.get(key)
  const merged = applyMerge(existing, newValue, source.mergeStrategy ?? 'replace')
  if (JSON.stringify(existing) !== JSON.stringify(merged)) count++
}
```

**Implementation:** Update `countChanges` in `src/apply.ts` to call `applyMerge` before comparing. Requires passing `source.mergeStrategy` (already available in the function signature).

**Acceptance Criteria:**
- [ ] `countChanges` for `merge-shallow` with overlapping keys reports 0 when result equals existing
- [ ] `countChanges` for `replace` strategy is unchanged (replace result = newValue, existing check same as before)
- [ ] Unit test added for `countChanges` in `apply.test.ts`

**Testing:**
- [ ] Unit test: `countChanges` with `merge-shallow`, existing superset of `newValue` → returns 0
- [ ] Unit test: `countChanges` with `replace` strategy → unchanged behavior

**Dependencies:** None

---

### F012 — Fix `require()` calls → top-level imports

**Status:** 🔲 TODO
**Priority:** 🟡 Medium

**Description:**
Two files use CommonJS `require()` inside function bodies to get `os.homedir()`. This is inconsistent with the ES module style used everywhere else, may cause issues with bundlers (esbuild handles it but it's a code smell), and prevents static analysis.

**Locations:**
- `src/lifecycle.ts:74`: `require('os').homedir()`
- `src/sources/localWatcher.ts:17`: `require('node:os').homedir()`

**Fix:**
Add a top-level import to each file:
```typescript
import { homedir } from 'node:os'
// Then replace require('os').homedir() with homedir()
```

**Acceptance Criteria:**
- [ ] No `require()` calls in any `src/` TypeScript file
- [ ] `pnpm build && pnpm lint` pass

**Dependencies:** None

---

### F013 — Fix `any` types in `fetchAndApplySource` parameter

**Status:** 🔲 TODO
**Priority:** 🟡 Medium

**Description:**
`fetchAndApplySource` declares its `source` parameter as an anonymous object with `parser?: any` and `mergeStrategy?: any`. The `Source` type in `src/sources/types.ts` already defines these correctly as `ParserType` and `MergeStrategy`. This bypass defeats type checking.

**Current:**
```typescript
source: { name: string; url?: string; file?: string; parser?: any; mergeStrategy?: any; ... }
```

**Fix:**
```typescript
import type { Source } from './sources/types'
// Change parameter to:
source: Source
```

**Acceptance Criteria:**
- [ ] `fetchAndApplySource` parameter type is `Source` (not anonymous object)
- [ ] `pnpm exec tsc --noEmit` reports zero new errors

**Dependencies:** None

---

### F014 — Implement relative path resolution per spec §03

**Status:** 🔲 TODO
**Priority:** 🟡 Medium

**Description:**
The spec (doc 03) defines a 4-step path resolution order for `file` sources. Currently only step 1 (`~` expansion) and step 2 (absolute path) are implemented. Steps 3 and 4 are missing: relative paths are passed to `vscode.Uri.file()` as-is, which resolves against the process working directory rather than the workspace root.

**Spec path resolution order:**
1. `~` → `os.homedir()`
2. Absolute path → use as-is
3. Relative + workspace open → resolve against first workspace folder root
4. Relative + no workspace → resolve against VS Code user data directory

**Implementation:**

Extract a shared `resolveFilePath(rawPath: string): string` utility in `src/sources/resolver.ts` (or a new `src/sources/pathResolver.ts`):

```typescript
import { homedir } from 'node:os'
import * as path from 'node:path'
import * as vscode from 'vscode'

export function resolveFilePath(rawPath: string): string {
  // Step 1: tilde expansion
  if (rawPath.startsWith('~')) {
    return rawPath.replace(/^~/, homedir())
  }
  // Step 2: absolute path — use as-is
  if (path.isAbsolute(rawPath)) return rawPath
  // Step 3: relative + workspace open
  const folders = vscode.workspace.workspaceFolders
  if (folders && folders.length > 0) {
    return path.join(folders[0].uri.fsPath, rawPath)
  }
  // Step 4: relative + no workspace → VS Code global storage path (user data)
  // Use the extension's globalStorageUri as a proxy for user data dir
  return rawPath  // fallback: leave as-is (caller will handle file-not-found gracefully)
}
```

Replace both occurrences of the inline `replace(/^~/, require('os').homedir())` with a call to `resolveFilePath()`.

**Note:** Step 4's "VS Code user data directory" isn't easily accessible without an `ExtensionContext`. The fallback of leaving relative paths as-is (with graceful file-not-found handling) is acceptable for now, documented in code comments.

**Acceptance Criteria:**
- [ ] `resolveFilePath('~/foo.jsonc')` expands `~` correctly
- [ ] `resolveFilePath('/abs/path.jsonc')` returns as-is
- [ ] `resolveFilePath('relative/path.jsonc')` with open workspace → resolves to workspace root + path
- [ ] `resolveFilePath('relative/path.jsonc')` with no workspace → returns path as-is (graceful)
- [ ] Unit test for `resolveFilePath` added

**Testing:**
- [ ] Unit tests in `test/unit/pathResolver.test.ts` covering all 4 cases
- [ ] `pnpm test` passes

**Dependencies:** F012 (share `homedir` import)

---

## Features

### T010 — Unit tests for `apply.ts`

**Status:** 🔲 TODO
**Priority:** 🟢 High

**Description:**
`apply.ts` contains `applySource` (the core write function) and `countChanges` (the change-count function used in the user prompt). Neither has any unit tests. `applySource` is hard to test currently because it directly calls `vscode.workspace.getConfiguration()`. This task creates tests using mocks, and also adds the `countChanges` fix from F011.

**Implementation:**

Create `test/unit/apply.test.ts` with a mock VS Code configuration:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the VS Code API
vi.mock('vscode', () => {
  const store: Record<string, unknown> = {}
  return {
    workspace: {
      getConfiguration: () => ({
        get: (key: string) => store[key],
        update: vi.fn(async (key: string, value: unknown) => { store[key] = value }),
      }),
    },
    ConfigurationTarget: { Global: 1 },
  }
})

vi.mock('../../src/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}))

vi.mock('../../src/state', () => {
  // ... return mock state implementations
})
```

**Tests to cover:**
1. `countChanges` returns 0 when settings already match (for all 3 strategies)
2. `countChanges` returns correct count for each strategy
3. `applySource` writes the correct keys
4. `applySource` removes keys that were in previous `appliedKeys` but not in current source
5. `applySource` does NOT remove keys still owned by another source

**Acceptance Criteria:**
- [ ] `test/unit/apply.test.ts` created with ≥ 8 tests
- [ ] All new tests pass: `pnpm test`
- [ ] Total passing tests increases to ≥ 28

**Dependencies:** F011 (fix countChanges first, then write tests that confirm correct behavior)

---

### T011 — Unit tests for `UpdateOrchestrator` (post-DI refactor)

**Status:** 🔲 TODO
**Priority:** 🟢 High

**Description:**
After the I013/I014 refactor, `UpdateOrchestrator` (the extracted service class replacing `fetchAndApplySource`) will be injectable with mocked readers, parsers, and VS Code API. This makes the lifecycle fully unit-testable without launching VS Code.

**Tests to cover:**
1. First-run: all sources applied without prompt
2. Subsequent run: sources whose interval has not elapsed are skipped
3. Hash unchanged: source skipped, `lastFetchAt` updated
4. Hash changed + user accepts: `applySource` called
5. Hash changed + user dismisses: `applySource` not called
6. Fetch error: warning notification shown, status bar shows error, settings unchanged

**Acceptance Criteria:**
- [ ] `test/unit/orchestrator.test.ts` created with ≥ 6 tests
- [ ] All tests use injected mocks (no real VS Code, no real HTTP)
- [ ] Total passing tests ≥ 34

**Dependencies:** I013, I014 (UpdateOrchestrator + ServiceContainer must exist first)

---

### T012 — Expand integration tests: command execution

**Status:** 🔲 TODO
**Priority:** 🟡 Medium

**Description:**
Current integration tests only verify that the extension registers and that commands exist in the registry. This task expands them to actually execute commands and verify their observable effects.

**Tests to add in `test/integration/suite/extension.test.ts`:**
1. `settingsUpdater.showLog` → Output channel becomes visible (no error thrown)
2. `settingsUpdater.showStatus` → WebView panel opens (`vscode.window.visibleTextEditors` or panel)
3. `settingsUpdater.updateAll` with no sources configured → information message shown (mocked)
4. `settingsUpdater.openConfig` → active editor changes to settings.json

**Acceptance Criteria:**
- [ ] Integration test suite expands to ≥ 6 tests
- [ ] All tests pass in `pnpm test:integration`
- [ ] No regressions in existing 2 smoke tests

**Dependencies:** T001 (`.vscode/launch.json` for electron runner — already done ✅)

---

## Improvements

### I010 — Strategy pattern: `ISourceReader` interface

**Status:** 🔲 TODO
**Priority:** 🟢 High

**Description:**
Currently, source type detection is an `if (source.url) ... else if (source.file)` block embedded in `fetchAndApplySource`. Adding a new source type (S3, HTTP with auth, etc.) requires modifying the core orchestration function, violating the Open/Closed Principle.

Introduce an `ISourceReader` interface and two concrete implementations. The `UpdateOrchestrator` (I013) will accept readers via constructor injection.

**Interface design:**

```typescript
// src/sources/ISourceReader.ts
export interface ISourceReader {
  /** Returns true if this reader handles the given source config */
  canHandle(source: Source): boolean
  /** Read raw content from the source */
  read(source: Source): Promise<string>
}
```

**Concrete implementations:**

```typescript
// src/sources/RemoteSourceReader.ts
export class RemoteSourceReader implements ISourceReader {
  canHandle(source: Source): boolean { return !!source.url }
  async read(source: Source): Promise<string> {
    const url = resolveUrl(source.url!)
    return fetchRaw(url)
  }
}

// src/sources/LocalFileSourceReader.ts
export class LocalFileSourceReader implements ISourceReader {
  canHandle(source: Source): boolean { return !!source.file && !source.url }
  async read(source: Source): Promise<string> {
    const expanded = resolveFilePath(source.file!)
    const uri = vscode.Uri.file(expanded)
    const bytes = await vscode.workspace.fs.readFile(uri)
    return new TextDecoder().decode(bytes)
  }
}
```

**Acceptance Criteria:**
- [ ] `src/sources/ISourceReader.ts` created with interface
- [ ] `src/sources/RemoteSourceReader.ts` created and tested
- [ ] `src/sources/LocalFileSourceReader.ts` created and tested
- [ ] `lifecycle.ts` / `UpdateOrchestrator` uses injected `ISourceReader[]` instead of inline if/else
- [ ] `pnpm build && pnpm test` pass

**Dependencies:** F012, F014 (shared homedir + resolveFilePath used by LocalFileSourceReader)

---

### I011 — Strategy pattern: `IParser` interface

**Status:** 🔲 TODO
**Priority:** 🟡 Medium

**Description:**
`parseContent()` is a function switch on `ParserType`. The `IParser` Strategy pattern makes parsers independently testable and extensible (e.g., adding a `yaml-file` parser later requires no changes to existing code).

**Interface design:**

```typescript
// src/sources/IParser.ts
export interface IParser {
  readonly type: ParserType
  parse(raw: string): ParsedSettings
}

// src/sources/JsoncBlockParser.ts
export class JsoncBlockParser implements IParser {
  readonly type: ParserType = 'jsonc-block'
  parse(raw: string): ParsedSettings { ... }
}

// src/sources/JsoncFileParser.ts
export class JsoncFileParser implements IParser {
  readonly type: ParserType = 'jsonc-file'
  parse(raw: string): ParsedSettings { ... }
}
```

A `ParserRegistry` maps `ParserType → IParser` and is injected into `UpdateOrchestrator`.

**Acceptance Criteria:**
- [ ] `IParser` interface + two concrete classes created
- [ ] `ParserRegistry` class with `get(type: ParserType): IParser`
- [ ] `parseContent()` function can be kept as a thin wrapper (backward compat) or removed
- [ ] Existing `parser.test.ts` updated to test concrete classes
- [ ] `pnpm test` passes

**Dependencies:** I010 (done together as part of strategy-pattern set)

---

### I012 — Strategy pattern: `IMergeStrategy` interface

**Status:** 🔲 TODO
**Priority:** 🟡 Medium

**Description:**
`applyMerge()` is a function switch on `MergeStrategy`. Convert to Strategy pattern so merge behaviors are independently testable classes.

**Interface design:**

```typescript
// src/IMergeStrategy.ts
export interface IMergeStrategy {
  readonly name: MergeStrategy
  merge(existing: unknown, incoming: unknown): unknown
}

// src/strategies/ReplaceStrategy.ts
export class ReplaceStrategy implements IMergeStrategy {
  readonly name: MergeStrategy = 'replace'
  merge(_existing: unknown, incoming: unknown): unknown { return incoming }
}

// src/strategies/MergeShallowStrategy.ts
// src/strategies/MergeDeepStrategy.ts
```

A `MergeStrategyRegistry` maps strategy name → instance (used by `applySource`).

**Acceptance Criteria:**
- [ ] `IMergeStrategy` interface + 3 concrete classes
- [ ] `MergeStrategyRegistry` with `get(name: MergeStrategy): IMergeStrategy`
- [ ] `applyMerge()` kept as thin wrapper or removed
- [ ] `merge.test.ts` updated to test concrete classes
- [ ] `pnpm test` passes

**Dependencies:** I010 (done in same refactor pass)

---

### I013 — Extract `UpdateOrchestrator` service class

**Status:** 🔲 TODO
**Priority:** 🟢 High

**Description:**
`lifecycle.ts` currently mixes: startup logic, polling timer management, URL fetching, file reading, hash comparison, change counting, user prompting, and `applySource` delegation. This is a God Function that's impossible to unit test. Extract the per-source update logic into an `UpdateOrchestrator` class.

**Design:**

```typescript
// src/UpdateOrchestrator.ts
export class UpdateOrchestrator {
  constructor(
    private readonly ctx: ExtensionContext,
    private readonly readers: ISourceReader[],
    private readonly parserRegistry: ParserRegistry,
    private readonly mergeRegistry: MergeStrategyRegistry,
    private readonly notifier: INotifier,    // wraps vscode.window.show*
    private readonly statusBar: IStatusBar,  // wraps status bar updates
  ) {}

  async runForSource(source: Source, prompt: boolean): Promise<void> { ... }
  async runAll(sources: Source[], prompt: boolean): Promise<void> { ... }
}
```

**What stays in `lifecycle.ts`:**
- `runStartupCheck(ctx)` — calls orchestrator
- `startPolling(ctx)` / `stopPolling()` — timer management only

**What moves to `UpdateOrchestrator`:**
- `fetchAndApplySource` logic (now `runForSource`)
- Hash comparison
- Change counting
- Prompt
- Apply delegation

**Acceptance Criteria:**
- [ ] `src/UpdateOrchestrator.ts` created
- [ ] `lifecycle.ts` reduced to startup + polling wiring only
- [ ] `fetchAndApplySource` replaced by `orchestrator.runForSource()`
- [ ] `commands.ts` updated to use `orchestrator` (not lifecycle internals)
- [ ] `pnpm build && pnpm test` pass (existing 20 tests must stay green)

**Dependencies:** I010, I011, I012

---

### I014 — Introduce `ServiceContainer` (dependency injection)

**Status:** 🔲 TODO
**Priority:** 🟡 Medium

**Description:**
After I010–I013, the extension has several service instances that need to be wired together. A lightweight `ServiceContainer` (not a full IoC framework — just a typed registry) makes the dependency graph explicit, testable, and configurable. It's also the place where production instances are created vs. mock instances in tests.

**Design:**

```typescript
// src/ServiceContainer.ts
export interface Services {
  readers: ISourceReader[]
  parserRegistry: ParserRegistry
  mergeRegistry: MergeStrategyRegistry
  orchestrator: UpdateOrchestrator
  statusBar: StatusBarController
  logger: Logger
}

export function createProductionServices(ctx: ExtensionContext): Services {
  const logger = Logger.getInstance()
  const statusBar = StatusBarController.getInstance()
  const readers = [new RemoteSourceReader(), new LocalFileSourceReader()]
  const parserRegistry = new ParserRegistry([new JsoncBlockParser(), new JsoncFileParser()])
  const mergeRegistry = new MergeStrategyRegistry([new ReplaceStrategy(), new MergeShallowStrategy(), new MergeDeepStrategy()])
  const orchestrator = new UpdateOrchestrator(ctx, readers, parserRegistry, mergeRegistry, ...)
  return { readers, parserRegistry, mergeRegistry, orchestrator, statusBar, logger }
}
```

The `activate()` function calls `createProductionServices(ctx)` and passes the container to lifecycle, localWatcher, and commands.

**Acceptance Criteria:**
- [ ] `src/ServiceContainer.ts` created
- [ ] `activate()` in `index.ts` uses `createProductionServices()`
- [ ] No module-level side-effectful imports in `lifecycle.ts` or `commands.ts`
- [ ] Tests can call `createTestServices(...)` with mocks injected
- [ ] `pnpm build && pnpm test` pass

**Dependencies:** I013

---

### I015 — Logger: class-based Singleton

**Status:** 🔲 TODO
**Priority:** 🟡 Medium

**Description:**
`logger.ts` uses a module-level `let channel` variable — an implicit singleton. Replace with an explicit Singleton class that also implements an `ILogger` interface (needed for DI in tests).

**Design:**

```typescript
export interface ILogger {
  info(msg: string): void
  warn(msg: string): void
  error(msg: string): void
  show(preserveFocus?: boolean): void
  dispose(): void
}

export class Logger implements ILogger {
  private static instance: Logger | undefined
  static getInstance(): Logger { ... }
  static reset(): void { Logger.instance = undefined }  // for tests
  private constructor(private readonly channel: vscode.OutputChannel) {}
  // ...
}
```

**Acceptance Criteria:**
- [ ] `Logger` class with `getInstance()` / `reset()` (for test teardown)
- [ ] `ILogger` interface extracted
- [ ] All existing `log.info/warn/error` callsites updated
- [ ] `pnpm build` passes

**Dependencies:** I014 (ServiceContainer wires Logger)

---

### I016 — StatusBar: class-based Singleton

**Status:** 🔲 TODO
**Priority:** 🟡 Medium

**Description:**
`statusBar.ts` uses a module-level `let statusBarItem` variable — same implicit singleton pattern as the logger. Replace with an explicit `StatusBarController` class implementing `IStatusBar`.

**Design:**

```typescript
export interface IStatusBar {
  setUpdating(sourceName?: string): void
  setIdle(): void
  setError(message?: string): void
  dispose(): void
}

export class StatusBarController implements IStatusBar {
  private static instance: StatusBarController | undefined
  static getInstance(): StatusBarController { ... }
  static reset(): void { ... }
  // ...
}
```

**Acceptance Criteria:**
- [ ] `StatusBarController` class with `getInstance()` / `reset()`
- [ ] `IStatusBar` interface extracted
- [ ] All callsites updated from `setIdle()` / `setError()` / `setUpdating()` module functions to `statusBar.setIdle()` etc.
- [ ] `pnpm build` passes

**Dependencies:** I014

---

## Documentation

### D010 — Architecture documentation with diagrams

**Status:** 🔲 TODO
**Priority:** 🟡 Medium

**Description:**
After the SOLID refactor, document the new architecture: class diagram, dependency graph, and a guide for adding new source types, parsers, or merge strategies. Located in `docs/architecture.md`.

**Target Audience:** Contributors extending the extension.

**Content Outline:**
1. Architecture overview (Mermaid class diagram)
2. `ServiceContainer` and dependency graph (Mermaid flowchart)
3. How to add a new source type (ISourceReader guide)
4. How to add a new parser (IParser guide)
5. How to add a new merge strategy (IMergeStrategy guide)
6. Testing guide (createTestServices pattern)

**Format:** Markdown + Mermaid diagrams

**Location:** `docs/architecture.md`

**Acceptance Criteria:**
- [ ] Mermaid class diagram reflects actual post-refactor class structure
- [ ] "Adding a new X" guides are accurate (verified by implementing an example)

**Dependencies:** I010–I016 (architecture must be final before documenting)

---

## Task Summary

| ID   | Category      | Title                                              | Priority  | Status  | Dependencies          |
|------|---------------|----------------------------------------------------|-----------|---------|-----------------------|
| F010 | Fix           | Fix missing `setIdle()` in up-to-date branch       | 🟢 High   | 🔲 TODO | —                     |
| F011 | Fix           | Fix `countChanges` — use merged value, not raw     | 🟢 High   | 🔲 TODO | —                     |
| F012 | Fix           | Fix `require()` calls → top-level imports          | 🟡 Medium | 🔲 TODO | —                     |
| F013 | Fix           | Fix `any` types in `fetchAndApplySource` param     | 🟡 Medium | 🔲 TODO | —                     |
| F014 | Fix           | Implement relative path resolution (spec §03)      | 🟡 Medium | 🔲 TODO | F012                  |
| T010 | Feature       | Unit tests for `apply.ts`                          | 🟢 High   | 🔲 TODO | F011                  |
| T011 | Feature       | Unit tests for `UpdateOrchestrator`                | 🟢 High   | 🔲 TODO | I013, I014            |
| T012 | Feature       | Expand integration tests (command execution)       | 🟡 Medium | 🔲 TODO | —                     |
| I010 | Improvement   | Strategy pattern: `ISourceReader`                  | 🟢 High   | 🔲 TODO | F012, F014            |
| I011 | Improvement   | Strategy pattern: `IParser`                        | 🟡 Medium | 🔲 TODO | I010                  |
| I012 | Improvement   | Strategy pattern: `IMergeStrategy`                 | 🟡 Medium | 🔲 TODO | I010                  |
| I013 | Improvement   | Extract `UpdateOrchestrator` service class         | 🟢 High   | 🔲 TODO | I010, I011, I012      |
| I014 | Improvement   | Introduce `ServiceContainer` (DI)                  | 🟡 Medium | 🔲 TODO | I013                  |
| I015 | Improvement   | Logger: class-based Singleton                      | 🟡 Medium | 🔲 TODO | I014                  |
| I016 | Improvement   | StatusBar: class-based Singleton                   | 🟡 Medium | 🔲 TODO | I014                  |
| D010 | Documentation | Architecture documentation with diagrams           | 🟡 Medium | 🔲 TODO | I010–I016             |

**Legend:**
- **Status**: ✅ Done | 🔄 In Progress | 🔲 TODO | ⏸️ Paused | ❌ Cancelled
- **Priority**: 🟢 High | 🟡 Medium | 🔴 Low

---

## Testing Notes

**Current baseline (Phase 3 complete):**

| Test File                    | Tests | Status      |
|------------------------------|-------|-------------|
| `test/unit/resolver.test.ts` | 6     | ✅ All pass |
| `test/unit/parser.test.ts`   | 3     | ✅ All pass |
| `test/unit/merge.test.ts`    | 5     | ✅ All pass |
| `test/unit/state.test.ts`    | 6     | ✅ All pass |
| `test/integration/`          | 2     | ✅ Scaffold |
| **Total**                    | **22**| ✅ All pass |

**Target after Phase 4:**

| Test File                         | Tests | Status  |
|-----------------------------------|-------|---------|
| `test/unit/apply.test.ts`         | ~8    | 🔲 TODO |
| `test/unit/orchestrator.test.ts`  | ~6    | 🔲 TODO |
| `test/unit/pathResolver.test.ts`  | ~4    | 🔲 TODO |
| `test/integration/` (expanded)    | ~6    | 🔲 TODO |
| **New target total**              | **~46**| 🔲 TODO |

---

## Implementation Notes

### Recommended Implementation Order

The dependency chain forms a clear sequence:

```
Phase 4a (parallel):
  F010 ─────────────────────────────────────────────────── done
  F011 ─────────────────────────────────────────────────── done
  F012 ─────────────────────────────────────────────────── done
  F013 ─────────────────────────────────────────────────── done

Phase 4b (sequential, F012 first):
  F014 → I010 → I011 + I012 (parallel) → I013 → I014 → I015 + I016 (parallel)

Phase 4c (parallel, after I013+I014):
  T010 + T011 + T012 (parallel)

Phase 4d (after all above):
  D010
```

### SOLID Principles Applied

| Principle | Before | After |
|-----------|--------|-------|
| **S** Single Responsibility | `fetchAndApplySource` does everything | `UpdateOrchestrator.runForSource` does orchestration only |
| **O** Open/Closed | New source type requires editing `lifecycle.ts` | Implement `ISourceReader`, register in `ServiceContainer` |
| **L** Liskov Substitution | N/A (no inheritance) | `ISourceReader`, `IParser`, `IMergeStrategy` are proper substitutable interfaces |
| **I** Interface Segregation | No interfaces | Fine-grained: `ISourceReader`, `IParser`, `IMergeStrategy`, `ILogger`, `IStatusBar` |
| **D** Dependency Inversion | `lifecycle.ts` imports concrete modules | `UpdateOrchestrator` depends on interfaces; `ServiceContainer` wires production impls |

### Design Pattern Summary

| Pattern | Usage |
|---------|-------|
| **Strategy** | `ISourceReader`, `IParser`, `IMergeStrategy` — swappable algorithms |
| **Singleton** | `Logger.getInstance()`, `StatusBarController.getInstance()` |
| **Registry** | `ParserRegistry`, `MergeStrategyRegistry` — map type name → strategy instance |
| **Composition** | `UpdateOrchestrator` composes reader + parser + merge + notifier |
| **Dependency Injection** | `ServiceContainer.createProductionServices()` wires everything; tests use `createTestServices()` |

### Known Architecture Trade-offs

- **ServiceContainer is not a full IoC framework** — no auto-wiring, no scope management. For a VS Code extension, a lightweight typed registry is sufficient and easier to understand than `inversify` or `tsyringe`.
- **Singleton reset for tests** — `Logger.reset()` / `StatusBarController.reset()` are test-only methods. Documented with `@internal` JSDoc.
- **Backward compatibility** — `applyMerge()`, `parseContent()` kept as thin wrappers during transition; removed in a later cleanup pass once all callsites are updated.
