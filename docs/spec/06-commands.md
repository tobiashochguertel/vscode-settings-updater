# 06 — VS Code Commands

All commands are contributed under the `settingsUpdater` category and appear in the Command
Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) prefixed with **"Settings Updater: "**.

---

## Command List

### `settingsUpdater.updateAll`
**Title:** Settings Updater: Update all sources now

Immediately re-fetches all enabled remote sources (ignoring interval) and re-reads all enabled
local file sources, then runs the prompt+apply flow for any source where content changed.

Useful when you want to force a sync without waiting for the next polling cycle.

---

### `settingsUpdater.updateSource`
**Title:** Settings Updater: Update source…

Shows a Quick Pick list of all enabled sources. The user selects one, and the extension
immediately fetches/reads and applies that single source (with prompt).

---

### `settingsUpdater.disableSource`
**Title:** Settings Updater: Disable source…

Shows a Quick Pick list of all **enabled** sources. Selecting one sets `"enabled": false` for
that source in `settings.json`. The extension does **not** revert any settings it previously
applied from that source — it only stops future updates.

---

### `settingsUpdater.enableSource`
**Title:** Settings Updater: Enable source…

Shows a Quick Pick list of all **disabled** sources. Selecting one sets `"enabled": true` and
immediately runs an update for that source.

---

### `settingsUpdater.showLog`
**Title:** Settings Updater: Show update log

Opens the extension's **Output Channel** (`Settings Updater`) in the VS Code Output panel.
The log contains timestamped entries for:
- Each fetch attempt (source name, URL, status)
- Content hash comparison result (changed / unchanged)
- Keys written / removed per apply cycle
- Errors and warnings

---

### `settingsUpdater.openConfig`
**Title:** Settings Updater: Open extension configuration

Opens the user `settings.json` and scrolls to the `settingsUpdater` section.
Equivalent to `workbench.action.openSettingsJson` + scroll, implemented via
`vscode.workspace.openTextDocument` + `vscode.window.showTextDocument` + reveal range.

---

### `settingsUpdater.showStatus`
**Title:** Settings Updater: Show source status

Opens a VS Code **WebView panel** (or Quick Pick information list) showing for each source:

| Source | Status | Last checked | Last changed | Keys managed |
|--------|--------|-------------|--------------|--------------|
| File Nesting (antfu) | ✅ up-to-date | 2 hours ago | 3 days ago | 1 |
| Personal overrides | ✅ applied | on startup | on startup | 1 |
| Team settings | ⚠️ fetch failed | 30 min ago | — | 0 |
| Experimental (disabled) | ⏸ disabled | — | — | 0 |

---

## Status Bar Item

The extension contributes a subtle status bar item (right side, low priority):

- **Normal:** `$(sync) Settings Updater` — click opens `settingsUpdater.showStatus`
- **Updating:** `$(sync~spin) Settings Updater` — shown during active fetch/apply
- **Error:** `$(warning) Settings Updater` — one or more sources have errors; click opens log

---

## Command Registration Summary

| Command ID | Palette title | When visible |
|-----------|---------------|-------------|
| `settingsUpdater.updateAll` | Update all sources now | Always |
| `settingsUpdater.updateSource` | Update source… | When ≥1 enabled source exists |
| `settingsUpdater.disableSource` | Disable source… | When ≥1 enabled source exists |
| `settingsUpdater.enableSource` | Enable source… | When ≥1 disabled source exists |
| `settingsUpdater.showLog` | Show update log | Always |
| `settingsUpdater.openConfig` | Open extension configuration | Always |
| `settingsUpdater.showStatus` | Show source status | Always |
