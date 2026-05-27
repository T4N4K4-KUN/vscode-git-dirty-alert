# AGENTS.md

Repository-specific instructions for Codex and other coding agents.

## Communication

- Chat with the user in Japanese.
- Use English for user-facing public documents, Marketplace text, package metadata, and release notes.
- Japanese is allowed for internal workflow documents, local planning notes, and run records.
- Run records may use Japanese by default. Add a short English summary only when the record is useful for public readers.
- Keep progress updates short and concrete.

## Working Model

- Treat `main` as always releasable.
- Do not work directly on `main`.
- Use a topic branch for every task.
- Treat one task as one run: keep the scope small enough to review.
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

## Run and Artifact Policy

- Use a run id when a task needs logs, generated outputs, or a resumable work record.
- Run id format: `yyyymmdd-hhmmssSSS_<branch>`.
- Replace `/` in branch names with `-` when using them in run ids.
- Use `out/<run_id>/` for local generated files, logs, screenshots, package outputs, and temporary verification artifacts.
- `out/` is local-only and must not be committed.
- Use `runs/<run_id>/` only for curated records that are useful in the public repository, such as release validation notes or a short investigation summary.
- Do not commit noisy raw logs. Summarize them in Markdown when they are worth preserving.
- Do not overwrite run outputs. Add timestamps or create a new run id.

## Encoding and Line Endings

- Store text files as UTF-8 without BOM.
- Use LF line endings in the repository.
- Keep `.gitattributes` as the source of truth for line-ending normalization.
- Generated files written under `out/` should also be UTF-8 when practical.

## Codebase Notes

- The extension entry point is `extension.js`.
- The VS Code extension manifest is `package.json`.
- Keep package metadata, README descriptions, and runtime defaults aligned.
- Generated `.vsix` files must not be committed.
- Personal workspace files such as `*.code-workspace` must not be committed.
- Use `.vscodeignore` to keep Marketplace packages small and clean.
- `runs/` may exist for selected public records, but it must not be included in Marketplace packages.

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
- `runs/<run_id>/`: curated run notes only when they are useful after publication
- `docs/ai/TODO.md`: local working notes, if still used during preparation
