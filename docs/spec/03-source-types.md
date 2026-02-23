# 03 — Source Types

## Overview

A source is anything the extension can read settings from. There are two source types:

| Type | Config key | Description |
|------|-----------|-------------|
| **Remote** | `url` | Fetches a file from a Git hosting provider via HTTP |
| **Local** | `file` | Reads a file from the local filesystem |

---

## 1. Remote Sources (`url`)

### URL Shorthand Syntax

```
<host>:<owner>/<repo>@<branch>/<path/to/file>
```

The extension resolves shorthands to raw file URLs:

```typescript
function resolveUrl(url: string, giteaBaseUrl?: string): string {
  // Already a full URL — use as-is
  if (url.startsWith('http://') || url.startsWith('https://')) return url

  const [hostPart, rest] = url.split(':', 2)
  const [repoRef, filePath] = rest.split(/\/(.+)@(.+?)\/(.+)/)
  // ... parse owner, repo, branch, path

  switch (hostPart) {
    case 'github':
      return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`
    case 'codeberg':
      return `https://codeberg.org/${owner}/${repo}/raw/branch/${branch}/${path}`
    case 'gitlab':
      return `https://gitlab.com/${owner}/${repo}/-/raw/${branch}/${path}`
    case 'gitea':
      return `${giteaBaseUrl}/${owner}/${repo}/raw/branch/${branch}/${path}`
    default:
      throw new Error(`Unknown host shorthand: ${hostPart}`)
  }
}
```

### Fetching

- Uses Node.js built-in `https.get` or the `ofetch` library (same as File Nesting Updater)
- No authentication — public URLs only
- Timeout: 10 seconds
- On network error: log warning, skip source for this cycle, do NOT clear previously applied keys

### Caching

The extension stores the last-fetched raw content hash per source in VS Code's
`ExtensionContext.globalState`. This is used to:
1. Detect whether upstream actually changed (avoid re-applying identical content)
2. Track the last successful fetch time (for interval enforcement)

```typescript
interface SourceState {
  lastFetchAt: number          // Unix timestamp ms
  lastContentHash: string      // SHA-256 of raw fetched content
  appliedKeys: string[]        // settings.json keys written by this source
}
```

---

## 2. Local File Sources (`file`)

### Path Resolution

Paths are resolved in this order:
1. If the path starts with `~`, expand to `os.homedir()`
2. If the path is absolute, use as-is
3. If relative and a workspace is open, resolve relative to the first workspace folder root
4. If relative and no workspace is open, resolve relative to the VS Code user data directory

### File Watching

Local file sources are watched with VS Code's `workspace.createFileSystemWatcher`. When the file
changes on disk, the extension re-reads it and applies updates immediately (same apply flow as
remote sources, including the user prompt).

### Error Handling

| Error | Behaviour |
|-------|-----------|
| File not found | Log warning, skip source, do NOT clear previously applied keys |
| Parse error (invalid jsonc) | Show error notification with file path and line number |
| Permission denied | Log error, skip source |

---

## 3. Parsers

Each source specifies (or inherits) one of two parsers:

### `jsonc-block` (default)

Extracts the first ` ```jsonc ` fenced code block from the file content.
Intended for Markdown files (like `antfu/vscode-file-nesting-config`'s `README.md`).

```
Parse flow:
  1. Find first occurrence of ```jsonc\n...\n```
  2. Extract the block content
  3. Strip lines starting with // (comment stripping)
  4. Wrap in {} and JSON.parse()
```

This is identical to the File Nesting Updater's approach, preserving full compatibility.

If no ` ```jsonc ` block is found, the extension logs an error and skips the source.

### `jsonc-file`

Treats the entire file as a JSONC (JSON with Comments) settings object.

```
Parse flow:
  1. Read entire file content
  2. Strip // and /* */ comments
  3. JSON.parse() the result
  4. Expect the root to be a JSON object { [key: string]: unknown }
```

The root object keys are treated as `settings.json` keys.

Example valid `jsonc-file`:
```jsonc
// Personal file nesting overrides
{
  "explorer.fileNesting.patterns": {
    "mise.toml": ".mise.toml, *.mise.toml, mise.local.toml"
  },
  "editor.fontSize": 14
}
```

---

## 4. Source Evaluation Order

Sources in `settingsUpdater.sources` are evaluated **in array order** (index 0 first).

When multiple sources provide values for the same settings key, **the last source wins**
(later index overrides earlier). This means:

```jsonc
"settingsUpdater.sources": [
  { "name": "Community", "url": "github:...",  "targetKey": "explorer.fileNesting.patterns" },
  { "name": "Personal",  "file": "~/...",      "targetKey": "explorer.fileNesting.patterns" }
]
```

`Personal` (index 1) values override `Community` (index 0) values for the same sub-key when
using `merge-deep` or `merge-shallow`. With `replace`, the personal source completely replaces
whatever the community source wrote.
