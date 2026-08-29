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
- Backend Regression: PASS確認済み（最新fb9db系）
- Clean Install: PASS確認済み（最新fb9db系）
- Media Upload Validation: PASS確認済み（最新fb9db系）
- 通常テスト: 184/184 PASS確認済み

### Seller payout E2E
1. audit APIのSELECTから`resource_id`が欠落 → `a.resource_id`追加済み。修正コミット `0dbe08499f1971e03aff0096ec941041e8a08740`
2. API返却順がcreated_at DESC → E2E期待順を`paid → processing → approved → reviewing`へ修正。`fd958636...`
3. `http-test-helpers.js`不足 → helper追加。`f8528fd772149ec23f24f730bbffaad925ac3d71`
4. helperが`{server, baseUrl}`を返すのにE2E側がserverへオブジェクト全体を代入 → destructuringへ修正。`d978eb...`
5. 現行認証はregister時role=`buyer`固定、passwordはscrypt-v1、sessionはDB保存。自己Admin化を本番APIで許可する設計ではないことを確認。
6. 現行Admin payout routerは`requireAuth` + `requireRole('admin')`で保護されていることを確認。
7. Seller payout E2Eが存在しない`POST /api/admin/users/:id/role`に依存していたため、テストスクリプトからDB上のテストユーザーroleだけを`admin`へ設定する方式へ修正。登録直後のrole=`buyer`もassertし、その後再ログインしてrole=`admin`をassert。コミット `252519d9087d86079707524d360a2788ac5566ff`
8. Acceptance run `33224930339` はSeller payout E2Eが403で失敗。現行seller profile routerが`requireRole('seller')`であることを確認。
9. Seller payout E2Eを現行API契約に合わせて修正。seller role fixture、profile PATCH、DB earnings fixture等を追加。コミット `72013080e9fabcc79495dcc9a723df6656c3896d`
10. Acceptance run `33225584659` でearnings assertionが失敗。現行APIレスポンスに`seller_id`がないのにE2Eが要求していたことを確認。
11. `seller_id` assertionを削除し、`net_amount`をNumber化して5000、`status='available'`を確認する最小修正を実施。コミット `6813eb89e47ea330ce8680b3bb36954ef41f5cdc`。
12. その後 `PROGRESS.md` を更新し、HEAD追跡情報を同期。コミット `fb9db853a82b50d2817d8ec2824226532fc6124b`。
13. 最新Postgres Acceptance run `33225871903` で、Seller payout E2Eは **PASS** まで到達した。ログ上、`http-seller-profile-earnings-payout-e2e-acceptance: PASS` を確認。

## 現在のHEAD
`3c951f98103a9e8cb062449d9f1290b5bb28647b`

## 現在の問題 / CI
最新Acceptance run `33225871903` は、Seller payout E2Eを含む前半のテストを通過したが、`admin-payout-concurrency-regression` でFAILした。

失敗原因は明確で、回帰テストがAdmin payout router自身のソース内に `BEGIN` / `COMMIT` / `ROLLBACK` が直接記述されていることを要求していたため。現行実装は共有DB helper `withTransaction()` を使用しており、transaction境界の `BEGIN` / `COMMIT` / `ROLLBACK` は `backend/src/db.js` に存在する。Admin payout router側は `withTransaction()` と `SELECT ... FOR UPDATE` を使用している。

確認済み:
- migration: PASS
- commerce DB: PASS
- moderation DB: PASS
- moderation HTTP: PASS
- migration concurrency: PASS
- legacy purchase migration: PASS
- payment webhook/refund/failed: PASS
- auth: PASS
- buyer purchase E2E: PASS
- media access E2E: PASS
- buyer order report E2E: PASS
- seller product/media E2E: PASS
- **seller profile/earnings/payout E2E: PASS**
- admin payout concurrency regression: FAIL（回帰ガードの期待値が現行transaction helper設計と不一致）
- backup/restore acceptance: skipped（上記FAILで後続停止）

## 今回の修正
`backend/scripts/admin-payout-concurrency-regression.js` の回帰ガードを、現行設計に合わせて修正した。

変更内容:
- Admin payout routerに`withTransaction`が使用されていることを確認
- `SELECT id, status FROM payouts WHERE id = $1 FOR UPDATE` を確認
- `UPDATE payouts` を確認
- transaction境界の `BEGIN` / `COMMIT` / `ROLLBACK` は共有helper `backend/src/db.js` 側で確認

修正コミット:
`3c951f98103a9e8cb062449d9f1290b5bb28647b`

## 次にやる作業（順番固定）
1. `3c951f...` を含む最新HEADのPostgres Acceptance結果を確認
2. Admin payout concurrency regressionがPASSしたか確認
3. FAILなら最新ログから原因を確定し、推測せず最小修正
4. 修正するたびにこのPROGRESS.mdを更新して保存
5. Admin payout concurrency PASS後、Backup/Restore acceptanceを確認
6. Postgres Acceptance全体PASSを確認
7. Backend Regression / Clean Install / Media Upload Validationを最新HEADでPASS確認
8. 全CI Green確認
9. PR #1本文のレビュー指摘と実装状態を照合
10. 最終レビュー
11. CI/レビューが全て問題なければMerge
12. Merge後mainで最終CI確認

## 作業上の注意
- CI Green前にMergeしない。
- Backup/RestoreをSeller payout問題のために不用意に変更しない。
- assertionを緩めて失敗を隠さない。今回の修正はtransaction実装の実態に合わせた回帰ガード修正。
- 本番APIの自己Admin化を許可しない。
- テストfixtureと本番権限モデルを分離する。
- 現行APIの実装とE2Eの契約を直接照合してから修正する。
- 「PRに含まれる変更」と「ブランチ上のコミット」を区別する。
- 中断時には必ず現在のHEAD、CI状態、問題、次の1手、次の区切りを記録する。

## 次の区切り
**`3c951f...` に対するAdmin payout concurrency regressionの実CI PASS確認。**

## 完成条件
Backup/Restore、Media、Round-trip、Backend Regression、Postgres Acceptance、Clean Install、Media Upload Validationが全て最新HEADでPASSし、最終レビュー完了、Merge後main再検証完了まで完成扱いにしない。
