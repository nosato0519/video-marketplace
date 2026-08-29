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

## 完了済み: Seller Application API acceptance
- buyerからsellerへの権限昇格をユーザー自身に許可せず、Admin承認を必須とする方針で実装。
- `backend/migrations/011_seller_applications.sql` を追加。
- `backend/src/seller/application-routes.js` を追加。
- `backend/src/admin/seller-application-routes.js` を追加。
- `backend/src/app.js` にSeller application / Admin review routesを登録。
- Seller application acceptanceを追加し、正常申請、入力検証、重複申請拒否、buyerのSeller API保護、Admin一覧、review遷移、approve、role変更、seller profile作成、audit、reject note必須、reject後のrole維持、非Admin拒否を検証。
- `.github/workflows/postgres-migration-acceptance.yml` にAcceptanceを組み込み。
- 修正後のPostgres AcceptanceでSeller Application stepを含む全Acceptance stepsがSUCCESS。
- Backend Regression / Clean Install / Media Upload Validationも修正系列でSUCCESS。

## 今回: Seller Application Browser UI
- `app/seller/seller-application-view.js` を追加。
- buyerが `/seller/register` から申請できる画面を追加。
- 未ログイン時はloginへ誘導し、ログイン後に申請状態を表示。
- pending / under_reviewではwithdrawを可能にし、approved / rejected / withdrawnの状態を表示。
- 申請画面でdisplay name / legal name / country code / messageを入力できる。
- `app/main.js` にSeller Application routeを接続。
- `app/admin/seller-applications.js` を追加。
- Adminが `/admin/seller-applications` からpending / under_review等を確認し、start_review / approve / rejectを実行できるUIを追加。
- `app/admin/admin-navigation.js` にSeller applicationsを追加。
- `app/admin/admin-dashboard.js` にSeller applicationsを追加。

## 現在の状態
- Seller Application DB: 実装済み、Acceptance PASS
- Buyer Application API: 実装済み、Acceptance PASS
- Admin Review API: 実装済み、Acceptance PASS
- role変更transaction: 実装済み、Acceptance PASS
- audit記録: 実装済み、Acceptance PASS
- Buyer Seller Application UI: 実装済み、未ブラウザ実機確認
- Admin Seller Application UI: 実装済み、未ブラウザ実機確認
- Browser Acceptance: 未実施
- PR #2: 作成済み。最新UIコミットを含む状態を次回確認する
- main: PR #2のUI変更は未Merge

## 次の1手
- PR #2の最新HEADを確認し、UI変更を含む差分を確認する。
- Browser Acceptance用の実ブラウザテスト方法/既存テスト基盤を確認する。
- buyer `/seller/register` → login → application submit → pending表示のブラウザ導線を検証する。
- admin `/admin/seller-applications` → application review → approve/rejectのブラウザ導線を検証する。
- UIテストで問題が出た場合は最小修正し、CIを再確認する。
- Browser Acceptanceが通過した後にPR #2のMerge判断を行う。

## 作業中断からの再開手順
1. このファイルを読む。
2. `feat/seller-application` のHEADとこのファイルの記録をGitHubで照合する。
3. Seller Application migration / buyer route / admin route / acceptance / workflow / buyer UI / admin UIを確認する。
4. PR #2とCIの最新結果を確認する。
5. 「実装済み」「CI PASS」「ブラウザ実機確認済み」を混同しない。
6. 新しい作業を行ったら必ずこのファイルを更新する。
