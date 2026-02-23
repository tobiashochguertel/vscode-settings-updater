# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [0.1.0] — Initial release

### Added

- Multi-source settings sync: pull `settings.json` keys from multiple independent sources in a single extension
- Remote Git repo sources via URL shorthands: `github:`, `codeberg:`, `gitlab:`, `gitea:`
- Local file sources with `~` home directory expansion and workspace-relative path support
- `jsonc-block` parser: extracts the first ` ```jsonc ` code fence from a Markdown file (compatible with antfu/vscode-file-nesting-config format)
- `jsonc-file` parser: treats a fetched or local file as a raw `.jsonc`/`.json` settings object
- Merge strategy `replace`: source value completely replaces the existing settings value
- Merge strategy `merge-shallow`: overlays only top-level keys, preserving existing sub-keys not in source
- Merge strategy `merge-deep`: recursively merges objects and concatenates arrays
- `targetKey` option to restrict a source to a single `settings.json` key
- `enabled` flag per source to skip a source without removing its config entry
- `settingsUpdater.autoUpdateInterval` global polling interval (default: 720 minutes)
- Per-source `updateInterval` override for remote sources
- `settingsUpdater.defaultParser` global parser default
- `settingsUpdater.giteaBaseUrl` for self-hosted Gitea/Forgejo instances
- `FileSystemWatcher` for automatic re-application when local file sources change on disk
- Polling loop with per-source interval tracking for remote sources
- First-run silent apply on extension activation (no prompt on very first load)
- User prompt before applying changes showing count of keys that will change
- Key tracking via `ExtensionContext.globalState` recording which keys each source has written
- Automatic cleanup: keys removed from a source are removed from `settings.json` on the next apply cycle
- Multi-source override order: sources applied sequentially; later entries win for the same key
- Status bar item with idle (`$(sync)`), updating (`$(sync~spin)`), and error (`$(warning)`) states
- Command `settingsUpdater.updateAll` — re-fetch and apply all enabled sources
- Command `settingsUpdater.updateSource` — Quick Pick to update a single source
- Command `settingsUpdater.disableSource` — Quick Pick to disable a source
- Command `settingsUpdater.enableSource` — Quick Pick to re-enable a disabled source
- Command `settingsUpdater.showLog` — open the Output Channel log
- Command `settingsUpdater.openConfig` — open `settings.json` at the `settingsUpdater` section
- Command `settingsUpdater.showStatus` — show per-source status panel (last checked, last changed, keys managed)
