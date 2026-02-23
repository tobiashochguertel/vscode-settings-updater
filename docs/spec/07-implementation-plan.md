# 07 — Implementation Plan

## Tech Stack

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Language | TypeScript 5.x | Required for VS Code extensions |
| Bundler | esbuild | Standard, fast, recommended by VS Code docs |
| Package manager | pnpm | Fast, disk-efficient |
| VS Code API | `@types/vscode` | Official type definitions |
| HTTP client | `ofetch` | Same as antfu's extension; lightweight, universal |
| JSONC parser | `jsonc-parser` (VS Code's own) | Battle-tested, handles comments + trailing commas |
| Linter | ESLint + `@typescript-eslint` | Standard TS linting |
| Formatter | Prettier | Standard formatting |
| Extension packaging | `@vscode/vsce` | Official extension publisher tool |
| Testing | Vitest (unit) + `@vscode/test-electron` (integration) | Unit tests don't need VS Code; integration tests do |
| Task runner | Taskfile.yml | Consistent with other tools in this ecosystem |

---

## Repository Structure

```
vscode-settings-updater/
├── src/
│   ├── index.ts              # Extension entry point (activate / deactivate)
│   ├── config.ts             # Read extension settings (getConfig helper)
│   ├── sources/
│   │   ├── types.ts          # Source, SourceState, ParsedSettings interfaces
│   │   ├── resolver.ts       # URL shorthand → raw URL resolution
│   │   ├── fetcher.ts        # HTTP fetch with timeout + caching
│   │   ├── localWatcher.ts   # FileSystemWatcher for local file sources
│   │   └── parser.ts         # jsonc-block and jsonc-file parsers
│   ├── merge.ts              # replace / merge-deep / merge-shallow strategies
│   ├── state.ts              # globalState read/write (SourceState persistence)
│   ├── apply.ts              # Apply a source: merge + write + cleanup tracked keys
│   ├── lifecycle.ts          # Startup check, polling timers, orchestration
│   ├── commands.ts           # All command registrations
│   ├── statusBar.ts          # Status bar item management
│   ├── logger.ts             # Output channel wrapper
│   └── constants.ts          # Extension ID, default values
├── test/
│   ├── unit/
│   │   ├── resolver.test.ts  # URL resolution logic
│   │   ├── parser.test.ts    # Both parsers with fixture files
│   │   ├── merge.test.ts     # All three merge strategies
│   │   └── state.test.ts     # State serialization
│   └── integration/          # VS Code integration tests (optional phase 2)
├── fixtures/
│   ├── file-nesting-readme.md   # Sample upstream README with jsonc block
│   └── settings-overlay.jsonc   # Sample raw jsonc settings file
├── .vscode/
│   └── launch.json           # Debug configuration (Extension Host)
├── .github/
│   └── workflows/
│       ├── ci.yml            # Lint + unit tests on push/PR
│       └── release.yml       # Package + publish to VS Code Marketplace on tag
├── docs/
│   └── spec/                 # This specification (copied from design session)
├── package.json              # Extension manifest + npm scripts
├── tsconfig.json             # TypeScript config
├── esbuild.mjs               # Build script
├── .eslintrc.json
├── .prettierrc
├── Taskfile.yml
└── README.md
```

---

## `package.json` Manifest Skeleton

```json
{
  "name": "vscode-settings-updater",
  "displayName": "VS Code Settings Updater",
  "description": "Sync settings.json keys from local jsonc files or Git repos, with configurable merge strategies",
  "version": "0.1.0",
  "publisher": "tobiashochguertel",
  "preview": true,
  "engines": { "vscode": "^1.85.0" },
  "categories": ["Other"],
  "activationEvents": ["onStartupFinished"],
  "main": "./dist/index.js",
  "contributes": {
    "commands": [ /* see 06-commands.md */ ],
    "configuration": { /* see 02-configuration-schema.md */ }
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "@vscode/vsce": "^3",
    "esbuild": "^0.21",
    "typescript": "^5",
    "eslint": "^9",
    "@typescript-eslint/eslint-plugin": "^7",
    "prettier": "^3",
    "vitest": "^1"
  },
  "dependencies": {
    "ofetch": "^1",
    "jsonc-parser": "^3"
  }
}
```

---

## Build Scripts (`package.json` scripts)

```json
{
  "scripts": {
    "build":   "node esbuild.mjs",
    "watch":   "node esbuild.mjs --watch",
    "lint":    "eslint src --ext .ts",
    "format":  "prettier --write src",
    "test":    "vitest run",
    "package": "vsce package",
    "publish": "vsce publish"
  }
}
```

---

## Taskfile.yml Tasks

```yaml
tasks:
  build:     Build extension with esbuild
  watch:     Watch mode (rebuild on change)
  lint:      ESLint check
  format:    Prettier format
  test:      Run Vitest unit tests
  debug:     Open VS Code Extension Host for debugging
  package:   Create .vsix package
  publish:   Publish to VS Code Marketplace
  install-local:  Install .vsix into local VS Code
```

---

## Implementation Phases

### Phase 1 — Core (MVP)
- [ ] Scaffold repo (package.json, tsconfig, esbuild, ESLint, Prettier)
- [ ] `config.ts` — read `settingsUpdater.*` settings
- [ ] `sources/types.ts` — Source and SourceState interfaces
- [ ] `sources/resolver.ts` — URL shorthand resolution (github/codeberg/gitlab/gitea/https)
- [ ] `sources/parser.ts` — `jsonc-block` and `jsonc-file` parsers
- [ ] `sources/fetcher.ts` — HTTP fetch with timeout
- [ ] `merge.ts` — replace, merge-shallow, merge-deep
- [ ] `state.ts` — globalState persistence
- [ ] `apply.ts` — apply one source (merge + write + cleanup)
- [ ] `lifecycle.ts` — startup check + polling
- [ ] `index.ts` — activate/deactivate
- [ ] `commands.ts` — `updateAll` and `showLog` (minimum viable commands)
- [ ] `logger.ts` — output channel
- [ ] Unit tests for resolver, parser, merge

### Phase 2 — Full Feature Set
- [ ] `sources/localWatcher.ts` — FileSystemWatcher for local file sources
- [ ] `statusBar.ts` — status bar item
- [ ] Remaining commands: `updateSource`, `disableSource`, `enableSource`, `openConfig`, `showStatus`
- [ ] Integration tests
- [ ] `release.yml` — GitHub Actions CI + publish workflow

### Phase 3 — Polish
- [ ] WebView status panel for `showStatus` command
- [ ] `settingsUpdater.giteaBaseUrl` support
- [ ] README documentation
- [ ] VS Code Marketplace listing assets (icon, banner)
