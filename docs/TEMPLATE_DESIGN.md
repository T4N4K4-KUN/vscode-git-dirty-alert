# テンプレ設計（Devin+Slackライク運用 / マルチ環境復帰 / 安定運用）

このテンプレは、**VS Code内のCodexチャットを司令塔**として  
「指示→実装→実行→差分→学び」を回しつつ、**端末を跨いでも復帰できる**開発運用を目的にする。

## 1. 目的と成功条件
- どの開発でも、このテンプレから始めれば **同じ運用フロー**で進められる
- 端末が変わっても **`docs/ai/` + Git** で続きが復元できる
- 1タスク=1runで **差分が小さく、バグが少なく、原因追跡が容易**になる

## 2. 設計原則（破綻しないための最小ルール）
1) “続き”は **会話履歴ではなく repo（Git + docs/ai）**
2) 変更は必ずブランチ（main直編集禁止）
3) 1コミット=1意図（差分を小さく）
4) 実行→確認→記録（成功/失敗とも残す）
5) 失敗は必ず資産化（LESSONS）
6) 秘密情報と破壊的操作は都度確認

## 3. 最小ファイル構成（テンプレ必須）
```text
/docs/
  TEMPLATE_DESIGN.md         # この設計（テンプレの核）
  SETUP_VSCODE_COMMAND_CENTER.md
  RUNBOOK_VSCODE_COMMAND_CENTER.md
  /ai/
    BRIEF.md                 # 現状サマリ/ゴール/制約（推奨）
    CONTEXT.md               # 目的・構成・環境・前提
    TODO.md                  # 次にやること（Current Branch含む）
    DECISIONS.md             # 方針・選定理由
    LESSONS.md               # 失敗と再発防止
    PLAN.md                  # 中期の進め方（任意）
    TEST_PLAN.md             # 検証観点（任意）
/runs/                       # run単位の記録（推奨）
/tools/                      # dump等のユーティリティ
/scripts/
  setup.ps1                  # Winセットアップ（任意）
  setup.sh                   # Mac/Linuxセットアップ（任意）
  run.ps1                    # 実行コマンド集約（任意）
  run.sh                     # Mac/Linux実行（任意）
.gitattributes               # LF固定（推奨）
.gitignore
README.md
```

## 4. 運用フロー（Devin+Slackライク）
### 4.1 毎日の開始（復帰）
1) `git pull`
2) `docs/ai/CONTEXT.md` と `docs/ai/TODO.md` を読む
3) Codexに復帰プロンプトを投げる

### 4.2 1タスク=1run
1) ブランチ作成
2) 実装（差分小さく）
3) 実行・確認
4) 記録（run/LESSONS/DECISIONS/TODO）
5) コミット・push

### 4.3 中断・別PCで再開
- 中断前: TODO更新 → 小さくコミット → push
- 再開時: clone/pull → setup → ブランチ復帰 → 復帰プロンプト

## 5. 安定性（バグを減らすための品質ゲート）
- **最小確認成功**をDoneに含める（環境差を早期検出）
- **run記録**を残す（結果・影響範囲・ロールバック）
- 失敗時は **原因/対策/再発防止** を必ず記録
- 実行環境と再現条件を固定（再現性）
- 実行コマンドは `scripts/run.*` に集約（承認最小化）

## 6. 復帰プロンプト（固定文）
> `docs/ai/CONTEXT.md` と `docs/ai/TODO.md` を読んで、TODOの上から順に進めて。  
> 新しいブランチを作り、差分は小さく、実行コマンドと確認方法も提示して。  
> 失敗したら `docs/ai/LESSONS.md` に原因/対策/再発防止を追記して。

## 7. テンプレ更新の扱い
- テンプレ更新は既存PJに自動反映されない
- 取り込みは手動コピー or パッチ適用 or 更新PR配布

## 8. 新規PJ開始の最初の一言
> では開発を始めて。`docs/ai/BRIEF.md` を読み、足りない点だけ質問して、  
> `PLAN.md`/`TEST_PLAN.md`/`TODO.md` を作成し、TODO順に進めて。
