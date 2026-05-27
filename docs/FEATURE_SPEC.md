# Feature Spec

This document captures product and behavior decisions for the first public release.

## Product Name

Use `Git Simple Alert`.

Rationale:

- The extension is not only about dirty working trees.
- The value is a simple, visible alert for Git states that are easy to miss.
- The name is clearer for Marketplace users than the current working name.

Package naming target:

- `name`: `git-simple-alert`
- `displayName`: `Git Simple Alert`

User-facing positioning:

```text
Git Simple Alert is a small VS Code extension for people who want Git state changes to be harder to miss.

VS Code already shows Git status in the status bar. This extension keeps that idea simple, but adds a colored alert for uncommitted changes and branch divergence.
```

## Core Scope

First public release scope:

- Show a persistent status bar item.
- Alert for current-branch Git states:
  - `ahead`
  - `behind`
  - `uncommitted`
- Use color only when there is an alert.
- Keep the normal state quiet.
- Provide a click menu for common actions.
- Support optional remote refresh through a manual watch mode.

Out of scope for the first public release:

- Watching every branch.
- Showing full branch graphs.
- Replacing VS Code's built-in Git sync UI.
- Automatically resolving divergence.

Possible future scope:

- Default branch watch.
- User-configured watched branches.
- More detailed branch-level tooltip sections.

## Status Bar Behavior

The status bar item should always be visible when a workspace is open.

Normal state:

```text
$(sync-ignored)
```

Rules:

- No `A/B/U` numbers in normal state.
- No alert background color in normal state.
- Tooltip explains the product name and available click actions.

Normal tooltip:

```text
Git Simple Alert

No alerts.
Click to watch remote or open Source Control.
```

Alert state:

```text
$(sync-ignored) A:0 B:1 U:0
```

Rules:

- Show `A/B/U` numbers only when at least one alert type is active.
- Apply the selected tier color only in alert state.
- Tooltip includes totals and per-repository details.

Alert tooltip:

```text
Git Simple Alert

Ahead: 0  Behind: 1  Uncommitted: 0

[repo-name] A:0 B:1 U:0

Click for actions.
```

No-workspace behavior:

- Hide the item when there is no workspace folder.

Non-Git folder behavior:

- Ignore non-Git folders quietly.
- Do not show noisy errors for folders that are not Git repositories.

## Click Behavior

Clicking the status bar item should open a QuickPick instead of directly opening Source Control.

QuickPick actions:

- `Watch Remote Now`
- `Open Source Control`
- `Open Git Simple Alert Settings`

Rationale:

- The extension needs both "open SCM" and "check remote now" entry points.
- A QuickPick preserves the old Source Control action while adding manual remote watch.
- The visible status bar item becomes the single lightweight control surface.

Commands:

- `gitSimpleAlert.watchRemoteNow`
- `gitSimpleAlert.openScm`
- `gitSimpleAlert.openSettings`

## Remote Refresh Model

The extension should distinguish local status polling from remote refresh.

Local polling:

- Checks local dirty state and current branch ahead/behind using local Git refs.
- Runs at `gitSimpleAlert.pollingSeconds`.
- Default: `30`
- Minimum: `10`

Remote fetch:

- Uses `git fetch --no-tags --quiet`.
- Updates remote-tracking refs so `behind` can be detected.
- Must not run concurrently for the same repository.
- Must tolerate network or authentication failures without notification spam.
- Failures should be logged to debug output when debug is enabled.

Normal remote fetch interval:

- Setting: `gitSimpleAlert.fetchIntervalSeconds`
- Default: `60`
- Minimum: `15`

## Manual Watch Mode

Manual watch mode is a short burst of more frequent remote fetches.

Trigger:

- User selects `Watch Remote Now` from the status bar QuickPick.

Default behavior:

- Start a 60-second watch window.
- Fetch every 10 seconds during the watch window.
- Refresh status after fetch.

Settings:

- `gitSimpleAlert.watchDurationSeconds`
  - Default: `60`
  - Minimum: `15`
- `gitSimpleAlert.watchFetchIntervalSeconds`
  - Default: `10`
  - Minimum: `5`
- `gitSimpleAlert.watchCooldownSeconds`
  - Default: `15`
  - Minimum: `5`

Cooldown behavior:

- After a watch window starts, a cooldown prevents repeated manual watch starts.
- Initial cooldown: 15 seconds.
- If the user triggers watch again during cooldown, do not start another watch.
- Consecutive cooldown hits extend the next cooldown:
  - first hit: 30 seconds
  - second hit: 60 seconds
  - third and later hits: keep 60 seconds and do not start extra fetches
- After a successful watch start outside cooldown, reset the cooldown escalation.

Status bar text during watch:

- Keep the normal or alert text unchanged.
- Do not add `Watching` to the status bar text.
- Use the tooltip for watch/cooldown state.

Watch tooltip example:

```text
Git Simple Alert

Watching remote for 42s.
No alerts.

Click for actions.
```

Cooldown tooltip example:

```text
Git Simple Alert

Remote watch cooling down for 12s.
No alerts.

Click for actions.
```

## Branch Scope

First release:

- Alert only for the current branch against its configured upstream.
- This matches Git's standard ahead/behind model and VS Code's sync indicator.

Important limitation:

- Updates on another branch do not count as `behind` for the current branch.
- Example: if the current branch is `feature/a`, a new commit on `master` should not appear as current-branch behind.

Future branch watch:

- Add optional `watchDefaultBranch`.
- Add optional `watchBranches`.
- Keep current-branch alert and watched-branch alert visually distinct.

Possible future tooltip:

```text
Current branch: feature/a
  A:0 B:0 U:0

Watched branches:
  master: behind 1
```

## Interaction With VS Code Git

VS Code already provides Git sync indicators and `git.autofetch`.

Git Simple Alert should be positioned as a visual complement:

- It does not replace VS Code's Git UI.
- It makes selected Git states harder to miss.
- It can fetch on its own schedule if configured.
- It offers manual watch mode for short periods where the user expects remote changes soon.

README should explain:

- `behind` detection depends on remote-tracking refs.
- VS Code `git.autofetch` can also update those refs.
- Git Simple Alert's own fetch settings can make behind alerts appear without relying on VS Code autofetch.

## Settings Prefix

Rename settings from `gitDirtyAlert.*` to `gitSimpleAlert.*` before Marketplace publication.

Migration:

- Since the extension has not been published to Marketplace, a breaking settings rename is acceptable.
- Local VSIX users may need to update settings manually.

## Implementation Notes

- Keep the status bar item visible in normal state.
- Replace direct click command with QuickPick action command.
- Add a fetch scheduler with per-repository state:
  - `lastFetchAt`
  - `fetchInProgress`
  - `watchUntil`
  - `cooldownUntil`
  - `cooldownHitCount`
- Avoid concurrent fetches for the same folder.
- Add timeout handling for Git commands.
- Keep debug logging useful but quiet by default.
