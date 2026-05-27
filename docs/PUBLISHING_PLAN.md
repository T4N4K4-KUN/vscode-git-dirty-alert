# Publishing Plan

This document defines the finishing plan for publishing Git Dirty Alert as:

- a public GitHub repository
- a Visual Studio Marketplace extension
- an MIT-licensed open source project

## Goals

- Make the repository understandable and trustworthy for VS Code users.
- Publish a reproducible VSIX package to the Visual Studio Marketplace.
- Keep `main` in a releasable state.
- Support Windows, macOS, and Linux without OS-specific builds.

## Non-Goals

- Rewriting the extension in TypeScript before first publication.
- Building a complex release automation pipeline before the first release.
- Shipping separate Windows/macOS/Linux packages.

## Current Assessment

The extension is already small and packageable, but it is closer to a local VSIX than a public extension. The remaining work is mostly packaging quality, public repository hygiene, validation, and release operations.

Expected effort:

| Scope | Estimate |
| --- | ---: |
| Minimum public release | 1 day |
| Recommended Marketplace release | 2.5-4 days |
| Polished OSS project with CI and screenshots | 4-6 days |

## OS Support Policy

The extension should work on Windows, macOS, and Linux because it uses:

- VS Code extension APIs
- Node.js `child_process.execFile`
- the `git` CLI

No macOS port is expected. The main cross-platform risk is whether VS Code can find `git` in the user's environment, especially on macOS when VS Code is launched from the GUI.

Before release, verify:

- Windows: VS Code can run the extension and find `git`.
- macOS: VS Code can find `git` when launched normally from Finder/Dock.
- Linux: VS Code can find `git` from the desktop launcher or terminal.
- Non-Git folders are ignored without noisy errors.
- Multi-root workspaces tolerate one invalid or non-Git folder.

## Repository Policy

Use a public GitHub repository.

Use `docs/GIT_WORKFLOW.md` for day-to-day branch, pull request, and release operations.

Recommended repository settings:

- `main` is always releasable.
- Changes go through pull requests, even for solo development when practical.
- Tags use `vX.Y.Z`, matching `package.json` versions.
- Generated `.vsix` files are not committed.
- Marketplace release notes and GitHub release notes are based on `CHANGELOG.md`.

Recommended branch names:

- `chore/publish-prep`
- `fix/git-detection`
- `docs/readme-marketplace`
- `release/v0.3.0`

Recommended commit prefixes:

- `feat:`
- `fix:`
- `docs:`
- `test:`
- `chore:`

## License

Use MIT.

Required changes:

- Add `LICENSE` with the MIT License text.
- Add `"license": "MIT"` to `package.json`.
- If external contributions are accepted, keep contributor expectations simple in `CONTRIBUTING.md`.

## Required Repository Files

Add or update:

- `README.md`
- `LICENSE`
- `CHANGELOG.md`
- `.vscodeignore`
- `.github/workflows/ci.yml`
- `.github/ISSUE_TEMPLATE/bug_report.md`
- `.github/ISSUE_TEMPLATE/feature_request.md`
- `SECURITY.md`
- optional: `CONTRIBUTING.md`
- optional: `images/` for Marketplace screenshots

Keep out of the published VSIX:

- generated `.vsix` files
- personal workspace files
- `out/`
- development-only scripts if not needed by users
- internal notes that are not useful to extension users

Review before making the repository public:

- `docs/ai/`
- local workspace files
- generated artifacts
- any screenshots or logs
- any accidental usernames, local paths, tokens, or private project references

## Marketplace Metadata

Update `package.json` with:

- `license`
- `repository`
- `bugs`
- `homepage`
- `keywords`
- `icon`, if an icon is prepared
- `scripts` for test and package commands
- `devDependencies` including `@vscode/vsce`

Review:

- `displayName`
- `description`
- `categories`
- `activationEvents`
- command titles
- configuration descriptions

The Marketplace description should be clear about:

- what the status bar item shows
- what `ahead`, `behind`, and `uncommitted` mean
- whether untracked files are counted by default
- how polling works
- how the extension behaves in multi-root workspaces

## Implementation Hardening

Before the recommended first public release, fix or verify:

- Align default tier settings across `package.json`, `extension.js`, and `README.md`.
- Align `gitDirtyAlert.includeUntracked` defaults across all code paths.
- Reconsider `activationEvents: ["*"]`; use the least broad activation that still gives good UX.
- Handle missing `git` with a user-friendly status or debug message.
- Ignore non-Git folders quietly.
- Prevent overlapping refreshes when polling or file events happen close together.
- Consider a timeout for slow `git status` calls.
- Avoid surprising global `workbench.colorCustomizations` writes, or document and gate them clearly.
- Ensure settings webview validation prevents invalid tier/color states.

## Test Plan

Automated tests:

- `parseAheadBehind`
- tier normalization
- tier selection priority
- display order
- totals formatting
- settings defaults

Manual tests:

- Clean repo: no status bar alert.
- Uncommitted file: alert appears.
- Ahead branch: ahead count appears.
- Behind branch: behind count appears.
- Ahead and behind: both counts appear.
- Multi-root workspace: totals aggregate across repos.
- Non-Git folder: no noisy failure.
- `includeUntracked=false`: untracked files are ignored.
- `includeUntracked=true`: untracked files are counted.
- Settings webview saves and refreshes status.
- Debug output appears only when enabled.

OS matrix:

| OS | Required before release |
| --- | --- |
| Windows | Required |
| macOS | Required |
| Linux | Recommended |

## CI Plan

Initial CI should run on pull requests and pushes to `main`:

- install dependencies
- run tests
- run package validation
- optionally upload the generated VSIX as a workflow artifact

Do not publish automatically in the first release. Manual publishing is safer until the release process is stable.

## Release Process

1. Create a release branch, for example `release/v0.3.0`.
2. Confirm `package.json` version.
3. Update `CHANGELOG.md`.
4. Run tests.
5. Run package validation.
6. Install the generated VSIX locally.
7. Test on Windows.
8. Test on macOS.
9. Merge the release branch to `main`.
10. Tag the commit, for example `v0.3.0`.
11. Publish to the Visual Studio Marketplace.
12. Create a GitHub release using the same tag and changelog notes.

## First Release Checklist

- [ ] Public GitHub repository reviewed for private data.
- [ ] `LICENSE` added with MIT.
- [ ] `package.json` includes `"license": "MIT"`.
- [ ] `README.md` rewritten for users, not only local development.
- [ ] `CHANGELOG.md` added.
- [ ] `.vscodeignore` added.
- [ ] Marketplace metadata completed.
- [ ] Default settings aligned across code, manifest, and README.
- [ ] Missing Git and non-Git folder behavior verified.
- [ ] Windows manual test completed.
- [ ] macOS manual test completed.
- [ ] `vsce package` succeeds without important warnings.
- [ ] VSIX install test completed.
- [ ] Marketplace publisher and token prepared.
- [ ] Git tag created for the release.
- [ ] Marketplace page checked after publishing.

## Suggested Timeline

Day 1:

- Add MIT license and public repository metadata.
- Clean repository contents for public release.
- Align settings defaults.
- Add `.vscodeignore`, `CHANGELOG.md`, and README updates.

Day 2:

- Harden Git detection and non-Git folder handling.
- Add tests for pure logic.
- Add basic CI.
- Package and install VSIX locally.

Day 3:

- Run Windows and macOS validation.
- Fix release blockers.
- Tag and publish.
- Create GitHub release.

## GitHub Public Release Roadmap

Goal: make the repository safe, understandable, and useful as a public OSS project before or alongside the Marketplace release.

Milestone 1: repository cleanup

- Remove generated `.vsix` files from version control if present.
- Keep personal workspace files out of the repository.
- Review `docs/ai/`, logs, screenshots, and generated files for private or misleading content.
- Add or update `.gitignore` for local-only files.
- Add `.vscodeignore` for Marketplace package contents.

Done when:

- A fresh clone contains only source, docs, tests, and project assets needed by users or contributors.
- No local paths, credentials, private notes, or generated release artifacts are committed.

Milestone 2: OSS baseline

- Add `LICENSE` with MIT text.
- Add `"license": "MIT"` to `package.json`.
- Add `CHANGELOG.md`.
- Add `SECURITY.md`.
- Add issue templates for bugs and feature requests.
- Optionally add `CONTRIBUTING.md` if outside contributions will be encouraged.

Done when:

- GitHub shows the MIT license.
- Users can report bugs with OS, VS Code version, Git version, and reproduction details.
- The changelog can be used as the source for release notes.

Milestone 3: repository presentation

- Rewrite `README.md` for public users.
- Include what the extension does, how to install it, settings, known limitations, and troubleshooting.
- Add screenshots or a short GIF if available.
- Document cross-platform expectations and the `git` CLI requirement.

Done when:

- A first-time visitor can understand the extension within one minute.
- A user can install, configure, troubleshoot, and report an issue from the README.

Milestone 4: GitHub release process

- Keep `main` releasable.
- Use tags like `v0.3.0`.
- Match `package.json` version, Git tag, Marketplace version, and GitHub release title.
- Create the first GitHub release after the Marketplace package is validated.

Done when:

- The repository has a tagged release matching the Marketplace version.
- Release notes are copied from `CHANGELOG.md`.

## VS Code Marketplace Release Roadmap

Goal: publish a reliable VS Code extension package that users can install from the Marketplace.

Milestone 1: manifest and metadata

- Align default settings across `package.json`, `extension.js`, and `README.md`.
- Add Marketplace metadata to `package.json`: `repository`, `bugs`, `homepage`, `keywords`, `license`, and optional `icon`.
- Review `displayName`, `description`, `categories`, command titles, and configuration descriptions.
- Decide the first public version number.

Done when:

- `package.json` is complete enough for Marketplace publication.
- The README and manifest describe the same behavior and defaults.

Milestone 2: runtime hardening

- Handle missing `git` clearly.
- Ignore non-Git folders quietly.
- Prevent overlapping refreshes.
- Consider timeouts for slow `git status` calls.
- Reconsider or clearly document automatic `workbench.colorCustomizations` updates.
- Verify multi-root workspace behavior.

Done when:

- The extension fails gracefully in common real-world setups.
- Manual testing covers clean repos, dirty repos, ahead/behind branches, non-Git folders, and multi-root workspaces.

Milestone 3: packaging workflow

- Add `@vscode/vsce` as a dev dependency.
- Add `npm` scripts for test and package validation.
- Add `.vscodeignore`.
- Run package validation and address important warnings.
- Install the generated VSIX locally before publishing.

Done when:

- `npm run package` or the chosen packaging command produces a clean VSIX.
- The VSIX installs and works in a normal VS Code window.

Milestone 4: cross-platform validation

- Test on Windows.
- Test on macOS with VS Code launched normally from the GUI.
- Test on Linux if available.
- Record known limitations in README.

Done when:

- Windows and macOS validation are complete.
- Any Linux gap is documented if not tested before first release.

Milestone 5: Marketplace publication

- Prepare the Visual Studio Marketplace publisher.
- Prepare a publishing token.
- Run the final package command.
- Publish with `vsce publish`.
- Verify the Marketplace page after publication.
- Create the matching GitHub tag and release if not already done.

Done when:

- The extension is installable from the Marketplace.
- The Marketplace version, Git tag, GitHub release, and changelog all match.

## Post-Release Maintenance

After the first release:

- Watch Marketplace reviews and GitHub issues for Git detection problems.
- Keep changelog entries user-facing.
- Prefer small releases over large batches.
- Keep compatibility with the declared VS Code engine version.
- Re-test on macOS when changing Git process execution.
