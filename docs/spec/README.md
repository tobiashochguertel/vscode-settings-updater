# VS Code Settings Updater — Software Specification

## Overview

This directory contains the software specification for the **VS Code Settings Updater** extension
(`tobiashochguertel/vscode-settings-updater`). It was derived from a design Q&A session on
2026-02-23 and captures all architectural decisions before implementation begins.

## Documents

| File | Contents |
|------|----------|
| [01-overview.md](01-overview.md) | Problem statement, goals, non-goals, inspiration |
| [02-configuration-schema.md](02-configuration-schema.md) | Full `settings.json` configuration schema with annotated examples |
| [03-source-types.md](03-source-types.md) | Local file source and Git repo source — resolvers, parsers, caching |
| [04-merge-strategies.md](04-merge-strategies.md) | Merge behaviour, override order, key-tracking and cleanup |
| [05-update-lifecycle.md](05-update-lifecycle.md) | Startup flow, polling, prompt UX, apply sequence |
| [06-commands.md](06-commands.md) | All VS Code commands contributed by the extension |
| [07-implementation-plan.md](07-implementation-plan.md) | Repository structure, tech stack, scaffolding steps, file layout |

## Design Decisions (summary)

| Topic | Decision |
|-------|----------|
| Sources | Multiple; each can be full overlay or target a specific settings key |
| Merge | Per-source: `replace` / `merge-deep` / `merge-shallow` |
| Source types | Local `.jsonc` files + Git repos (GitHub, Codeberg, GitLab, Gitea, private) |
| Config target | Global `settings.json` only |
| Extension config | `settingsUpdater.*` keys in `settings.json` |
| Conflict resolution | Sources ordered in array; last writer wins for same key |
| Update trigger | On startup + configurable polling interval |
| User prompt | Always prompt; notification only ("N settings will change") |
| File parser | Default: extract ` ```jsonc ` block; per-source override for raw `.jsonc`/`.json`; global default configurable |
| Key cleanup | Keys removed from source are removed from `settings.json` (tracked) |
| Commands | Update all, Enable/Disable source, Show log, Open source config |
| Tech stack | TypeScript, vsce, esbuild |
| Repository | `tobiashochguertel/vscode-settings-updater` |
