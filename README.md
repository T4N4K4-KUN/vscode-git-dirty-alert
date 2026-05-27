# Git Simple Alert

Git Simple Alert is a small VS Code extension for people who want Git state changes to be harder to miss.

VS Code already shows Git status in the status bar. This extension keeps that idea simple, but adds a colored alert for uncommitted changes and branch divergence.

## Features

- Persistent status bar icon for quick access
- Colored alerts for `ahead`, `behind`, and `uncommitted`
- Alert text shows `A/B/U` counts only when something needs attention
- Tooltip shows totals and per-repository details
- Click the status bar item to watch remote, open Source Control, or open settings
- Optional remote fetch polling for detecting `behind`
- Short manual watch mode for moments when you expect a remote update soon

## Status Bar

Normal state:

```text
$(sync-ignored)
```

Alert state:

```text
$(sync-ignored) A:0 B:1 U:0
```

`A` means ahead, `B` means behind, and `U` means uncommitted.

## Commands

- `Git Simple Alert: Watch Remote Now`
- `Git Simple Alert: Open Source Control`
- `Git Simple Alert: Open Settings`

## Settings

- `gitSimpleAlert.pollingSeconds` (default: 30, min: 10)
- `gitSimpleAlert.fetchIntervalSeconds` (default: 60, min: 15)
- `gitSimpleAlert.watchDurationSeconds` (default: 60, min: 15)
- `gitSimpleAlert.watchFetchIntervalSeconds` (default: 10, min: 5)
- `gitSimpleAlert.watchCooldownSeconds` (default: 15, min: 5)
- `gitSimpleAlert.includeUntracked` (default: false)
- `gitSimpleAlert.applyColorCustomizations` (default: true)
- `gitSimpleAlert.debug` (default: false)
- `gitSimpleAlert.tiers` (tier rules and colors)

## Remote Checks

`behind` detection depends on local remote-tracking refs. VS Code's `git.autofetch` can update those refs, and Git Simple Alert can also run its own lightweight fetch:

```text
git fetch --no-tags --quiet
```

Use `Watch Remote Now` when you expect someone to push soon. It temporarily fetches more frequently without making aggressive fetch intervals the normal behavior.

## Development Install

Package locally and install the generated VSIX:

```powershell
npx @vscode/vsce package
```

Then use VS Code's Extensions view: `... > Install from VSIX`.
