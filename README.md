# vscode-git-dirty-alert

Show a red status bar indicator in VSCode when your working tree has uncommitted changes.

## Features
- Red status bar badge when dirty (no notifications)
- Click the badge to open Source Control
- Polling interval is configurable

## Usage
1. Open this folder in VSCode.
2. Press F5 to run the extension in an Extension Development Host.
3. Make a change in a git repo to see the badge.

## Settings
- `gitDirtyAlert.pollingSeconds` (default: 120)
- `gitDirtyAlert.includeUntracked` (default: true)

## Command
- `Git Dirty Alert: Open Source Control`

## Debug
- Open Settings and enable `gitDirtyAlert.debug`
- Open `View > Output` and select `Git Dirty Alert`
- Edit a file to see log lines like `git status in <path>: <N> changes`

