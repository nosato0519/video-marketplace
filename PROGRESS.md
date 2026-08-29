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
- 実装コミット系列: `a682914...` → `f14798c...` → `94f7f4b...` → `9459eeb...`

## 現在の状態
- Seller Application DB: 実装済み、CI未確認
- Buyer Application API: 実装済み、CI未確認
- Admin Review API: 実装済み、CI未確認
- role変更のtransaction: 実装済み、CI未確認
- audit記録: 実装済み、CI未確認
- Browser UI: 未実装
- E2E / Regression: 未追加
- PR: 未作成
- main: 変更なし

## 残作業（順番固定）
1. migration runner / schemaとの整合を確認。
2. Seller Application APIの正常系・重複申請・role制御テストを追加。
3. Admin approve/reject/review遷移テストを追加。
4. approve時にrole変更とprofile作成とauditが同一transactionで成立することを確認。
5. Browser UIを追加し、buyerから申請できる導線を作る。
6. Admin UIに申請一覧・審査操作を追加。
7. Buyer → Seller application → Admin approval → Seller Dashboardのbrowser acceptanceを追加。
8. CIを実行し、PASS/FAILを確認。
9. FAILならログから原因を確定して最小修正。
10. 全CI Green後にPR作成・レビュー・Merge判断。

## 作業中断からの再開手順
1. このファイルを読む。
2. `feat/seller-application` のHEADとこのファイルの記録をGitHubで照合する。
3. migration / route / app.jsの3点を確認する。
4. CIの最新結果を確認する。
5. 「実装済み」「CI PASS」「未確認」を混同しない。
6. 新しい作業を行ったら必ずこのファイルを更新する。
