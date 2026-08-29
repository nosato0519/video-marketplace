# Video Marketplace — 作業進捗・再開メモ

最終更新: 2026-08-29
対象リポジトリ: `nosato0519/video-marketplace`
対象ブランチ: `feat/browser-acceptance`

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

## 完了済み: Seller Application Browser UI
- `app/seller/seller-application-view.js` を追加。
- buyerが `/seller/register` から申請できる画面を追加。
- 未ログイン時はloginへ誘導し、ログイン後に申請状態を表示。
- pending / under_reviewではwithdrawを可能にし、approved / rejected / withdrawnの状態を表示。
- `app/admin/seller-applications.js` を追加。
- Adminが `/admin/seller-applications` から申請を確認し、review / approve / rejectを実行できるUIを追加。
- `app/admin/admin-navigation.js` と `app/admin/admin-dashboard.js` にSeller applicationsを追加。
- Creator discovery route `/creators` とCreator一覧UIを追加。
- UI変更を含む主要CIは `b29b423...` でAdmin Static / Media Upload Validation / Backend / Postgres Acceptance / Clean InstallすべてSUCCESS確認済み。

## 今回: Browser Acceptance基盤
- `feat/browser-acceptance` ブランチを `feat/seller-application` の `b29b423b8308b7b0e16b3699e3fb5e297d68dbca` から作成。
- Playwrightを使う公開画面のブラウザSmoke testを追加。
- `tests/browser-smoke.spec.js` を追加し、Home / Browse / Categories / Popular / Creators / Login / Registerの表示を実ブラウザで確認するテストを追加。
- Homeの主要navigationとCreator discovery → Seller registration導線も確認対象にした。
- `playwright.config.js` を追加し、headless Chromium、失敗時screenshot/trace、baseURLを設定。
- `.github/workflows/browser-smoke.yml` を追加し、Node 22 / Playwright 1.55.0 / ChromiumをCI上でインストールして、Python静的サーバー経由でSmoke testを実行する構成にした。
- 現時点ではBrowser Smoke CIのPASSは未確認。コード追加だけをPASSとは扱わない。

## 現在の状態
- Seller Application DB/API: 実装済み、Acceptance PASS
- Buyer Seller Application UI: 実装済み、主要CI PASS
- Admin Seller Application UI: 実装済み、主要CI PASS
- Creator discovery UI/route: 実装済み、主要CI PASS
- Browser Smoke test: 実装済み、CI実行結果未確認
- Browser Acceptance: 未完了
- PR #2: `feat/seller-application`、Open、未Merge
- `feat/browser-acceptance`: Browser Smoke基盤追加中

## 次の1手
- `feat/browser-acceptance` の最新HEADでBrowser Smoke workflowが実行されたか確認する。
- Browser SmokeがFAILした場合はログから原因を特定して最小修正する。
- Browser SmokeがPASSしたら、実API/backendを同時起動できる環境で認証済みBuyer/AdminのBrowser Acceptanceを追加する。
- Buyer `/seller/register` → login → application submit → pending表示をブラウザで検証する。
- Admin `/admin/seller-applications` → application review → approve/rejectをブラウザで検証する。
- Browser Acceptance通過後にPR #2へ必要な変更を反映し、最終レビューとMerge判断を行う。

## 作業中断からの再開手順
1. このファイルを読む。
2. `feat/browser-acceptance` のHEADとこのファイルの記録をGitHubで照合する。
3. `feat/seller-application` / PR #2の最新HEADも確認する。
4. Browser Smoke workflowの最新CI結果を確認する。
5. 「実装済み」「CI PASS」「ブラウザ実機確認済み」を混同しない。
6. 新しい作業を行ったら必ずこのファイルを更新する。
