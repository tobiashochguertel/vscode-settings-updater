# 02 — Configuration Schema

All extension configuration lives under the `settingsUpdater` namespace in `settings.json`.

## Top-Level Properties

```jsonc
{
  // Global default for how remote sources check for updates.
  // Per-source `updateInterval` overrides this.
  "settingsUpdater.autoUpdateInterval": 720, // minutes (default: 12 hours)

  // Global default parser strategy when a source does not specify one.
  // "jsonc-block" = extract first ```jsonc block from a Markdown file (like antfu updater)
  // "jsonc-file"  = treat the fetched/read file as a raw .jsonc or .json settings object
  "settingsUpdater.defaultParser": "jsonc-block",

  // The ordered list of sources. Later entries override earlier ones for the same key.
  "settingsUpdater.sources": [ /* see Source Object below */ ]
}
```

---

## Source Object Schema

Each element of `settingsUpdater.sources` is a **Source Object**:

```jsonc
{
  // ----- Identity -----

  // Human-readable name shown in prompts and logs.
  "name": "File Nesting (antfu community)",

  // Whether this source is active. Set to false to skip without removing the config.
  // Default: true
  "enabled": true,

  // ----- Where to read from -----

  // Mutually exclusive: use EITHER "url" OR "file", not both.

  // Remote Git repo shorthand: "host:owner/repo@branch/path/to/file"
  // Supported hosts: github (default), codeberg, gitlab, gitea, or a full base URL.
  // Examples:
  //   "github:antfu/vscode-file-nesting-config@main/README.md"
  //   "codeberg:username/repo@main/settings.jsonc"
  //   "gitlab:username/repo@main/my-settings.jsonc"
  //   "https://mygitea.example.com:owner/repo@main/settings.jsonc"
  //   "https://raw.githubusercontent.com/antfu/vscode-file-nesting-config/main/README.md"
  "url": "github:antfu/vscode-file-nesting-config@main/README.md",

  // Local file path (absolute, or relative to VS Code's workspace root if a workspace is open).
  // Supports ~ for home directory expansion.
  "file": "~/.config/vscode/my-personal-settings.jsonc",

  // ----- How to parse the file -----

  // Override the global defaultParser for this source.
  // "jsonc-block" = extract first ```jsonc code fence from a Markdown file
  // "jsonc-file"  = treat file as a raw jsonc/json settings object
  // Default: inherits "settingsUpdater.defaultParser"
  "parser": "jsonc-block",

  // ----- What to write -----

  // Optional: restrict this source to only update a single settings.json key.
  // If omitted, all keys present in the parsed object are applied.
  // Example: "explorer.fileNesting.patterns"
  "targetKey": null,

  // How to merge this source's value with the existing settings.json value.
  // "replace"       = completely replace the existing value
  // "merge-deep"    = recursively merge objects, concatenate arrays, replace primitives
  // "merge-shallow" = only merge top-level keys; existing sub-keys not in source are kept
  // Default: "replace"
  "mergeStrategy": "replace",

  // ----- When to check for updates (remote sources only) -----

  // Override global autoUpdateInterval for this source (in minutes).
  // Default: inherits "settingsUpdater.autoUpdateInterval"
  "updateInterval": 720
}
```

---

## Full Annotated Example

```jsonc
{
  "settingsUpdater.autoUpdateInterval": 720,
  "settingsUpdater.defaultParser": "jsonc-block",

  "settingsUpdater.sources": [
    // Source 1 — community file nesting patterns (read from antfu's README.md jsonc block)
    {
      "name": "File Nesting (antfu community)",
      "url": "github:antfu/vscode-file-nesting-config@main/README.md",
      "parser": "jsonc-block",
      "targetKey": "explorer.fileNesting.patterns",
      "mergeStrategy": "replace",
      "updateInterval": 660
    },

    // Source 2 — personal overrides loaded from a local file.
    // Runs after Source 1, so personal keys win over community keys.
    {
      "name": "Personal file nesting overrides",
      "file": "~/.config/vscode/file-nesting-personal.jsonc",
      "parser": "jsonc-file",
      "targetKey": "explorer.fileNesting.patterns",
      "mergeStrategy": "merge-shallow"
    },

    // Source 3 — full settings overlay from a team repo (raw jsonc file, no Markdown wrapper)
    {
      "name": "Team shared settings",
      "url": "github:my-org/team-vscode-settings@main/settings.jsonc",
      "parser": "jsonc-file",
      "mergeStrategy": "merge-deep",
      "updateInterval": 1440
    },

    // Source 4 — disabled; kept for reference without being applied
    {
      "name": "Experimental theme settings",
      "file": "~/.config/vscode/theme-experiment.jsonc",
      "parser": "jsonc-file",
      "mergeStrategy": "replace",
      "enabled": false
    }
  ]
}
```

---

## Configuration Properties Reference

| Property | Type | Default | Required |
|----------|------|---------|----------|
| `settingsUpdater.autoUpdateInterval` | `number` (minutes) | `720` | No |
| `settingsUpdater.defaultParser` | `"jsonc-block" \| "jsonc-file"` | `"jsonc-block"` | No |
| `settingsUpdater.sources` | `Source[]` | `[]` | No |
| `source.name` | `string` | — | **Yes** |
| `source.enabled` | `boolean` | `true` | No |
| `source.url` | `string` | — | One of url/file |
| `source.file` | `string` | — | One of url/file |
| `source.parser` | `"jsonc-block" \| "jsonc-file"` | global default | No |
| `source.targetKey` | `string \| null` | `null` (all keys) | No |
| `source.mergeStrategy` | `"replace" \| "merge-deep" \| "merge-shallow"` | `"replace"` | No |
| `source.updateInterval` | `number` (minutes) | global default | No |

---

## URL Resolution Rules

| Pattern | Resolved to |
|---------|-------------|
| `github:owner/repo@branch/path` | `https://raw.githubusercontent.com/owner/repo/branch/path` |
| `codeberg:owner/repo@branch/path` | `https://codeberg.org/owner/repo/raw/branch/path` |
| `gitlab:owner/repo@branch/path` | `https://gitlab.com/owner/repo/-/raw/branch/path` |
| `gitea:owner/repo@branch/path` | Requires `settingsUpdater.giteaBaseUrl` to be set |
| `https://...` | Used as-is |

For self-hosted Gitea/Forgejo instances, set:
```jsonc
"settingsUpdater.giteaBaseUrl": "https://mygitea.example.com"
```
