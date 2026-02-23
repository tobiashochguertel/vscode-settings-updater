# VS Code Settings Updater

> Sync any `settings.json` key from local files or Git repos — with configurable merge strategies.

Keep your VS Code settings in sync with community configs, team overlays, and personal overrides — automatically, across machines.

---

## Why

`settings.json` drifts. Community projects like [antfu/vscode-file-nesting-config](https://github.com/antfu/vscode-file-nesting-config) maintain curated settings you want to track, but copying them manually doesn't scale. Teams need shared editor configs. Power users maintain multiple personal overlays.

This extension generalises the concept: pull settings from **any source**, merge them **your way**, and keep them **up to date** automatically.

---

## Features

- 🔗 **Multiple sources** — local `.jsonc` files or remote Git repos (GitHub, Codeberg, GitLab, Gitea)
- 🔀 **Configurable merge** — `replace`, `merge-shallow`, or `merge-deep` per source
- ⏱ **Auto-updates** — checks on startup and polls on a configurable interval
- 🧹 **Key tracking and cleanup** — keys removed from a source are removed from your settings
- 💬 **User prompt** — always asks before applying changes
- 📋 **Output log** — timestamped fetch, apply, and error history
- 🔔 **Status bar** — at-a-glance sync state

---

## Quick Start

Install the extension, then add to your `settings.json`:

```jsonc
{
  "settingsUpdater.sources": [
    {
      "name": "File Nesting (antfu community)",
      "url": "github:antfu/vscode-file-nesting-config@main/README.md",
      "parser": "jsonc-block",
      "targetKey": "explorer.fileNesting.patterns",
      "mergeStrategy": "replace"
    }
  ]
}
```

On next startup (or by running **Settings Updater: Update all sources now**), the extension fetches the file, extracts the `jsonc` code block, and prompts you to apply the `explorer.fileNesting.patterns` key to your global `settings.json`.

---

## Configuration Reference

### Top-level settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `settingsUpdater.autoUpdateInterval` | `number` (minutes) | `720` | How often to poll remote sources. Per-source `updateInterval` overrides this. |
| `settingsUpdater.defaultParser` | `"jsonc-block" \| "jsonc-file"` | `"jsonc-block"` | Global default parser. `jsonc-block` extracts the first ` ```jsonc ` fence from a Markdown file; `jsonc-file` treats the file as a raw `.jsonc`/`.json` settings object. |
| `settingsUpdater.giteaBaseUrl` | `string` | — | Base URL for self-hosted Gitea/Forgejo instances (required when using the `gitea:` shorthand). |
| `settingsUpdater.sources` | `Source[]` | `[]` | Ordered list of sources. Later entries override earlier ones for the same key. |

### Source object properties

| Property | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `name` | `string` | — | **Yes** | Human-readable label shown in prompts and logs. |
| `enabled` | `boolean` | `true` | No | Set to `false` to skip without removing the config entry. |
| `url` | `string` | — | One of `url`/`file` | Remote file URL or shorthand (see [URL Shorthand Reference](#url-shorthand-reference)). |
| `file` | `string` | — | One of `url`/`file` | Local file path. Supports `~` and workspace-relative paths. |
| `parser` | `"jsonc-block" \| "jsonc-file"` | global default | No | Per-source parser override. |
| `targetKey` | `string \| null` | `null` | No | Restrict this source to a single settings key. If `null`, all keys in the parsed object are applied. |
| `mergeStrategy` | `"replace" \| "merge-shallow" \| "merge-deep"` | `"replace"` | No | How to merge the source's values into `settings.json`. |
| `updateInterval` | `number` (minutes) | global default | No | Per-source polling interval override (remote sources only). |

---

## URL Shorthand Reference

| Shorthand | Resolved to |
|-----------|-------------|
| `github:owner/repo@branch/path` | `https://raw.githubusercontent.com/owner/repo/branch/path` |
| `codeberg:owner/repo@branch/path` | `https://codeberg.org/owner/repo/raw/branch/path` |
| `gitlab:owner/repo@branch/path` | `https://gitlab.com/owner/repo/-/raw/branch/path` |
| `gitea:owner/repo@branch/path` | Requires `settingsUpdater.giteaBaseUrl` to be set |

Full URLs (`https://...`) are also accepted and used as-is.

---

## Merge Strategies

### `replace` (default)
The source value **completely replaces** the existing value. Keys present in the existing settings but absent from the source are removed. Best for community-maintained lists where the source is the authoritative definition.

### `merge-shallow`
Only top-level keys from the source are written. Existing keys not present in the source are preserved. Best for personal overrides applied on top of a base layer.

### `merge-deep`
Recursively merges objects. Arrays are concatenated (source appended after existing). Primitives are replaced by the source value. Best for team overlays that should layer on top of personal settings without overwriting them.

---

## Commands

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and type **Settings Updater**:

| Command ID | Palette title | Description |
|-----------|---------------|-------------|
| `settingsUpdater.updateAll` | Settings Updater: Update all sources now | Re-fetches all enabled sources and applies any changes. |
| `settingsUpdater.updateSource` | Settings Updater: Update source… | Quick Pick to update a single source immediately. |
| `settingsUpdater.disableSource` | Settings Updater: Disable source… | Quick Pick to set `enabled: false` on a source. |
| `settingsUpdater.enableSource` | Settings Updater: Enable source… | Quick Pick to re-enable a disabled source and apply it. |
| `settingsUpdater.showLog` | Settings Updater: Show update log | Opens the Output Channel with timestamped fetch/apply history. |
| `settingsUpdater.openConfig` | Settings Updater: Open extension configuration | Opens `settings.json` scrolled to the `settingsUpdater` section. |
| `settingsUpdater.showStatus` | Settings Updater: Show source status | Shows per-source status: last checked, last changed, keys managed. |

---

## Status Bar

A subtle item appears on the right side of the VS Code status bar:

| State | Appearance | Click action |
|-------|------------|--------------|
| Idle | `$(sync) Settings Updater` | Opens source status |
| Updating | `$(sync~spin) Settings Updater` | — |
| Error | `$(warning) Settings Updater` | Opens update log |

---

## Inspiration

This extension is directly inspired by [antfu/vscode-file-nesting-config](https://github.com/antfu/vscode-file-nesting-config) and the companion [antfu.file-nesting-updater](https://marketplace.visualstudio.com/items?itemName=antfu.file-nesting-updater) extension. VS Code Settings Updater generalises that exact pattern to work with any settings key, any source, and any merge strategy.

---

## License

MIT
