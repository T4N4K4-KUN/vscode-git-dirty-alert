# AGENTS.md

Repository-specific instructions for Codex and other coding agents.

## Communication

- Chat with the user in Japanese.
- Repository documents may be written in English when they are intended for public users or Marketplace publication.
- Keep progress updates short and concrete.

## Working Model

- Treat `main` as always releasable.
- Do not work directly on `main`.
- Use a topic branch for every task.
- Prefer small, reviewable commits.
- Open or prepare a pull request for merging work back to `main`.
- Do not rewrite unrelated user changes.

Recommended branch names:

- `chore/publish-prep`
- `docs/<topic>`
- `fix/<topic>`
- `feat/<topic>`
- `test/<topic>`
- `release/vX.Y.Z`

Recommended commit prefixes:

- `docs:`
- `chore:`
- `fix:`
- `feat:`
- `test:`

## Public Release Assumptions

This repository is being prepared for:

- public GitHub release
- Visual Studio Marketplace publication
- MIT license
- Windows, macOS, and Linux support without OS-specific builds

Use `docs/PUBLISHING_PLAN.md` as the release roadmap and `docs/GIT_WORKFLOW.md` as the Git operation guide.

## Codebase Notes

- The extension entry point is `extension.js`.
- The VS Code extension manifest is `package.json`.
- Keep package metadata, README descriptions, and runtime defaults aligned.
- Generated `.vsix` files must not be committed.
- Personal workspace files such as `*.code-workspace` must not be committed.
- Use `.vscodeignore` to keep Marketplace packages small and clean.

## Validation Expectations

Before committing implementation changes, run the most relevant local checks available.

For release-prep changes, verify at least:

- `git status --short`
- relevant diffs
- package metadata consistency

For runtime changes, verify or update tests when available, and manually check extension behavior if tests do not cover the change.

## Documentation Updates

Update documentation when behavior, release process, or user-facing settings change.

Important documents:

- `README.md`: user-facing overview and usage
- `CHANGELOG.md`: release notes
- `docs/PUBLISHING_PLAN.md`: release roadmap
- `docs/GIT_WORKFLOW.md`: branch, PR, and release workflow
- `docs/ai/TODO.md`: local working notes, if still used during preparation
