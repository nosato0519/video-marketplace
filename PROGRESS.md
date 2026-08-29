# Video Marketplace — 作業進捗・再開メモ

最終更新: 2026-08-29
対象リポジトリ: `nosato0519/video-marketplace`
対象ブランチ: `hardening/backup-restore`
対象PR: #1

## 最重要：継続ルール
- 作業中はこまめにこのファイルを更新してGitHubへ保存する。
- 修正、原因確定、CI実行、CI結果確認、区切りごとに「現在の作業・完了・残作業・次の1手」を更新する。
- 中断されても、このファイルを読んでGitHub上のHEAD/PR/CIと照合すれば直前から再開できる状態を維持する。
- 推測で進捗を埋めず、確認済みの事実だけ記録する。
- 実装済みと実CI PASSを区別する。
- GitHub更新前に最新SHAを確認し、SHA不一致/409時は古い内容で上書きしない。

## PR #1の目的
Backup / RestoreのハードニングとAcceptance CIを完成させる。CIをGreenにするために既存Acceptanceテスト/API/テスト基盤の最小修正を含む。無関係な新機能を追加しない。

## 完了済み
### Backup / Restore
- DB backup / restore: 完了
- Media backup / restore: 完了
- `DATABASE_URL` をpg_dump argvへ直接渡さない安全化: 完了
- tar展開安全化: 完了
- pg_restore復元先DB明示: 完了
- Backup→Restore round-trip acceptance: 実装済み
- Round-trip Acceptance: 実CI PASS確認済み

### CI
- Backend Regression: PASS確認済み
- Backend Regression内Round-trip: PASS確認済み
- Clean Install: PASS確認済み
- Media Upload Validation: PASS確認済み
- 通常テスト: 184/184 PASS確認済み

### Seller payout E2E
1. audit APIのSELECTから`resource_id`が欠落 → `a.resource_id`追加済み。修正コミット `0dbe08499f1971e03aff0096ec941041e8a08740`
2. API返却順がcreated_at DESC → E2E期待順を`paid → processing → approved → reviewing`へ修正。`fd958636...`
3. `http-test-helpers.js`不足 → helper追加。`f8528fd772149ec23f24f730bbffaad925ac3d71`
4. helperが`{server, baseUrl}`を返すのにE2E側がserverへオブジェクト全体を代入 → destructuringへ修正。`d978eb...`
5. 現行認証はregister時role=`buyer`固定、passwordはscrypt-v1、sessionはDB保存。自己Admin化を本番APIで許可する設計ではないことを確認。
6. 現行Admin payout routerは`requireAuth` + `requireRole('admin')`で保護されていることを確認。
7. Seller payout E2Eが存在しない`POST /api/admin/users/:id/role`に依存していたため、テストスクリプトからDB上のテストユーザーroleだけを`admin`へ設定する方式へ修正。登録直後のrole=`buyer`もassertし、その後再ログインしてrole=`admin`をassert。コミット `252519d9087d86079707524d360a2788ac5566ff`
8. 最新Acceptance run `33224930339` はcheckout commit `039845ea...`（`252519d...`を`f0ec59f...`へmergeしたcommit）。Admin fixture変更後もSeller payout E2Eが403で失敗。ログの失敗行はE2Eのseller profile開始直後。
9. 現行seller profile routerを直接確認し、router全体が`requireRole('seller')`、更新APIは`PATCH /api/seller/profile`、payloadは`displayName/legalName/countryCode`、レスポンスは`profile.user_id`等であることを確認。
10. 現行seller earnings routerを確認し、`earnings`は配列であり、payoutを作るには`available`な`seller_earnings`残高が必要なことを確認。
11. 現行seller payout routerを確認し、withdrawable balanceはavailable earningsから未失敗/未cancelled payout予約額を差し引いて計算されることを確認。
12. Seller payout E2Eを現行API契約に合わせて修正。sellerユーザーをDBで`seller`へ変更して再ログイン、profileをPATCH、buyer/product/order/seller_earningsのテストfixtureをDBに作成して5000 JPYのavailable残高を用意、earnings/payout/admin payout/status/audit/最終seller payoutを現行レスポンス仕様に合わせて検証するよう変更。
13. 最新修正コミット `72013080e9fabcc79495dcc9a723df6656c3896d`
14. 最新Acceptance run `33225584659` のSeller payout E2Eログを確認。`earnings.body.earnings` の各要素に`seller_id`は含まれない現行API仕様なのに、E2Eが`seller_id === sellerId`をassertして `false !== true` で停止していたことを確認。
15. E2Eのassertionを現行APIレスポンスに合わせ、`seller_id`条件を削除し、`net_amount`をNumber化して`5000`、`status='available'`を確認する最小修正を実施。コミット `6813eb89e47ea330ce8680b3bb36954ef41f5cdc`

## 現在のHEAD
`6813eb89e47ea330ce8680b3bb36954ef41f5cdc`

## 現在の問題 / CI
`6813eb...` はSeller earnings assertion修正直後。修正後のPostgres Acceptance実CI PASSはまだ未確認。

直前のAcceptance run `33225584659`:
- migration: PASS
- seller profile/earnings/payout E2E: FAIL
- 失敗原因: `earnings` APIレスポンスにない`seller_id`をE2Eが要求していたため `false !== true`
- その他のジョブ結果はこの記録だけでは再断定しない

## 次にやる作業（順番固定）
1. `6813eb...` のPostgres Acceptance run発生・結果を確認
2. Seller payout E2EがPASSしたか確認
3. FAILなら最新ログから原因を確定し、推測せず最小修正
4. 修正するたびにこのPROGRESS.mdを更新して保存
5. Seller payout E2E PASS後、Admin payout concurrencyを確認
6. Backup/Restore round-tripを同じAcceptanceで再確認
7. Postgres Acceptance全体PASSを確認
8. Backend Regression / Clean Install / Media Upload Validationを最新HEADでPASS確認
9. 全CI Green確認
10. PR #1本文のレビュー指摘と実装状態を照合
11. 最終レビュー
12. CI/レビューが全て問題なければMerge
13. Merge後mainで最終CI確認

## 作業上の注意
- CI Green前にMergeしない。
- Backup/RestoreをSeller payout問題のために不用意に変更しない。
- assertionを緩めて失敗を隠さない。今回の修正は現行APIが実際に返していない` seller_id`を要求していた誤assertionを除去したもの。
- 本番APIの自己Admin化を許可しない。
- テストfixtureと本番権限モデルを分離する。
- 現行APIの実装とE2Eの契約を直接照合してから修正する。
- 「PRに含まれる変更」と「ブランチ上のコミット」を区別する。
- 中断時には必ず現在のHEAD、CI状態、問題、次の1手、次の区切りを記録する。

## 次の区切り
**`6813eb...` に対するSeller payout E2Eの実CI PASS確認。**

## 完成条件
Backup/Restore、Media、Round-trip、Backend Regression、Postgres Acceptance、Clean Install、Media Upload Validationが全て最新HEADでPASSし、最終レビュー完了、Merge後main再検証完了まで完成扱いにしない。
