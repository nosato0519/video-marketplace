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

### Seller payout E2Eのこれまでの修正
1. audit APIのSELECTから`resource_id`が欠落 → `a.resource_id`追加済み。修正コミット `0dbe08499f1971e03aff0096ec941041e8a08740`
2. API返却順がcreated_at DESC → E2E期待順を`paid → processing → approved → reviewing`へ修正。`fd958636...`
3. `http-test-helpers.js`不足 → helper追加。`f8528fd772149ec23f24f730bbffaad925ac3d71`
4. 今回、helperが `{server, baseUrl}` を返すのにE2E側が`server`へオブジェクト全体を代入し、finallyの`server.close()`で`server.close is not a function`になることをコード上で確認。

## 現在のHEAD
`d978eb676622cc7e57e5cef1b60d2cff2d557e55`
直前HEAD `6027d09fdd8036eaf72c8bb4643d428dfd5a5ee1` から、Seller payout E2Eのserver/baseUrl受け取りを修正したコミット。

## 今回の修正
`http-seller-profile-earnings-payout-e2e-acceptance.js` の
`const server = await startServer(); const baseUrl = server.baseUrl;`
を
`const { server, baseUrl } = await startServer();`
へ修正。

これにより、finallyの`await server.close()`が実HTTP Serverを対象にする。
修正コミット: `d978eb676622cc7e57e5cef1b60d2cff2d557e55`

## 現在の問題 / CI
修正後のCI PASSはまだ未確認。
次は必ず最新HEAD `d978eb...` をcheckoutしたPostgres Acceptanceの結果を確認する。古いcommitのCI結果を最新結果として扱わない。

## 次にやる作業（順番固定）
1. `d978eb...` に対する最新CI発生状況を確認
2. Postgres Acceptance最新runを確認
3. Seller payout E2EがPASSしたか確認
4. FAILなら最新ログから原因を確定し、最小修正
5. 修正するたびにこのPROGRESS.mdを更新して保存
6. Seller payout E2E PASS後、Admin payout concurrencyを確認
7. Backup/Restore round-tripを同じAcceptanceで再確認
8. Postgres Acceptance全体PASSを確認
9. Backend Regression / Clean Install / Media Upload Validationを最新HEADでPASS確認
10. 全CI Green確認
11. PR #1本文の古いレビュー指摘を実装済み状態へ更新
12. 最終レビュー
13. CI/レビューが全て問題なければMerge
14. Merge後mainで最終CI確認

## 作業上の注意
- CI Green前にMergeしない。
- Backup/RestoreをSeller payout問題のために不用意に変更しない。
- assertionを緩めて失敗を隠さない。
- API仕様を確認してからテストを修正する。
- 「PRに含まれる変更」と「ブランチ上のコミット」を区別する。
- 中断時には必ず現在のHEAD、CI状態、問題、次の1手、次の区切りを記録する。

## 次の区切り
**最新HEADでSeller payout E2EがPASSすること。**
そこまで到達したら一度進捗を明確に報告する。

## 完成条件
Backup/Restore、Media、Round-trip、Backend Regression、Postgres Acceptance、Clean Install、Media Upload Validationが全て最新HEADでPASSし、最終レビュー完了、Merge後main再検証完了まで完成扱いにしない。
