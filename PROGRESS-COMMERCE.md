# Video Marketplace — Commerce作業進捗・再開チェックポイント

最終更新: 2026-08-29
対象リポジトリ: `nosato0519/video-marketplace`
現在確認した最新mainコミット: `58e726fb4785d10c56d79b3d983068fb4c223ec7`

## このファイルの目的
中断後に推測せずCommerce/決済作業を再開するための補助チェックポイント。既存の `PROGRESS.md` はPR #1 / Backup & Restore Hardeningの完成記録として残しているため、PR #1 Merge後に追加されたCommerce/Stripe作業はこのファイルで追跡する。

## 直前までに確認済み
- PR #1 / Backup & Restore Hardeningは `b48d309000171c05a2f4ddd9b0e721d3aa80cf55` でmainへMerge済み。
- Seller payout E2E / Admin payout concurrency regressionは主要AcceptanceでPASS確認済み。
- Stripe Provider RegistryとProvider Factoryの不整合修正: `7cbbeaa15969e1a406d0cb8f9f5fbae3c2c3dac6`
- Stripe Webhookの署名境界・正規化: `9f1722adac84f46825830e627cafa708379c9203`
- Stripe Webhook adapter hardening: `be2caeda036f9b44b59315fe5ccbc10eb8d6aea8`
- Stripe Webhook → Payment Settlement route接続: `7f87612746fcf25b25f33ae8147a5e7c1f308426`
- Stripe Webhook acceptance tests追加: `dfee2753c327559a058f65cf1a990d225916370c`
- Backend RegressionへCommerce acceptanceを追加: `d9134189f09fe023ef513d718da48210fa159286`
- Refund処理はtransaction型Refund、Entitlement revoke、refund冪等性テストまで実装済み。
- Stream / DownloadはEntitlement認可を通り、Entitlementがactiveでなければ拒否する実装とregression testが存在。

## 今回の実CI確認
- `d9134189...` のBackend Regression run `33233238614` は **FAIL**。
- `npm install`、migration preflight、migration、backup/restore acceptanceはPASS。
- `npm test` は187件中 **185 PASS / 2 FAIL**。
- FAILは `backend/src/payments/stripe-webhook.test.js` のStripe署名生成2件。
- 原因はStripe SDK 18.5.0の `generateTestHeaderString` がオブジェクト形式を要求するのに、旧テストが `generateTestHeaderString(body, secret)` の旧形式を使っていたこと。Stripeの現行ドキュメントでも `{ payload, secret }` 形式が示されている。
- 修正コミット: `58e726fb4785d10c56d79b3d983068fb4c223ec7`
- 修正内容: valid signature / unsupported event の2箇所を `generateTestHeaderString({ payload: body, secret })` に変更。
- 修正後のWorkflow Runは確認時点ではまだGitHub APIに出現しておらず、PASS未確認。

## 現在の状態
- Backup / Restore Hardening: **完成**
- Seller payout / payout concurrency: **主要CI PASS確認済み**
- Stripe Webhook基盤: **実装済み**
- Stripe Webhook acceptance: **テスト実装済み / 修正済み / 修正後CI PASS未確認**
- Refund / Entitlement revoke: **実装済み / 最新mainの購入→返金→HTTP拒否E2E PASS未確認**
- Commerce CI組み込み: **完了**
- 最新main全体のCI Green: **未確認**
- 最終セキュリティレビュー: **未完了**

## 残作業（優先順）
1. `58e726fb...` をHEADとするBackend Regressionの実行結果を取得しPASS/FAILを確定する。
2. Clean Install等、最新mainの他CI失敗も確認して修正する。
3. 購入→決済成功→Stream→Download→Refund→Entitlement revoke→Stream拒否→Download拒否のHTTP E2Eが存在するか確認し、不足なら追加する。
4. Refund後のSeller Earnings調整を実装・テスト確認する。
5. Payout済み後のRefundについて、会計・残高・二重計上防止を確認する。
6. Stripeイベント別の金額・通貨・Order/Payment紐付けを最終確認する。
7. Commerceを含むBackend Regressionを最新mainでPASS確認する。
8. Postgres Acceptance / Clean Install / Media Upload Validationを最新mainでPASS確認する。
9. 最終セキュリティレビューを実施する。
10. 全条件を満たすまでプロジェクト全体を「完成」と判定しない。

## 作業再開ルール
1. この `PROGRESS-COMMERCE.md` を読む。
2. mainのHEADと記録SHAを照合する。
3. CIは「テストが存在する」と「CI PASS」を分けて扱う。
4. 未確認事項は推測で完了扱いにしない。
5. 1区切り進めるたびにこのファイルを更新する。

## 次の1手
**`58e726fb...` のCI実行結果を確認する。まだRunが生成されていなければ待機ではなく、現在mainのCI設定・最新Workflow状態を確認して、実行される状態を確定する。PASSなら次に購入→返金→Stream/Download拒否のHTTP E2EとRefund後Seller Earnings整合性へ進む。**

## 完成条件
- Commerce acceptanceを含むBackend Regression PASS
- Postgres Acceptance PASS
- Clean Install PASS
- Media Upload Validation PASS
- 購入→返金→Stream/Download拒否のHTTP E2E PASS
- Refund後Seller Earnings / Payout整合性PASS
- Stripe Webhookの署名・冪等性・金額・Order/Payment紐付けPASS
- 最終セキュリティレビュー完了
- 最新mainの実体に対して上記を確認できるまで完成扱いにしない。
