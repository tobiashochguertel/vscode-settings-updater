# 01 — Overview

## Problem Statement

VS Code's `settings.json` is the central configuration file for the editor and all extensions.
Many community projects maintain opinionated configurations for specific settings — the most
prominent example being [antfu/vscode-file-nesting-config](https://github.com/antfu/vscode-file-nesting-config),
which maintains a community-curated set of `explorer.fileNesting.patterns`.

The **antfu.file-nesting-updater** extension automates syncing this one community config into your
`settings.json`. But the concept is entirely general:

- A developer team could maintain a shared `settings.json` overlay in a Git repo
- A user could maintain personal `.jsonc` files for different categories of settings
- A project could auto-update recommended linter or formatter settings from a central source

Today, every such use-case either requires a manual copy-paste workflow or a custom script.

## Goal

Build a **generalised settings updater extension** for VS Code that:

1. Reads settings from **one or more sources** (local `.jsonc` files or Git repos)
2. **Merges** them into the global `settings.json` using a configurable strategy
3. **Auto-updates** when sources change (on startup + polling)
4. **Prompts the user** before applying changes
5. **Tracks** what it wrote, and **cleans up** when source keys are removed
6. Works with **any** `settings.json` key — not just file nesting

## Inspiration

The extension is directly inspired by `antfu.file-nesting-updater` and generalises its exact
behaviour:

| Feature | antfu.file-nesting-updater | VS Code Settings Updater |
|---------|---------------------------|--------------------------|
| Source | One hardcoded GitHub repo | Multiple configurable sources |
| Target key | `explorer.fileNesting.patterns` | Any settings.json key |
| Merge | Replace (always) | Per-source: replace / merge-deep / merge-shallow |
| Source format | Markdown with ` ```jsonc ` block | Markdown ` ```jsonc ` block **or** raw `.jsonc`/`.json` |
| Source type | GitHub only | Git repos (any host) + local files |
| Conflict resolution | N/A (single source) | Later source in array wins |
| Key cleanup | Never | Tracks and removes deleted keys |
| Config target | Global only | Global only |
| Prompt | Configurable | Always prompts |

## Non-Goals

- **Workspace-level settings** — the extension only writes to the global user `settings.json`
  (workspace-level merging is handled naturally by VS Code's scoped settings system)
- **Secrets or credentials** — the extension does not handle authentication for private repos
  (private Git repos are supported only if accessible via public URL or local clone)
- **Two-way sync** — the extension is read-only with respect to sources; it never pushes
  changes back to a remote source
- **Schema validation** — the extension does not validate whether a setting key/value is valid
  for the installed VS Code version; it trusts the source

## Publisher and Repository

- **Extension ID:** `tobiashochguertel.vscode-settings-updater`
- **Repository:** `https://github.com/tobiashochguertel/vscode-settings-updater`
- **VS Code Marketplace:** TBD (pre-release initially)
- **Minimum VS Code version:** `^1.85.0`
