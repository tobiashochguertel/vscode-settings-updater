# Architecture

## Overview

This VS Code extension syncs `settings.json` keys from one or more configurable sources (remote URLs or local files). On activation it polls each source on a configurable interval, reads raw content, parses it into a settings record, and writes the resulting keys into the user's VS Code configuration — optionally prompting before applying changes.

The codebase follows a SOLID architecture built around three strategy-pattern axes: **source reading** (`ISourceReader`), **content parsing** (`IParser`), and **value merging** (`IMergeStrategy`). Each axis has a registry that dispatches to the appropriate implementation at runtime, and a `ServiceContainer` acts as a DI factory that wires everything together — making it straightforward to swap implementations or inject mocks in tests.

## Directory Structure

```
src/
├── index.ts               # Extension entry point (activate/deactivate)
├── lifecycle.ts           # Startup polling + backward-compat fetchAndApplySource
├── UpdateOrchestrator.ts  # Core orchestration class
├── ServiceContainer.ts    # DI factory (createProductionServices / createTestServices)
├── apply.ts               # applySource() + countChanges() — VS Code config write
├── state.ts               # Per-source state persistence (hash, applied keys)
├── logger.ts              # ILogger + Logger singleton
├── statusBar.ts           # IStatusBar + StatusBarController singleton
├── commands.ts            # 7 VS Code command registrations
├── sources/
│   ├── types.ts           # Source, SourceState, ParsedSettings, MergeStrategy types
│   ├── ISourceReader.ts   # ISourceReader interface
│   ├── RemoteSourceReader.ts    # HTTP fetch implementation
│   ├── LocalFileSourceReader.ts # vscode.workspace.fs implementation
│   ├── fetcher.ts         # fetchRaw() low-level HTTP
│   ├── resolver.ts        # resolveUrl() shorthand expansion
│   ├── pathResolver.ts    # resolveFilePath() 4-step resolution
│   ├── localWatcher.ts    # FileSystemWatcher for local sources
│   └── parser.ts          # parseContent() backward-compat wrapper
├── parsers/
│   ├── IParser.ts         # IParser interface
│   ├── JsoncBlockParser.ts      # Extracts ```jsonc blocks from markdown
│   ├── JsoncFileParser.ts       # Full JSONC/JSON file parser
│   └── ParserRegistry.ts       # Dispatch by parserType string
└── strategies/
    ├── IMergeStrategy.ts        # IMergeStrategy interface
    ├── ReplaceStrategy.ts       # replace: overwrite
    ├── MergeShallowStrategy.ts  # merge-shallow: Object.assign
    ├── MergeDeepStrategy.ts     # merge-deep: recursive merge
    └── MergeStrategyRegistry.ts # Dispatch by strategyName string
```

## Class Diagram

```mermaid
classDiagram
    class UpdateOrchestrator {
        -readers: ISourceReader[]
        -parsers: ParserRegistry
        -mergeStrategies: MergeStrategyRegistry
        -ctx: ExtensionContext
        +runForSource(source, prompt) Promise~void~
    }

    class ISourceReader {
        <<interface>>
        +canHandle(source) bool
        +read(source) Promise~string~
    }

    class RemoteSourceReader {
        +canHandle(source) bool
        +read(source) Promise~string~
    }

    class LocalFileSourceReader {
        +canHandle(source) bool
        +read(source) Promise~string~
    }

    class IParser {
        <<interface>>
        +canHandle(parserType) bool
        +parse(content) ParsedSettings
    }

    class ParserRegistry {
        -parsers: IParser[]
        +parse(content, parserType) ParsedSettings
    }

    class IMergeStrategy {
        <<interface>>
        +canHandle(strategyName) bool
        +apply(existing, incoming) unknown
    }

    class MergeStrategyRegistry {
        -strategies: IMergeStrategy[]
        +apply(strategyName, existing, incoming) unknown
    }

    class ILogger {
        <<interface>>
        +info(msg) void
        +warn(msg) void
        +error(msg) void
    }

    class Logger {
        -instance: Logger$
        +getInstance()$ Logger
        +reset()$ void
    }

    class IStatusBar {
        <<interface>>
        +setUpdating(name) void
        +setIdle() void
        +setError(msg) void
    }

    class StatusBarController {
        -instance: StatusBarController$
        +getInstance()$ StatusBarController
        +reset()$ void
    }

    UpdateOrchestrator --> ISourceReader
    UpdateOrchestrator --> ParserRegistry
    UpdateOrchestrator --> MergeStrategyRegistry
    ISourceReader <|.. RemoteSourceReader
    ISourceReader <|.. LocalFileSourceReader
    IParser <|.. JsoncBlockParser
    IParser <|.. JsoncFileParser
    ParserRegistry --> IParser
    IMergeStrategy <|.. ReplaceStrategy
    IMergeStrategy <|.. MergeShallowStrategy
    IMergeStrategy <|.. MergeDeepStrategy
    MergeStrategyRegistry --> IMergeStrategy
    ILogger <|.. Logger
    IStatusBar <|.. StatusBarController
```

## ServiceContainer Dependency Graph

```mermaid
graph TD
    SC[ServiceContainer] -->|creates| RSR[RemoteSourceReader]
    SC -->|creates| LSR[LocalFileSourceReader]
    SC -->|creates| PR[ParserRegistry]
    SC -->|creates| MSR[MergeStrategyRegistry]
    SC -->|creates| UO[UpdateOrchestrator]
    UO -->|uses| RSR
    UO -->|uses| LSR
    UO -->|uses| PR
    UO -->|uses| MSR
    PR -->|contains| JBP[JsoncBlockParser]
    PR -->|contains| JFP[JsoncFileParser]
    MSR -->|contains| RS[ReplaceStrategy]
    MSR -->|contains| MShS[MergeShallowStrategy]
    MSR -->|contains| MDS[MergeDeepStrategy]
```

## Update Lifecycle

```mermaid
sequenceDiagram
    participant L as lifecycle.ts
    participant UO as UpdateOrchestrator
    participant R as ISourceReader
    participant P as ParserRegistry
    participant M as MergeStrategyRegistry
    participant A as apply.ts

    L->>UO: runForSource(source, prompt)
    UO->>UO: setUpdating(source.name)
    UO->>R: canHandle(source)?
    R-->>UO: true
    UO->>R: read(source)
    R-->>UO: rawContent
    UO->>UO: hash check (skip if unchanged)
    UO->>P: parse(rawContent, parserType)
    P-->>UO: ParsedSettings
    UO->>UO: countChanges()
    alt changeCount > 0 && prompt
        UO->>UO: vscode.window.showInformationMessage()
    end
    UO->>A: applySource(ctx, source, parsed)
    A->>A: writeConfiguration() for each key
    A->>A: cleanup orphaned keys
    A->>A: saveSourceState()
    UO->>UO: setIdle()
```

## Extension Points

### Adding a New Source Reader

1. Create a class implementing `ISourceReader` in `src/sources/`
2. Add it to the `readers` array in `ServiceContainer.createProductionServices()`

### Adding a New Parser

1. Create a class implementing `IParser` in `src/parsers/`
2. Pass it to `new ParserRegistry([...existing, new YourParser()])` in ServiceContainer

### Adding a New Merge Strategy

1. Create a class implementing `IMergeStrategy` in `src/strategies/`
2. Pass it to `new MergeStrategyRegistry([...existing, new YourStrategy()])` in ServiceContainer

## Testing Guide

- **Unit tests** (`test/unit/`): Use `vi.mock('vscode', ...)` — no VS Code process needed. Run with `pnpm test`.
- **Integration tests** (`test/integration/`): Require a real VS Code (electron) instance. Run with `pnpm test:integration` (needs display server on Linux: `xvfb-run`).
- **Test services**: Use `createTestServices(ctx, { readers: [mockReader] })` to inject mocks into `UpdateOrchestrator` without touching singletons.
- **Reset singletons** between tests: `Logger.reset()`, `StatusBarController.reset()`.
