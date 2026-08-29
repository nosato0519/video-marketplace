# Video Marketplace — Commerce作業進捗・再開チェックポイント

最終更新: 2026-08-29
対象リポジトリ: `nosato0519/video-marketplace`
現在確認した最新コミット: `d9134189f09fe023ef513d718da48210fa159286`

## このファイルの目的
中断後に推測せずCommerce/決済作業を再開するための補助チェックポイント。既存の `PROGRESS.md` はPR #1 / Backup & Restore Hardeningの完成記録として残っているため、PR #1 Merge後に追加されたCommerce/Stripe作業はこのファイルで追跡する。

## 直前までに確認済み
- PR #1 / Backup & Restore Hardeningは `b48d309000171c05a2f4ddd9b0e721d3aa80cf55` でmainへMerge済み。既存 `PROGRESS.md` に完成根拠が記録されている。
- Seller payout E2E / Admin payout concurrency regressionは主要AcceptanceでPASS確認済み。
- Stripe Provider RegistryとProvider Factoryの不整合修正: `7cbbeaa15969e1a406d0cb8f9f5fbae3c2c3dac6`
- Stripe Webhookの署名境界・正規化: `9f1722adac84f46825830e627cafa708379c9203`
- Stripe Webhook adapter hardening: `be2caeda036f9b44b59315fe5ccbc10eb8d6aea8`
- Stripe Webhook → Payment Settlement route接続: `7f87612746fcf25b25f33ae8147a5e7c1f308426`
- Stripe Webhook acceptance tests追加: `dfee2753c327559a058f65cf1a990d225916370c`
- Backend Regressionへpayment webhook / payment failed / payment refund / buyer purchase / seller earnings-payout / payout concurrency acceptanceを追加: `d9134189f09fe023ef513d718da48210fa159286`
- Stripe Webhook acceptance testでは、valid signature、invalid signature、unsupported eventをHTTP経路で検証するコードが存在することを確認済み。
- Refund処理はGit履歴上、transaction型Refund、Entitlement revoke、refund冪等性テストまで実装されていることを確認済み。
- Stream / DownloadはEntitlement認可を通り、Entitlementがactiveでなければ拒否する実装とprotected-access regression testが存在することを確認済み。

## 今回確認したこと
- `d9134189...` の変更は `.github/workflows/backend-regression.yml` にCommerce acceptanceを追加したもの。追加された実行項目は payment webhook / failed / refund / buyer purchase / seller product media / seller earnings-payout / admin payout concurrency。
- `d9134189...` のCombined Statusは **0件**。したがって最新Commerce CIはPASSともFAILとも未確認。
- GitHubの最新コミット検索では、`d9134189...` が現在確認できる最新コミット。これより新しいコミットは今回の確認では取得されていない。
- 現行 `PROGRESS.md` はPR #1の完成記録が中心で、`d9134189...` 以降のCommerce作業を反映していない。そのためこのファイルを補助記録として追加した。

## 現在の状態
- Backup / Restore Hardening: **完成（既存PROGRESS.mdの記録）**
- Seller payout / payout concurrency: **主要CI PASS確認済み**
- Stripe Webhook基盤: **実装済み**
- Stripe Webhook acceptance: **テスト実装済み / 最新main CI PASS未確認**
- Refund / Entitlement revoke: **実装済み / 最新mainの購入→返金→HTTP拒否E2E PASS未確認**
- Commerce CI組み込み: **完了**
- 最新main全体のCI Green: **未確認**
- 最新main全体の最終セキュリティレビュー: **未完了**

## 残作業（優先順）
1. 最新mainのCommerce CI実行結果を取得してPASS/FAILを確定する。
2. 購入→決済成功→Stream→Download→Refund→Entitlement revoke→Stream拒否→Download拒否のHTTP E2Eが存在するか確認し、不足なら追加する。
3. Refund後のSeller Earnings調整を実装・テスト確認する。
4. Payout済み後のRefundについて、会計・残高・二重計上防止を確認する。
5. Stripeイベント別の金額・通貨・Order/Payment紐付けを最終確認する。
6. Commerceを含むBackend Regressionを最新mainでPASS確認する。
7. 最終セキュリティレビューを実施する。
8. 全条件を満たすまでプロジェクト全体を「完成」と判定しない。

## 作業中断からの再開手順
1. この `PROGRESS-COMMERCE.md` を読む。
2. GitHubでmainのHEADを確認し、最新確認SHA `d9134189...` と照合する。
3. `PROGRESS.md` も読み、PR #1 / Backup & Restore Hardeningの完成記録を確認する。
4. `d9134189...` 以降に新しいコミットがあれば、そのコミットを基準に状態を更新する。
5. CIは「テストが存在する」と「CI PASS」を分けて扱う。
6. 未確認事項は推測で完了扱いにしない。
7. 作業を1区切り進めるたびに、このファイルを更新する。

## 次の1手
**最新mainでBackend Regression / Commerce acceptanceのWorkflow Runを取得し、最初の実FAILがあればログから原因を確定して最小修正する。FAILがなければ、次に購入→返金→Stream/Download拒否のHTTP E2Eの有無を確認する。**

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
