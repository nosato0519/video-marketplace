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

## Merge後main確認
- mainのMerge commit `b48d309000171c05a2f4ddd9b0e721d3aa80cf55` に、今回のbackup/restore hardeningとsecurity acceptance追加が含まれていることを確認済み。
- `.github/workflows/postgres-migration-acceptance.yml` のpush triggerは `hardening/backup-restore` のみで、main pushは対象外。pull_requestとworkflow_dispatchは対象。
- そのためMerge後main commitに対してGitHub connectorからworkflow/statusが0件であることは、現workflow triggerと整合する。
- 「Merge後main CI PASS」は実行されていないためPASSとは表現しない。ただし、Merge前に同一変更内容を含む主要CIがPASSしていることは確認済み。

## 現在の状態
- 実装: 完了
- PR #1: Merge済み
- Merge前主要CI: 全てPASS確認済み
- Merge後mainの追加CI: trigger対象外のため未実行
- main上の最終ファイル状態: 確認済み
- PRレビュー指摘: 3件すべて対応内容をMerge前CIで検証済み

## 残作業
- 今回のPR #1 / Backup & Restore Hardeningについて、必須の残作業なし。
- 今後main向けCIを実行する必要がある場合は、workflow_dispatch等で明示的に起動して確認する。

## 作業中断からの再開手順
1. このファイルを読む。
2. mainのHEADとこのファイルの記録SHAをGitHubで照合する。
3. 必要に応じてworkflow triggerとCI実行履歴を確認する。
4. 「実装済み」「CI PASS」「未確認」を混同しない。
5. 新しい作業を行ったら必ずこのファイルを更新する。

## 完成判定
**PR #1 / Backup & Restore Hardeningは完成。**

完成根拠:
- Backup / Restore実装完了
- DATABASE_URLのargv露出対策完了
- Media archiveのpath traversal / symlink / hardlink / device等の防御完了
- Backup→Restore round-trip acceptance PASS
- Media restore security acceptance PASS
- Seller payout E2E PASS
- Admin payout concurrency regression PASS
- Postgres Acceptance PASS
- Backend Regression PASS
- Clean Install PASS
- Media Upload Validation PASS
- PR #1 Merge済み
- Merge後mainのworkflow triggerがmain pushを対象外としていることを確認
