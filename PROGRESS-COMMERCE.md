# Video Marketplace — Commerce作業進捗・再開チェックポイント

最終更新: 2026-08-29
対象リポジトリ: `nosato0519/video-marketplace`

## 現在地点
- 最新作業コミット: `c3afe0ba7db3d0fb26dc89b78361cc256feaa0fe`
- Backend Regression run: `33238457470` (#565)
- Job: `99063520036`
- CIは現在 **Seller Earnings / Payout E2E 実行中**。

## 今回の確認結果
PASS済み:
- npm install
- migrate:preflight
- migrate
- backup/restore round-trip acceptance
- `npm test`: **187/187 PASS**
- authentication HTTP acceptance
- payment webhook acceptance
- payment failure acceptance
- payment refund acceptance
- buyer purchase E2E
- seller product/media E2E

実行中:
- seller earnings and payout E2E

未実行:
- admin payout concurrency regression
- media authorization regression
- media upload validation regression
- media access HTTP acceptance

## 直前の修正
前回CIではSeller Earnings/Payout E2Eが `MEDIA_URL_SECRET` 不足で起動失敗していたため、CI専用のテスト環境変数をworkflowへ追加した。
- `MEDIA_STORAGE_PROVIDER=local`
- `MEDIA_STORAGE_DIR=./media-data`
- `MEDIA_URL_SECRET=ci-test-media-url-secret-not-for-production`
- `PAYMENT_PROVIDER=mock`
- `PAYMENT_WEBHOOK_SECRET=ci-test-payment-webhook-secret`

この修正により、今回のrunではSeller Earnings/Payout E2Eまで到達している。

## これまでの完成済み領域
- Backup / Restore Hardening
- Seller payout / payout concurrencyの主要実装・テスト
- Stripe Provider Registry / Factory
- Stripe Webhook署名検証・正規化・adapter hardening
- Stripe Webhook → Payment Settlement接続
- Refund transaction / Entitlement revoke / refund冪等性
- Stream / DownloadのEntitlement認可
- Commerce acceptanceのCI組み込み

## 残作業（優先順）
1. run `33238457470` のSeller Earnings/Payout E2E結果を確定。
2. PASSならAdmin payout concurrency regressionを確認。
3. Media authorization regressionを確認。
4. Media upload validation regressionを確認。
5. Media access HTTP acceptanceを確認。
6. 購入→決済→Stream→Download→Refund→Entitlement revoke→Stream拒否→Download拒否の一連HTTP E2Eが完全に確認できているか点検。不足なら追加。
7. Refund後Seller Earnings調整・Payout済み後Refundの残高/会計整合性・二重計上防止を点検。
8. Stripeイベントの金額・通貨・Order/Payment紐付け・冪等性を最終確認。
9. Postgres Acceptance / Clean Install / Media Upload Validationを最新mainでPASS確認。
10. 最終セキュリティレビュー。
11. 全CIと最終条件がPASSするまで「完成」と判定しない。

## 再開手順
1. このファイルを最初に読む。
2. main HEADと上記最新作業コミットを照合。
3. run `33238457470` の最新job状態を確認。
4. 実行中なら結果を待って次へ進む。
5. FAILならログから原因を特定し、修正→CI再実行。
6. PASSなら残作業の上から1つずつ進める。
7. 進捗が変わるたび、このファイルの「現在地点」「PASS済み」「実行中」「未実行」「残作業」を更新する。
8. テストが存在することと、CIでPASSしたことを混同しない。

## 完成条件
- Commerce acceptanceを含むBackend Regression PASS
- Postgres Acceptance PASS
- Clean Install PASS
- Media Upload Validation PASS
- 購入→返金→Stream/Download拒否HTTP E2E PASS
- Refund後Seller Earnings / Payout整合性PASS
- Stripe Webhookの署名・冪等性・金額・Order/Payment紐付けPASS
- 最終セキュリティレビュー完了
- 最新mainの実体で上記を確認済み
