# VS Code司令塔（Codex拡張）テンプレート運用：Runbook
`docs/RUNBOOK_VSCODE_COMMAND_CENTER.md`

このRunbookは、**VS Code内のCodexチャットを司令塔**として  
「指示→実装→実行→差分→学び」を **Devinライク**に回すための運用手順です。

> 続きは会話履歴に依存しません。  
> **`docs/ai/` とGit履歴**を真実にして、タワーPC/ノート/将来Macでも復帰できる運用にします。

> 運用の設計原則は `docs/TEMPLATE_DESIGN.md` に集約。  
> このRunbookは **日々の運用手順**に特化します。

---

## 0. 最重要原則（これだけ守れば破綻しない）
1) “昨日の続き”は **`docs/ai/CONTEXT.md` と `docs/ai/TODO.md`** で復元  
2) 変更は必ずブランチ（main直編集禁止）  
3) 1コミット＝1意図（差分を小さく）  
4) 実行→確認→記録（成功/失敗とも残す）  
5) 失敗は必ず資産化（`docs/ai/LESSONS.md`）  
6) 秘密情報と破壊的操作は都度確認（.env / rm系）

---

## 1. プロジェクト作成直後（テンプレから作った初回だけ）
テンプレからrepoを作ったら、最初にこれだけやる。

1) `docs/ai/CONTEXT.md` をプロジェクト用に埋める  
2) `docs/ai/TODO.md` を最初のチェックリストにする  
3) `scripts/run.*` で最小確認を実行  
4) ここまでをコミットしてpush（“初期状態”をGitに固定）

---

## 2. 毎日の開始（“昨日の続き”）
1) `git pull`
2) VS Codeでrepoを開く
3) Codexチャットに復帰プロンプトを投げる

### 復帰プロンプト（固定）
> `docs/ai/CONTEXT.md` と `docs/ai/TODO.md` を読んで、TODOの上から順に進めて。  
> 新しいブランチを作り、差分は小さく、実行コマンドと確認方法も提示して。  
> 失敗したら `docs/ai/LESSONS.md` に原因/対策/再発防止を追記して。

---

## 3. 1タスク = 1 run（Devinライク運用の核）
### 3.1 runで必ず残すもの
- ブランチ名
- コミット（差分）
- 実行結果（ログ/成果物）
- 学び（LESSONS/DECISIONS/TODO更新）

### 3.2 推奨：`runs/` にrun記録を残す
例：`runs/2025-12-26_template-v1/RUN.md`

RUN.mdの最低限：
- 目的
- 実行手順
- 結果
- 影響範囲
- ロールバック
- 次のTODO

> `out/` はgitignore推奨。必要な成果だけ runs 配下にコピー。

---

## 4. Git運用（Gitコマンドを意識しないための型）
### 4.1 ブランチ命名（例）
- `poc/<topic>-YYYYMMDD`
- `feat/<topic>`
- `fix/<topic>`

### 4.2 コミット（例）
- `feat: ...`
- `fix: ...`
- `docs: ...`
- `chore: ...`

### 4.3 戻す（GUI想定）
VS Code Source Control / GitHub Desktopで：
- 変更破棄（discard）
- revert
- ブランチ削除

---

## 5. 実行運用ルール（再現性）
- 実行環境の差を減らすため、setup/runを固定
- 外部依存の導入は `requirements.txt` 等に集約
- 成果物は `out/` に出し、必要なら `runs/` にコピー

---

## 6. 失敗時の標準手順（学びまでがrun）
1) 再現条件固定
2) 原因仮説を3つ
3) 最小修正から試す（1回1変更）
4) `docs/ai/LESSONS.md` に追記
5) 方針変更なら `docs/ai/DECISIONS.md` も更新

### `LESSONS.md` 追記テンプレ
- 事象：
- 原因：
- 対策：
- 再発防止ルール：
- 影響範囲（OS/端末/環境差）：

---

## 7. 長文設計/レビューの扱い（ChatGPT Pro Webの使い方）
司令塔はVS Codeだが、次はWeb側ChatGPT併用OK：
- 設計比較、要件整理、長文ドキュメント骨子、リスク洗い出し

ただし結論は必ずrepoへ：
- 決定事項 → `DECISIONS.md`
- 手順 → `runs/<run>/RUN.md` や本Runbook
- 学び → `LESSONS.md`

---

## 8. 端末が変わる時（タワー→ノート→Mac）
チェックリスト：
- [ ] `git pull`
- [ ] 依存が揃っている（setup実行 or requirements導入）
- [ ] `scripts/run.*` が通る
- [ ] 復帰プロンプトで `CONTEXT/TODO` を読ませた

---

## 9. コスト/上限制御（追加課金を増やさない）
- 1 run を短く（差分を小さく）
- 詰まったら先に `docs/ai/` を更新して整理→再トライ
- それでも回らない時だけ fallback（例：別LLM）を検討

---

## 10. Codexに投げる定型プロンプト集
### 10.1 いつもの開始
> `docs/ai/CONTEXT.md` と `docs/ai/TODO.md` を読んで、TODOを順に進めて。  
> 新しいブランチを作り、1コミット=1意図で差分を出して。  
> 実行コマンドと確認ポイントも提示して。

### 10.2 実装
> 既存構成に合わせて設定を定数化して適用して。  
> 変更は最小で、runが1回で確認できる形にして。  
> 必要なら `docs/ai/DECISIONS.md` を更新して。

### 10.3 デバッグ
> この失敗ログと該当コードから原因仮説を3つ、確度順に出して。  
> 最小修正から試し、結果を `docs/ai/LESSONS.md` に追記して。

### 10.4 ドキュメント化
> セットアップ手順と運用Runbookを `docs/` に更新して。  
> 端末が変わっても復帰できる運用（docs/ai中心）を最優先で。

---

## 中断・別PCで再開（Resume手順）
### 前提
- “続き”は会話履歴ではなく repo（Git + docs/ai）で復元する。
- 別PCで再開するには、作業ブランチがリモートにpushされていることが必須。

### A) 中断する前（30秒チェック）
1) `docs/ai/TODO.md` を更新（次にやることが1～3項目で分かる状態）
2) 小さくコミット（途中でもOK、1コミット=1意図）
3) 作業ブランチを push（GitHubに上げる）
※推奨：PRをDraftで作る

### B) 別PCで再開（最短）
1) repoを clone/pull
2) `scripts/setup.*` を実行（端末ごとに一度だけ）
3) 作業ブランチに切り替える（またはTODO冒頭のCurrent Branchを見る）
4) Codexに再開プロンプトを投げる

### 再開プロンプト（固定）
> `docs/ai/BRIEF.md` と `docs/ai/PLAN.md` と `docs/ai/TODO.md` を読んで、前回の続きから進めて。  
> 作業ブランチは `docs/ai/TODO.md` の `Current Branch:` を使って。  
> TODOの上から順に、実装→実行確認→コミット→TODO更新まで進めて。

---

## 開始儀式（新規PJ開始の最初の一言）
Codexにこれだけ言えばよい：
> では開発を始めて。`docs/ai/BRIEF.md` を読み、足りない点だけ質問して、  
> `PLAN.md`/`TEST_PLAN.md`/`TODO.md` を作成し、TODO順に進めて。
