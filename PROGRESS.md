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

## 完了済み: Browser Acceptance foundation
- `feat/browser-acceptance` を `feat/seller-application` の `b29b423...` から作成。
- Playwrightによる公開画面Smoke test、Seller Application browser test、module load smokeを追加。
- Browser Smoke初回失敗の原因は `app/main.js` がimportする `app/seller/seller-upload.js` 欠落だったことを確認。
- `app/seller/seller-upload.js` を追加してmodule graphを修復。
- その後のBrowser Smoke CI（commit `54444ff...`）はSUCCESS。
- Browser Smoke run 24 と Clean Install run 143 がSUCCESS確認済み。
- PR #3「Add browser smoke acceptance foundation」は2026-08-29に `feat/seller-application` へMerge済み。Merge commitは `3e56605521c6ee7c731c303551028c968a07a1fb`。

## 今回: Seller Application Browser Acceptance強化
- `tests/browser-seller-application.spec.js` のmock APIベースBrowser Acceptanceを強化。
- 未認証時 `/seller/register` → Login required → login導線を検証。
- Buyerの申請POST payloadを検証し、pending表示を確認。
- Buyerのpending application withdraw POSTとwithdrawn表示、withdraw button消失を検証。
- Admin approveのPOST actionを検証。
- Admin rejectでreview note必須のUI検証を維持。
- 変更コミット: `4028efc8003889234a5def897ae94f0aa10550f8`。
- まだ実backend接続E2Eではないため、Browser Acceptance全体は未完了扱い。

## 現在の状態
- Seller Application DB/API: 実装済み、Acceptance PASS
- Buyer Seller Application UI: 実装済み、主要CI PASS
- Admin Seller Application UI: 実装済み、主要CI PASS
- Creator discovery UI/route: 実装済み、主要CI PASS
- Browser Smoke: 実装済み、Chromium CI PASS
- Seller Application Browser Acceptance: mock API coverage強化済み、CI結果未確認
- 実backend接続の認証済みBuyer/Admin Browser E2E: 未完了
- PR #2: `feat/seller-application`、Open、未Merge
- `feat/seller-application` HEAD: `4028efc8003889234a5def897ae94f0aa10550f8`
- mainへの本番反映: PR #2が未Mergeのため未完了

## 次の1手
- 新しいBrowser AcceptanceテストのCI結果を確認する。
- FAILならログから原因を特定して最小修正する。
- PASSなら、実API/backendを同時起動できる環境で認証済みBuyer/AdminのBrowser Acceptanceを追加する。
- Buyer `/seller/register` → login → application submit → pending表示を実backend接続で検証する。
- Admin `/admin/seller-applications` → review → approve/rejectを実backend接続で検証する。
- 既存のSeller dashboard/products/product-editor、Buyer購入→checkout→Library→watch/download、権限境界、Admin UI acceptanceへ順次進む。
- 各区切りでCI結果とPROGRESSを更新し、最後にPR #2の最終レビューとMerge判断を行う。

## 作業中断からの再開手順
1. このファイルを読む。
2. `feat/seller-application` のHEADとこのファイルの記録をGitHubで照合する。
3. PR #2の最新状態を確認する。
4. Browser Smoke / Browser Acceptance / Backend / Postgres Acceptance / Clean Install等の最新CI結果を確認する。
5. 「実装済み」「CI PASS」「ブラウザ実機確認済み」を混同しない。
6. 新しい作業を行ったら必ずこのファイルを更新する。
