[SETUP_VSCODE_COMMAND_CENTER.md](https://github.com/user-attachments/files/24343568/SETUP_VSCODE_COMMAND_CENTER.md)
# VS Code司令塔（Codex拡張）テンプレート運用：セットアップ手順書
`docs/SETUP_VSCODE_COMMAND_CENTER.md`

この手順書は、**「プロジェクトごとにGitリポジトリを作る」前提**で、毎回同じ型で  
**VS Code内のCodexチャット（=司令塔）**から「指示→実装→実行→差分→Git保存→学び」を回すためのセットアップです。

> 重要：端末を跨いでも“昨日の続き”を成立させるため、**会話履歴の同期に依存しません**。  
> 続きは **Git + `docs/ai/`** を“真実”として復元します。

---

## 0. Done Definition（この状態になれば完成）
以下が **タワーPC（Win11）/ ノートPC（Win）/ 将来Mac** のどれでも成立すればOK。

- [ ] GitHub等に「プロジェクトrepo」があり、clone/pullできる
- [ ] VS CodeにCodex拡張を入れて、**ChatGPT Proアカウントでログイン**できる
- [ ] Playwrightの最小PoCが **ヘッドレスで成功**し、`out/`にスクショが出る
- [ ] **ブランチを切って**変更→実行→コミット→push（またはPR）までできる
- [ ] `docs/ai/` を読ませれば、端末が変わっても“昨日の続き”が再開できる

---

## 1. 前提（アカウント/権限）
- OpenAIアカウント（ChatGPT Pro）
- Gitリモート（GitHub等。private推奨）
  - push/pull権限
  - （推奨）PR作成権限

---

## 2. 先に決める：Playwrightの言語
迷ったら **Python推奨**（個人自動化に向く）。  
このテンプレは Python想定で書きます（Nodeでも読み替え可）。

---

## 3. テンプレートrepo方式（推奨フロー）
この2つを分けて考えると迷いません。

### 3.1 初回だけ：テンプレートrepoを用意する（1回だけ）
あなた用に **「Template repository」** を1つ作り、ここに標準の骨組みを入れます。

テンプレに入れる最低限（例）：

```text
/automation/                 # 自動化本体（Playwright等）
/docs/
  SETUP_VSCODE_COMMAND_CENTER.md
  RUNBOOK_VSCODE_COMMAND_CENTER.md
  /ai/
    CONTEXT.md
    TODO.md
    DECISIONS.md
    LESSONS.md
/runs/                       # run単位の記録（任意だが強い）
/out/                        # 成果物（gitignore推奨）
/scripts/
  setup.ps1                  # Winセットアップ（任意）
  setup.sh                   # Mac/Linuxセットアップ（任意）
.gitattributes               # LF固定（推奨）
.gitignore
README.md
```

> 以後の新規PJは「このテンプレから作成」すれば、毎回2ファイルをコピペする必要がなくなります。  
> なお、テンプレ更新は既存PJへ自動反映されません（必要なら手動で取り込み）。

### 3.2 毎回：新しい開発プロジェクトrepoを作る（テンプレから複製）
GitHubでテンプレrepoを開き、**Use this template** で新規repoを作ります（private推奨）。

その後、各端末で：

1) clone  
2) セットアップ（Playwright等）  
3) VS Code + Codexログイン  
4) 最小PoC実行  
5) プロジェクトの `docs/ai/CONTEXT.md` と `TODO.md` を埋めてコミット

---

## 4. 各端末で入れるもの（Win/Mac共通）
### 必須
- VS Code
- Git（CLIでもGUIでも可）
- Python 3.x（Python運用の場合）

### 推奨
- VS Code Settings Sync（拡張/設定の同期）
- GitHub Desktop（Gitコマンドを極力意識しないなら）

---

## 5. Gitの最低限の共通設定（クロスOS事故を防ぐ）
### 5.1 ユーザ情報（全端末で必須）
```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

### 5.2 改行（CRLF/LF）方針
repoはLFに寄せるのが安全。

- Windows推奨：
```bash
git config --global core.autocrlf true
```
- Mac/Linux推奨：
```bash
git config --global core.autocrlf input
```

さらに repo に `.gitattributes`（推奨）：
```gitattributes
* text=auto eol=lf
```

---

## 6. VS Code司令塔（Codex拡張）の準備
1) VS Code → Extensions → OpenAI Codex（公式）をインストール  
2) 拡張で **ChatGPT Proアカウント**にサインイン  
3) repoを開いたら **Workspace Trust（信頼）** を有効化

---

## 7. Playwright（Python）セットアップ（端末ごと）
### 7.1 venv
```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Mac/Linux: source .venv/bin/activate
```

### 7.2 依存導入
```bash
pip install playwright
playwright install
```

---

## 8. `.gitignore`（最低限）
テンプレに入れておく推奨例：

```gitignore
# outputs / artifacts
out/
playwright-report/

# secrets
.env

# python
.venv/
__pycache__/
*.pyc

# node (if you use Node)
node_modules/
```

---

## 9. 最小PoC（必須：3分で動作確認）
テンプレに `automation/poc_screenshot.py` を置いておくのがおすすめ。  
成功条件：`out/poc.png` が生成される。

---

## 10. GitHub側の推奨設定（壊さないため）
- main直push禁止（Require PR 推奨）
- （任意）PRテンプレを置くとrunがまとまる

---

## 11. テンプレ更新の扱い（重要）
- テンプレrepoを更新しても、**既存プロジェクトrepoには自動で降りません**。
- テンプレを更新したら、既存PJに取り込みたい場合は以下のどれか：
  - 手で2ファイル（＋必要ならscripts等）を上書き
  - 変更点だけcherry-pick/パッチ適用
  - “テンプレ更新用ブランチ”を作ってPRで配布（プロジェクト数が増えたらこの方式が楽）
