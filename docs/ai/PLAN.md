# PLAN
- VSCode 拡張の最小実装を作成する
- ステータスバー表示とポーリングを実装する
- 設定項目を用意する
- 手動テスト手順を整備する
- Alert表記変更（軽微）
- 設定画面

## 仕様（Tierアラート）
### 種別
- ahead / behind / uncommitted

### Tier割り当て
- 最低1つ以上、最大3つまで割り当て可能
- 同一TierはOR扱い（いずれかが1以上で発火）
- 優先順位は Tier1 > Tier2 > Tier3

### 色
- Tierごとに色を割り当て
- デフォルトは Tier1=赤, Tier2=橙, Tier3=黄

### 表示
- ステータスバーは最上位Tierの色を表示
- ツールチップには3種すべての数を表示
- 表記例: `ahead:1, behind:0, uncommitted:2`

### 挙動例
- Tier1: ahead, behind / Tier2: uncommitted
- ahead または behind が1以上なら赤
- それらが0で uncommitted が1以上なら黄
