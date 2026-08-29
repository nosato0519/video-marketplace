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
- Clean Install: PASS確認済み
- Media Upload Validation: PASS確認済み
- Backend Regression: PASS確認済み
- Backend Regression内のRound-trip: PASS確認済み
- 通常テスト: 184 tests / 184 pass / 0 fail を確認済み

### PR構成
- `main` と `hardening/backup-restore` の比較で、PR側は17コミット先行、behind 0を確認済み
- PR #1の変更対象はBackup/Restore関連の9ファイルとして確認済み
- PR #1はOpen、mergeable=trueを確認済み
- まだMergeしていない

## 4. PR #1に含まれることを確認したファイル

- `.github/workflows/backend-regression.yml`
- `.github/workflows/postgres-migration-acceptance.yml`
- `BACKUP.md`
- `backend/package.json`
- `backend/scripts/backup-db.js`
- `backend/scripts/backup-media-local.js`
- `backend/scripts/backup-restore-acceptance.js`
- `backend/scripts/restore-db.js`
- `backend/scripts/restore-media-local.js`

## 5. 現在残っている問題

### Postgres Acceptance / Seller payout E2E

CIではSeller payoutの4段階の状態遷移と4件のaudit event生成・取得までは確認できているが、E2E側のassertionが `event.resource_id === payoutId` で4件を抽出しようとして0件になり失敗している。

**2026-08-29 再開後の原因特定:**
- `/api/admin/payouts/:id/audit` の実装元を特定した
- `backend/src/admin/payout-routes.js` が監査イベントをDBから取得している
- SQLのSELECTに `a.id` はあるが **`a.resource_id` が含まれていない**ことを確認した
- WHERE句では `a.resource_id = $1` を使っているため、DB上では正しくpayoutに紐付いたイベントを検索できる
- しかしJSONレスポンスへ `resource_id` をSELECTしていないため、E2E側の `event.resource_id === payoutId` が常に成立しない
- これはE2Eの期待値を変更する問題ではなく、**監査APIレスポンスの欠落フィールドを修正するアプリ側の問題**と確定

## 6. Seller/Admin機能について

Seller payout / Seller profile / Seller verification / Admin payout / Admin verification等のコミットはリポジトリ上に存在するが、PR #1の変更対象ではないことを確認済み。

これらをBackup/Restore PRへ無関係に混ぜない。

## 7. 直前に確認した重要CI状態

コミット `327a1b2d51e6b316375d803d202a297558969b7b` に対して、以下を確認済み:
- Backend Regression #495: SUCCESS
- Clean Install #85: SUCCESS
- Media Upload Validation #18: SUCCESS
- postgres-migration-acceptance #186: FAILURE

Backend Regression #495では `backup/restore round-trip acceptance: PASS` を確認済み。

## 8. 次にやる作業（順番固定）

1. ~~audit APIの実装元を正確に特定する~~ → **完了**
2. ~~audit event生成処理・DB保存処理・API serializer/SELECTを確認する~~ → **完了**
3. ~~`resource_id` がどこで欠落しているかを確定する~~ → **完了**
4. `backend/src/admin/payout-routes.js` の監査SELECTへ `a.resource_id` を追加する
5. 変更後の最新SHAを記録する
6. Seller payout E2Eを再実行する
7. Postgres Acceptance全体を再実行する
8. Admin payoutを含む後続AcceptanceがPASSすることを確認する
9. Round-tripが再度PASSすることを確認する
10. 全CI Greenを確認する
11. PR #1本文の古いレビュー指摘・進捗記述を実装済み状態へ更新する
12. 最終レビューを実施する
13. CI/レビューがすべて問題ない場合のみMergeする
14. Merge後、main上で最終CIを確認する

## 9. 作業上の禁止事項・注意

- CIがGreenになる前にMergeしない
- Seller/Admin payoutの問題を理由にBackup/Restoreコードを不用意に変更しない
- API仕様を推測して `resource_id` assertionを雑に変更しない
- テスト期待値を4→0などにして失敗を隠さない
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
- audit API実装元

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

## 12. 完成判定

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
