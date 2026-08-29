# Video Marketplace — 作業進捗・再開メモ

最終更新: 2026-08-29
対象リポジトリ: `nosato0519/video-marketplace`
対象: PR #1 / main

## 継続ルール
- 作業中はこまめにこのファイルを更新してGitHubへ保存する。
- 修正、原因確定、CI実行、CI結果確認、区切りごとに「現在の作業・完了・残作業・次の1手」を更新する。
- 中断されても、このファイルを読んでGitHub上のHEAD/PR/CIと照合すれば直前から再開できる状態を維持する。
- 推測で進捗を埋めず、確認済みの事実だけ記録する。
- 実装済みと実CI PASSを区別する。

## PR #1 / Backup & Restore Hardening
- PR #1 は `b48d309000171c05a2f4ddd9b0e721d3aa80cf55` としてmainへMerge済み。
- Merge前の主要CIで Postgres Acceptance / Backend Regression / Clean Install / Media Upload Validation がPASS。
- Postgres Acceptanceでは Seller payout E2E、Admin payout concurrency、Backup/Restore、Media restore security acceptanceまでPASS確認済み。
- DB backupでDATABASE_URLをpg_dump argvへ直接渡さない安全化済み。
- Media restoreでpath traversal / absolute path / symlink / hardlink / device等の特殊tar entryを拒否する実装済み。
- Media restore security acceptanceをPostgres Acceptance workflowへ組み込み、CIでPASS確認済み。

## Seller payout E2E
- resource_id、audit順序、HTTP helper、server/baseUrl、Admin fixture、Seller role fixture、profile API契約、earnings fixtureを修正済み。
- seller_id assertion不整合を修正済み。
- PostgreSQLの金額文字列化をNumber()で正規化する修正済み。
- Seller payout E2E PASS確認済み。
- Admin payout concurrency regressionは共有transaction helper設計に合わせて回帰ガードを修正しPASS確認済み。

## 現在のmain
- Merge commit: `b48d309000171c05a2f4ddd9b0e721d3aa80cf55`
- Merge後のmainでは `restore-media-local.js` にtar archive type validationが含まれていることを確認済み。
- Merge後main commitについてGitHub connectorから取得できるworkflow/statusは現時点で0件。したがって「Merge後main CI PASS」は未確認として扱う。

## 残作業
1. Merge後mainに対するCIがGitHub上で実行される場合は、その結果を確認する。
2. 実行されない場合は、既存CIがPRイベント中心の構成であることを確認し、コード変更なしで完了判定する。
3. main上の最終ファイル状態とPR #1のレビュー指摘を照合する。

## 作業中断からの再開手順
1. このファイルを読む。
2. mainのHEADとこのファイルの記録SHAをGitHubで照合する。
3. 最新CIの有無を確認する。
4. 「実装済み」「CI PASS」「未確認」を混同しない。
5. 新しい作業を行ったら必ずこのファイルを更新する。
