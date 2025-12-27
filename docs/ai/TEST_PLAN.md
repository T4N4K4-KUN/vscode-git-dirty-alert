# TEST_PLAN
## Manual
- 変更があるときに赤いステータス表示が出る
- 変更がないときに表示が消える
- クリックで SCM ビューが開く
- `gitDirtyAlert.pollingSeconds` を変更すると反映される
- [x] A:1,B:1,U:1 のとき Tier1（赤）になる
- [x] A:0,B:1,U:1 のとき Tier2（橙）になる
- [x] A:0,B:0,U:1 のとき Tier3（黄）になる
- [x] 変更があるときに赤いステータス表示が出る（ツールチップ: Uncommitted changes: 2）
- [x] クリックで SCM ビューが開く
- [x] `gitDirtyAlert.debug` を有効化すると Output にログが出る
