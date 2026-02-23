# VS Code Settings Updater

> Sync `settings.json` keys from local jsonc files or Git repositories, with configurable merge strategies.

**Status:** Preview / Work in Progress

## Features

- **Multiple sources** — local `.jsonc` files or Git repos (GitHub, Codeberg, GitLab, Gitea, private)
- **Configurable merge** — `replace`, `merge-shallow`, or `merge-deep` per source
- **Auto-updates** — checks on startup and polls on a configurable interval
- **Tracks and cleans up** — keys removed from a source are removed from your settings
- **Generalises antfu/vscode-file-nesting-config** — works with any `settings.json` key

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

## Documentation

See [docs/spec/](docs/spec/) for the full software specification.

## Commands

| Command | Description |
|---------|-------------|
| `Settings Updater: Update all sources now` | Force re-fetch and apply all sources |
| `Settings Updater: Show update log` | Open the output channel log |
| `Settings Updater: Open extension configuration` | Jump to settings |

## License

MIT
