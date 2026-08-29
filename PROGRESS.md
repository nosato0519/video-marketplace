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
- tar展開のpath traversal対策: 完了
- tar展開時のsymlink/hardlink/device等の特殊エントリ拒否: **実装済み、CI未確認**
- pg_restore復元先DB明示: 完了
- Backup→Restore round-trip acceptance: 実装済み、実CI PASS確認済み

### CI
- Backend Regression: PASS確認済み（`f47e1f...` 系）
- Clean Install: PASS確認済み（`f47e1f...` 系）
- Media Upload Validation: PASS確認済み（`f47e1f...` 系）
- Postgres Acceptance: PASS確認済み（`f47e1f...` 系）
- 通常テスト: 184/184 PASS確認済み
- **今回追加したmedia restore security acceptance: CI未確認**

### Seller payout E2E
- resource_id、audit順序、HTTP helper、server/baseUrl、Admin fixture、Seller role fixture、profile API契約、earnings fixtureを修正済み。
- `seller_id` assertion不整合を修正済み。
- 最新Postgres AcceptanceでSeller payout E2E PASS確認済み。
- Admin payout concurrency regressionは共有transaction helper設計に合わせて回帰ガードを修正済み、最新AcceptanceでPASS確認済み。

## 現在のHEAD
今回の最新変更は以下の順でコミット済み:
- `57e7c58c1c66afce1f63177b75c52960fa313cc` — media restoreのtar archive type validationを強化
- `a591b7c5beacfbb679018f3c9651663bc8bcda73` — media restore security acceptance追加
- `30998c3493e91d95f19d86433050b90d81c7a2b1` — acceptance npm script追加
- `PROGRESS.md` 更新コミット: **このコミット**

## 現在の問題 / CI
`f47e1f...` 時点では主要CIはGreenだったが、media restoreについてレビューでsymlink/hardlink/device等のarchive entryを拒否することが求められていた。

今回、`restore-media-local.js` の事前検証を `tar -tvzf` ベースに変更し、以下を拒否するようにした:
- path traversal / absolute path
- regular file / directory以外のtar entry
- ` -> ` を含むlink entry
- ` link to ` を含むhardlink entry

さらに `restore-media-security-acceptance.js` を追加し、symlink archiveとhardlink archiveがrestore時に拒否されることを自動検証するようにした。

## 今回の修正
1. `restore-media-local.js` をarchive type-aware validationへ変更。
2. `restore-media-security-acceptance.js` を新規追加し、symlink/hardlink archive rejectionを検証。
3. `backend/package.json` に `test:restore-media-security-acceptance` を追加。
4. `PROGRESS.md` を更新し、実装済みとCI未確認を明確に記録。

## 次にやる作業（順番固定）
1. 最新HEADでCIが起動したことを確認。
2. media restore security acceptanceがPASSしたか確認。
3. Postgres Acceptance全体が最新HEADでPASSしたか確認。
4. Backend Regression / Clean Install / Media Upload Validationを最新HEADでPASS確認。
5. FAILなら最新ログから原因を確定し、推測せず最小修正。
6. 修正するたびにこのPROGRESS.mdを更新して保存。
7. 全CI Green確認後、PR #1本文のレビュー指摘と実装状態を照合。
8. 最終レビュー。
9. CI/レビューが全て問題なければMerge。
10. Merge後mainで最終CI確認。

## 作業上の注意
- CI Green前にMergeしない。
- Backup/RestoreをSeller payout問題のために不用意に変更しない。
- assertionを緩めて失敗を隠さない。
- 本番APIの自己Admin化を許可しない。
- テストfixtureと本番権限モデルを分離する。
- 現行APIの実装とE2Eの契約を直接照合してから修正する。
- 「PRに含まれる変更」と「ブランチ上のコミット」を区別する。
- 中断時には必ず現在のHEAD、CI状態、問題、次の1手、次の区切りを記録する。

## 次の区切り
**最新HEADでmedia restore security acceptanceを含む全CIがPASSすること。**

## 完成条件
Backup/Restore、Media、Round-trip、Backend Regression、Postgres Acceptance、Clean Install、Media Upload Validationが全て最新HEADでPASSし、最終レビュー完了、Merge後main再検証完了まで完成扱いにしない。
