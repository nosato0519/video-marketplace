# Video Marketplace — Commerce作業進捗・再開チェックポイント

最終更新: 2026-08-29
対象リポジトリ: `nosato0519/video-marketplace`

## 現在地点
- 最新mainコミット: `c3afe0ba7db3d0fb26dc89b78361cc256feaa0fe`
- Backend Regression run: `33238457470` (#565)
- Job: `99063520036`
- Backend Regressionは完了済み。主要Commerce/Media系ステップをPASS確認。

## 今回の確認結果
PASS済み（run `33238457470`）:
- npm install
- migrate:preflight
- migrate
- backup/restore round-trip acceptance
- `npm test`
- authentication HTTP acceptance
- payment webhook acceptance
- payment failure acceptance
- payment refund acceptance
- buyer purchase E2E
- seller product/media E2E
- seller earnings and payout E2E
- admin payout concurrency regression
- media authorization regression
- media upload validation regression
- media access HTTP acceptance

PASS済み（別の実Backend Browser Acceptance run）:
- PostgreSQL / migration
- Backend起動・疎通
- Frontend proxy
- real backend browser acceptance
- cleanup

## 直前の修正
CIでSeller Earnings/Payout E2Eが`MEDIA_URL_SECRET`不足で起動失敗していたため、CI専用環境変数をworkflowへ追加した。
- `MEDIA_STORAGE_PROVIDER=local`
- `MEDIA_STORAGE_DIR=./media-data`
- `MEDIA_URL_SECRET=ci-test-media-url-secret-not-for-production`
- `PAYMENT_PROVIDER=mock`
- `PAYMENT_WEBHOOK_SECRET=ci-test-payment-webhook-secret`

その後のBackend Regression run `33238457470`ではSeller Earnings/Payout以降も成功した。

## これまでの完成済み領域
- Backup / Restore Hardening
- Seller payout / payout concurrencyの主要実装・テスト
- Stripe Provider Registry / Factory
- Stripe Webhook署名検証・正規化・adapter hardening
- Stripe Webhook → Payment Settlement接続
- Refund transaction / Entitlement revoke / refund冪等性テスト実装
- Stream / DownloadのEntitlement認可
- Commerce acceptanceのCI組み込み

## 未確認／最終確認対象（優先順）
1. 購入→決済→Stream→Download→Refund→Entitlement revoke→Stream拒否→Download拒否の完全HTTP E2Eが最新mainで完全に確認できているか点検。
2. Refund後Seller Earnings調整・Payout済み後Refundの残高/会計整合性・二重計上防止を点検。
3. Stripeイベントの金額・通貨・Order/Payment紐付け・署名・冪等性を最終確認。
4. Postgres Acceptance / Clean Install / Media Upload Validationを最新mainでPASS確認（Clean InstallとMedia Upload ValidationはBackend RegressionでPASS済み。Postgres fresh DBはRegression環境で確認済み）。
5. 最終セキュリティレビュー。
6. 最新mainの実体で上記を確認し、全条件を満たすまで「完成」と判定しない。

## 再開手順
1. このファイルを最初に読む。
2. main HEADと記載の最新mainコミットを照合。
3. Backend Regression run `33238457470`と関連Browser Acceptanceの状態を確認。
4. 実行済みなら、未確認／最終確認対象の上から進める。
5. FAILならログから原因を特定し、修正→CI再実行。
6. 進捗が変わるたび、このファイルの「現在地点」「PASS済み」「未確認／最終確認対象」を更新する。
7. テストが存在することと、CIでPASSしたことを混同しない。

## 完成条件
- Commerce acceptanceを含むBackend Regression PASS
- Postgres Acceptance / fresh DB確認
- Clean Install PASS
- Media Upload Validation PASS
- 購入→返金→Stream/Download拒否HTTP E2E PASS
- Refund後Seller Earnings / Payout整合性PASS
- Stripe Webhookの署名・冪等性・金額・Order/Payment紐付けPASS
- 最終セキュリティレビュー完了
- 最新mainの実体で上記を確認済み
