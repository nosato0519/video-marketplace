# Video Marketplace — 作業進捗・再開メモ

最終更新: 2026-08-29
対象リポジトリ: `nosato0519/video-marketplace`
対象ブランチ: `hardening/backup-restore`
対象PR: #1

## 0. 最重要：作業継続ルール

**作業中はこまめにこの `PROGRESS.md` を更新して保存する。**

- 作業を1つ完了したら、可能な限りその都度「完了項目」「検証結果」「残作業」を更新する。
- 大きな修正・CI実行・原因特定・区切りの良い地点では必ず更新する。
- 作業が突然中断されても、このファイルを読めば直前の確定状態から再開できるようにする。
- 次回作業開始時は、まずこのファイルを読み、GitHub上の現在HEAD・PR・CI状態と照合してから続行する。
- 「実装済み」と「実CIでPASS」を区別する。
- 推測で進捗を埋めない。確認できた事実だけ記録する。
- SHA不一致や409が出た場合は古い内容で上書きしない。最新ファイルを取得してから更新する。

## 1. このメモの目的

作業が途中で中断されても、次回このファイルを起点に同じ状態から作業を再開できるよう、確認済みの事実・完了項目・未完了項目・次の作業順・注意点を継続的に記録する。

## 2. 現在のPR #1の目的

PR #1は Backup / Restore のハードニングとAcceptance CIを完成させるための変更。Seller/Admin payout機能そのものをPR #1へ混ぜない。

## 3. 完了した作業

### Backup / Restore
- DB backup 実装: 完了
- DB restore 実装: 完了
- Media backup 実装: 完了
- Media restore 実装: 完了
- `DATABASE_URL` を `pg_dump` のargvへ直接渡さない安全化: 完了
- tar展開時の安全対策: 完了
- Backup → Restore round-trip acceptance test: 実装完了
- `pg_restore` に復元先DBを明示する修正: 完了
- Round-trip Acceptanceの実CI PASS: 確認済み

### CI
- Backend Regression workflow接続: 完了
- Postgres migration / acceptance workflow接続: 完了
- Clean Install: PASS確認済み（修正前CI）
- Media Upload Validation: PASS確認済み
- Backend Regression: PASS確認済み（修正前CI）
- Backend Regression内のRound-trip: PASS確認済み
- 通常テスト: 184 tests / 184 pass / 0 fail を確認済み

### Seller payout E2E原因調査・修正
- audit API実装元を特定: 完了
- `audit_events.resource_id` がDBに存在することを確認: 完了
- audit APIのSELECTで `a.resource_id` が欠落していたことを確定: 完了
- API側へ `a.resource_id` を追加: 完了
- 修正コミット: `0dbe08499f1971e03aff0096ec941041e8a08740`
- 修正後のCIで、resource_id欠落ではなくイベント順序assertionが次の失敗点になったことを確認: 完了
- APIが `ORDER BY a.created_at DESC` で返すことを確認: 完了
- E2E期待順を `['paid', 'processing', 'approved', 'reviewing']` に合わせる修正: 完了
- 最新テスト修正コミット: `fd958636cd3188be1c1caae2eef86b33a11328b9`

### 今回追加した修正
- 最新CIログでSeller payout E2Eが `http-test-helpers.js` の不足により開始直後に `ERR_MODULE_NOT_FOUND` で停止していることを確認: 完了
- 共通HTTPテストヘルパー `backend/scripts/http-test-helpers.js` を追加: 完了
- `startServer()` と `request()` を実装し、既存Seller payout E2Eのimport契約に合わせた
- 修正コミット: `f8528fd772149ec23f24f730bbffaad925ac3d71`
- 修正後CI: **未確認**

## 4. PR #1の現在状態

- PR #1: Open
- merged: false
- mergeable: true（直近確認時点）
- base: `main`
- 最新作業コミット: `f8528fd772149ec23f24f730bbffaad925ac3d71`
- まだMergeしていない

## 5. PR #1の変更対象について

初期確認時点ではBackup/Restore関連9ファイルだったが、その後のSeller payout E2E修正、audit API修正、HTTP helper追加を含むため、現在はBackup/RestoreのCIを完成させるために必要な関連変更を含む。

Seller/Admin payoutの機能実装そのものを新規にPRへ追加する方針ではない。今回の修正は既存Acceptance CIをGreenにするための関連API・テスト基盤修正として扱っている。

## 6. 現在残っている問題

### Postgres Acceptance / Seller payout E2E

直近の失敗は、Seller payout E2Eがimportしている `backend/scripts/http-test-helpers.js` がブランチに存在しなかったこと。

CIログの確定エラー:
`Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/home/runner/work/video-marketplace/video-marketplace/backend/scripts/http-test-helpers.js'`

この問題に対して `http-test-helpers.js` を追加済み。

**現在は、追加後のCIで次の失敗が何になるかを確認する段階。**

## 7. 直近のCI状態

最新修正前のSeller payout E2Eを含むPostgres Acceptance #198:
- migration/preflight/plan: PASS
- commerce DB: PASS
- moderation DB/HTTP: PASS
- migration concurrency: PASS
- legacy purchase migration: PASS
- payment webhook/refund/failed: PASS
- auth: PASS
- buyer purchase/media/order report: PASS
- seller product/media: PASS
- seller profile/earnings/payout E2E: FAILURE (`http-test-helpers.js` missing)
- admin payout concurrency: SKIPPED due to failure
- backup/restore round-trip: SKIPPED due to failure

最新作業コミット `f8528fd...` ではhelperを追加したため、修正後CIは未確認。

## 8. 次にやる作業（順番固定）

1. 最新head `f8528fd772149ec23f24f730bbffaad925ac3d71` のCIが発生しているか確認
2. Postgres Acceptanceの最新実行結果を確認
3. Seller payout E2EがPASSしたか確認
4. PASSしなければ、その失敗ログから次の原因を特定し、最小修正
5. 修正のたびに `PROGRESS.md` を更新して保存
6. Seller payout E2E PASS後、同じPostgres Acceptanceで後続のAdmin payout concurrencyを確認
7. 同じPostgres AcceptanceでBackup/Restore round-tripが再実行されPASSすることを確認
8. Postgres Acceptance全体PASSを確認
9. Backend Regression / Clean Install / Media Upload Validationも最新headでPASS確認
10. 全CI Greenを確認
11. PR #1本文の古いレビュー指摘・進捗記述を実装済み状態へ更新
12. 最終レビューを実施
13. CI/レビューがすべて問題ない場合のみMerge
14. Merge後、main上で最終CIを確認

## 9. 作業上の禁止事項・注意

- CIがGreenになる前にMergeしない
- Seller/Admin payoutの問題を理由にBackup/Restoreコードを不用意に変更しない
- API仕様を推測してassertionを雑に変更しない
- テスト期待値を緩めて失敗を隠さない
- APIの返却順など、実装とテストの契約を確認してから修正する
- GitHub更新時は必ず最新SHAを取得してから更新する
- SHA不一致や409が出た場合は古い内容で上書きしない
- 「実装済み」と「実CIでPASS」を区別して記録する
- 「リポジトリに存在するコミット」と「PR #1に含まれるコミット」を区別する
- **作業中はこまめに `PROGRESS.md` を更新し、区切りごとに最新状態を保存する**
- **中断時点で「現在やっている作業」「直前に完了した作業」「次にやる作業」を必ず残す**

## 10. 再開時の最初の確認

次回作業開始時は、まずこのファイルを読む。その後、以下をGitHubで再確認する:

- `hardening/backup-restore` の現在HEAD
- PR #1の現在HEAD / 状態
- 最新CI実行結果
- Postgres Acceptanceの最新失敗ログ
- audit API実装とE2Eの現在内容

確認後、このメモの「8. 次にやる作業」の未完了項目から再開する。

## 11. 作業中断時の記録テンプレート

中断する可能性がある場合、最低限次を更新する:

- **現在の作業:** 何を調査・修正・検証しているか
- **直前の完了:** 何が確認済みか
- **現在のHEAD:** 最新コミットSHA
- **CI状態:** 各WorkflowのPASS/FAIL/未確認
- **問題:** 失敗原因として確認できている事実
- **次の1手:** 再開したら最初に何をするか
- **次の区切り:** どこまで到達したら進捗報告するか

## 12. 今回の再開セッションのチェックポイント

- `PROGRESS.md` を読み直した: 完了
- 修正前CI #198の実ログ確認: 完了
- `http-test-helpers.js` 不足を確定: 完了
- helper追加: 完了
- helper追加コミット: `f8528fd772149ec23f24f730bbffaad925ac3d71`
- 修正後CI: **未確認**
- 次の区切り: **Seller payout E2E PASS確認**

## 13. 完成判定

PR #1は次の全条件を満たすまで完成扱いにしない。

- Backup PASS
- Restore PASS
- Media backup/restore PASS
- Round-trip Acceptance PASS
- Backend Regression PASS
- Postgres Acceptance PASS
- Clean Install PASS
- Media Upload Validation PASS
- 最終レビュー完了
- Merge後のmain再検証完了
