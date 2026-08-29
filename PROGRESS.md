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
- `backend/migrations/011_seller_applications.sql`、Seller/Admin application routesを追加・登録。
- 正常申請、入力検証、重複申請拒否、buyerのSeller API保護、Admin一覧、review遷移、approve、role変更、seller profile作成、audit、reject note必須、reject後のrole維持、非Admin拒否を検証。
- Postgres Acceptance / Backend Regression / Clean Install / Media Upload Validationが修正系列でSUCCESS。

## 完了済み: Seller Application Browser UI
- Buyer `/seller/register`、Admin `/admin/seller-applications`、Creator discovery `/creators` を追加。
- Buyerの申請状態表示、withdraw、Admin review/approve/reject UIを追加。
- 主要CIでUI変更を検証済み。

## 完了済み: Browser Acceptance foundation
- Playwrightによる公開画面Smoke、Seller Application browser test、module load smokeを追加。
- 欠落していた `app/seller/seller-upload.js` を追加してmodule graphを修復。
- Browser Smoke run 24、Clean Install run 143がSUCCESS。
- PR #3「Add browser smoke acceptance foundation」は `feat/seller-application` へMerge済み。Merge commitは `3e56605521c6ee7c731c303551028c968a07a1fb`。

## 完了済み: Seller Application Browser Acceptance mock coverage
- 未認証 `/seller/register` → Login required → login導線を検証。
- Buyer申請POST payload、pending表示、pending withdraw、withdrawn表示を検証。
- Admin approve POST action、reject時review note必須を検証。
- Loginリンクのstrict selector問題を修正。
- 最新修正コミット `69dfb364...` のBrowser Smoke run 27がSUCCESS。旧コミットの7/8失敗は最新修正では解消済み。

## 現在の状態
- Seller Application DB/API: 実装済み、Acceptance PASS
- Buyer Seller Application UI: 実装済み、主要CI PASS
- Admin Seller Application UI: 実装済み、主要CI PASS
- Creator discovery UI/route: 実装済み、主要CI PASS
- Browser Smoke: 最新修正でChromium CI PASS
- Seller Application Browser Acceptance: mock API coverage済み、Browser Smoke PASS
- 実backend接続の認証済みBuyer/Admin Browser E2E: 未完了
- PR #2: `feat/seller-application`、Open、未Merge
- 最新確認済みBrowser Smoke HEAD: `69dfb36491962da6c4701cda7a7bb0f2b6e2c44e16`
- mainへの本番反映: PR #2が未Mergeのため未完了

## 次の1手
- 実API/backendを同時起動できるCI環境の構成を確認する。
- 既存のPostgres Acceptance / backend workflowの起動手順・テスト用認証方式を確認する。
- その方式をPlaywright Browser Acceptanceから再利用し、認証済みBuyer/Adminの実backend E2Eを追加する。
- Buyer `/seller/register` → login → application submit → pending表示を実backend接続で検証する。
- Admin `/admin/seller-applications` → review → approve/rejectを実backend接続で検証する。
- その後、Seller dashboard/products/product-editor、Buyer購入→checkout→Library→watch/download、権限境界、Admin UI acceptanceへ順次進む。
- 各区切りでCI結果とPROGRESSを更新し、最後にPR #2の最終レビューとMerge判断を行う。

## 作業中断からの再開手順
1. このファイルを読む。
2. `feat/seller-application` のHEADとこのファイルの記録をGitHubで照合する。
3. PR #2の最新状態を確認する。
4. Browser Smoke / Browser Acceptance / Backend / Postgres Acceptance / Clean Install等の最新CI結果を確認する。
5. 「実装済み」「CI PASS」「ブラウザ実機確認済み」を混同しない。
6. 新しい作業を行ったら必ずこのファイルを更新する。
