# Git Workflow

このリポジトリは、GitHub public repo と Visual Studio Marketplace 公開を前提に運用します。

## 基本方針

- `main` は常に公開可能な状態に保つ。
- `main` へ直接コミットしない。
- 作業ごとにブランチを切る。
- 変更は小さく、意図ごとにコミットする。
- GitHub 上で Pull Request を作り、確認してから `main` にマージする。
- Marketplace 公開版は `package.json` の version、Git tag、GitHub release、Marketplace version を一致させる。

## ブランチ運用

ブランチ名は作業内容が分かる短い名前にする。

例:

- `chore/publish-prep`
- `docs/readme-marketplace`
- `docs/github-workflow`
- `fix/git-detection`
- `feat/status-tooltip`
- `test/tier-selection`
- `release/v0.3.0`

使い分け:

- `docs/*`: README、運用ドキュメント、公開計画など。
- `chore/*`: パッケージ設定、CI、公開準備など。
- `fix/*`: バグ修正。
- `feat/*`: ユーザー向け機能追加。
- `test/*`: テスト追加や検証基盤。
- `release/*`: 公開直前のバージョン調整、CHANGELOG、最終検証。

## コミット方針

1コミットは1つの意図に絞る。

推奨 prefix:

- `docs:` ドキュメントのみの変更
- `chore:` CI、依存、パッケージング、公開準備
- `fix:` バグ修正
- `feat:` 機能追加
- `test:` テスト追加・修正

例:

```text
docs: add Git workflow guide
chore: add vscodeignore for marketplace package
fix: handle missing git executable
test: cover tier selection priority
```

## Pull Request 運用

PR は小さく作る。1つの PR に無関係な変更を混ぜない。

PR に書く内容:

- 目的
- 主な変更点
- 確認したこと
- 未確認のこと
- 関連する roadmap milestone

公開準備中の PR 例:

```text
Title: docs: add publishing workflow

Purpose:
- Document branch and PR workflow before public release.

Changes:
- Add AGENTS.md for Codex operation.
- Add docs/GIT_WORKFLOW.md.

Verification:
- Reviewed git status and docs diff.

Roadmap:
- GitHub Public Release Roadmap / repository cleanup
```

## main へのマージ条件

最低限:

- 差分が目的に対して十分に小さい。
- 不要な生成物や個人ファイルが含まれていない。
- README、公開計画、CHANGELOG など必要なドキュメントが更新されている。
- 可能な範囲でテストまたは手動確認が済んでいる。

実装変更を含む場合:

- 既存動作の回帰がない。
- Windows で最低限の手動確認ができている。
- macOS 影響がありそうな変更は macOS 確認項目を残す。

リリース直前:

- `package.json` の version が正しい。
- `CHANGELOG.md` が更新されている。
- `vsce package` が通る。
- 生成 VSIX をローカルインストールして確認済み。

## Release 運用

公開時は `release/vX.Y.Z` ブランチを作る。

手順:

1. `package.json` の version を決める。
2. `CHANGELOG.md` を更新する。
3. package validation を実行する。
4. VSIX をローカルインストールして確認する。
5. Windows と macOS の確認結果を記録する。
6. PR を `main` にマージする。
7. `vX.Y.Z` tag を作る。
8. Visual Studio Marketplace に publish する。
9. 同じ tag で GitHub release を作る。

## Codex に依頼するときの型

通常作業:

```text
AGENTS.md と docs/GIT_WORKFLOW.md に従って、<目的> を進めて。
ブランチは必要なら切り、差分は小さく、確認コマンドも最後に教えて。
```

公開準備:

```text
docs/PUBLISHING_PLAN.md の <milestone名> を進めて。
変更は PR にしやすい単位に分けて、完了条件に照らして確認して。
```

レビュー:

```text
この PR を公開前レビューとして見て。
Marketplace 公開、GitHub public repo、MIT license の前提でリスクを優先して指摘して。
```

## このリポジトリで特に注意すること

- `.vsix` はコミットしない。
- `*.code-workspace` はコミットしない。
- `docs/ai/` を公開する場合は、個人情報、ローカルパス、誤解を招くメモがないか確認する。
- `workbench.colorCustomizations` を自動更新する挙動は、公開前に仕様として明確化する。
- `git` CLI が見つからない環境、特に macOS GUI 起動時の PATH 問題を検証する。
