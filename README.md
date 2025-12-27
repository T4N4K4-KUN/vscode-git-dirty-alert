# vscode-git-dirty-alert

Show a status bar alert in VSCode for remote divergence and uncommitted changes.

## Features
- Tiered status bar alerts for `ahead`, `behind`, and `uncommitted`
- Highest-priority tier color is shown in the status bar
- Tooltip shows all three counts per repo
- Click the badge to open Source Control
- Polling interval is configurable

## Usage
1. Open this folder in VSCode.
2. Press F5 to run the extension in an Extension Development Host.
3. Make a change in a git repo to see the badge.

## Settings
- `gitDirtyAlert.pollingSeconds` (default: 60, min: 10, recommended: 60+)
- `gitDirtyAlert.includeUntracked` (default: false)
- `gitDirtyAlert.applyColorCustomizations` (default: true)
- `gitDirtyAlert.tiers` (tier rules and colors)

### Tiers
Each tier chooses alert types and colors. The highest tier that matches is used.

Default:
```json
{
  "gitDirtyAlert.tiers": {
    "tier1": {
      "types": ["ahead", "uncommitted"],
      "backgroundColor": "statusBarItem.errorBackground",
      "foregroundColor": "statusBarItem.errorForeground"
    },
    "tier2": {
      "types": ["behind"],
      "backgroundColor": "statusBarItem.warningBackground",
      "foregroundColor": "statusBarItem.warningForeground"
    },
    "tier3": {
      "types": [],
      "backgroundColor": "statusBarItem.warningBackground",
      "foregroundColor": "statusBarItem.warningForeground"
    }
  }
}
```

## Command
- `Git Dirty Alert: Open Source Control`
- `Git Dirty Alert: Open Settings`

## Settings Screen
Open Command Palette and run `Git Dirty Alert: Open Settings` to edit tiers and colors.

## Debug
- Open Settings and enable `gitDirtyAlert.debug`
- Open `View > Output` and select `Git Dirty Alert`
- Edit a file to see log lines like `git status in <path>: <N> changes`

## Install
- Run `cmd /c "set PATH=C:\\Program Files\\nodejs;%APPDATA%\\npm;%PATH% && vsce package"`
- In VSCode: Extensions view > ... > Install from VSIX > select `vscode-git-dirty-alert-0.2.0.vsix`
