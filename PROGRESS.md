# Video Marketplace — 作業進捗・再開メモ

最終更新: 2026-08-29
対象リポジトリ: `nosato0519/video-marketplace`
対象ブランチ: `feat/seller-application`

## 継続ルール
- 作業中はこまめにこのファイルを更新してGitHubへ保存する。
- 修正、原因確定、CI実行、CI結果確認、区切りごとに「現在の作業・完了・残作業・次の1手」を更新する。
- 中断されても、このファイルを読んでGitHub上のHEAD/PR/CIと照合すれば直前から再開できる状態を維持する。
- 推測で進捗を埋めず、確認済みの事実だけ記録する。
- 実装済みと実CI PASSを区別する。

## 完了済み: PR #1 / Backup & Restore Hardening
- PR #1 は `b48d309000171c05a2f4ddd9b0e721d3aa80cf55` としてmainへMerge済み。
- Merge前の主要CIでPostgres Acceptance / Backend Regression / Clean Install / Media Upload ValidationがPASS。
- Seller payout E2E、Admin payout concurrency、Backup/Restore、Media restore security acceptanceまでPASS確認済み。
- Media restoreのpath traversal / absolute path / symlink / hardlink / device等の防御を実装済み。

## 今回: Seller Application
- buyerからsellerへの権限昇格をユーザー自身に許可せず、Admin承認を必須とする方針で実装開始。
- `backend/migrations/011_seller_applications.sql` を追加。
- `backend/src/seller/application-routes.js` を追加。
- `backend/src/admin/seller-application-routes.js` を追加。
- `backend/src/app.js` にSeller application / Admin review routesを登録。
- Seller applicationはpending / under_review / approved / rejected / withdrawnを管理。
- buyerのみ申請可能。
- active applicationはDBのpartial unique indexで二重申請を防止。
- Admin approve時はwithTransaction()内でapplication更新、buyer→seller role変更、seller profile作成/更新、audit event記録を原子的に実行する。
- Adminのreview endpointはrequireAuth + requireRole('admin')で保護。
- `backend/scripts/http-seller-application-acceptance.js` を追加し、正常系・重複申請・Admin審査/承認・role/profile/audit・reject・非Admin拒否を検証するようにした。
- `backend/package.json` に `test:http-seller-application` を追加。
- `.github/workflows/postgres-migration-acceptance.yml` にSeller Application acceptance stepを追加。

## 現在の状態
- Seller Application DB: 実装済み、CI未確認
- Buyer Application API: 実装済み、CI未確認
- Admin Review API: 実装済み、CI未確認
- role変更のtransaction: 実装済み、CI未確認
- audit記録: 実装済み、CI未確認
- Acceptance test: 実装済み、CI未確認
- Browser UI: 未実装
- Admin UI: 未実装
- PR: 未作成
- main: 変更なし

## 残作業（順番固定）
1. Seller Application acceptanceをCIで実行してPASS/FAILを確認。
2. FAILならログから原因を確定して最小修正。
3. API契約が確定したらBuyer UIを追加。
4. Admin UIに申請一覧・審査操作を追加。
5. Buyer → Seller application → Admin approval → Seller Dashboardのbrowser acceptanceを追加。
6. 全CI Green後にPR作成・レビュー・Merge判断。

## 作業中断からの再開手順
1. このファイルを読む。
2. `feat/seller-application` のHEADとこのファイルの記録をGitHubで照合する。
3. migration / route / app.js / acceptance test / workflowの5点を確認する。
4. CIの最新結果を確認する。
5. 「実装済み」「CI PASS」「未確認」を混同しない。
6. 新しい作業を行ったら必ずこのファイルを更新する。
