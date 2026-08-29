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
4. helperが`{server, baseUrl}`を返すのにE2E側がserverへオブジェクト全体を代入していた → `const { server, baseUrl } = await startServer();`へ修正。`d978eb...`
5. 最新Postgres Acceptanceで上記修正後もAdmin昇格部分が`403 forbidden` → E2Eが呼ぶ`POST /api/admin/users/:id/role`は現行`app.js`/Admin routerに存在しないことを確認。
6. 現行認証は`/api/auth/register`でrole=`buyer`固定、パスワードはscrypt-v1、sessionはDB保存。自己Admin化を本番APIで許可する設計ではないことを確認。
7. 現行Admin payout routerは`requireAuth` + `requireRole('admin')`で保護され、`/api/admin/payouts`系のみを提供していることを確認。
8. Seller payout E2EのAdmin fixtureを、存在しないrole変更APIではなく、テストスクリプトからDBのテストユーザーroleだけを`admin`へ設定する方式へ修正。登録直後のrole=`buyer`もassertし、その後DB更新→再ログインしてrole=`admin`をassertする。
9. 上記修正コミット: `252519d9087d86079707524d360a2788ac5566ff`

## 現在のHEAD
最新HEADは `252519d9087d86079707524d360a2788ac5566ff`。
PR #1のhead branchは `hardening/backup-restore`。

## 現在の問題 / CI
`252519d...` のSeller payout E2E修正後のPostgres Acceptance実CI PASSはまだ未確認。
以前のPostgres AcceptanceではAdmin昇格で403になっていたため、今回そのE2E fixtureを現行API設計に合わせて修正した。

## 次にやる作業（順番固定）
1. 最新HEAD `252519d...` のPostgres Acceptance run発生・結果を確認
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
- assertionを緩めて失敗を隠さない。
- 本番APIの自己Admin化を許可しない。
- テスト用Admin fixtureと本番権限モデルを分離する。
- API仕様を確認してからテストを修正する。
- 「PRに含まれる変更」と「ブランチ上のコミット」を区別する。
- 中断時には必ず現在のHEAD、CI状態、問題、次の1手、次の区切りを記録する。

## 次の区切り
**最新HEADでSeller payout E2EがPASSすること。**
そこまで到達したら一度進捗を明確に報告する。

## 完成条件
Backup/Restore、Media、Round-trip、Backend Regression、Postgres Acceptance、Clean Install、Media Upload Validationが全て最新HEADでPASSし、最終レビュー完了、Merge後main再検証完了まで完成扱いにしない。