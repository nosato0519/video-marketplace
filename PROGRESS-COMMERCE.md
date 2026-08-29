# Video Marketplace — Commerce作業進捗・再開チェックポイント

最終更新: 2026-08-29
対象リポジトリ: `nosato0519/video-marketplace`

## 現在地点
- 現在の作業HEAD: `72eb8749cc2ceaed7a95c9c120f75afec213aeb9`
- 直前の機能修正コミット: `60335e3509308bd9d8c787637c4aee1783a89040`
- `60335e35...` に対する Backend Regression #572 は **PASS**。
- `60335e35...` に対する Backend Browser Acceptance #25 は **PASS**。
- Seller Application Acceptance #3 は **PASS**。

## 直前の重要修正
Seller Application APIのDB snake_caseフィールドをAPI camelCaseへ変換。
- `display_name` → `displayName`
- `legal_name` → `legalName`
- `country_code` → `countryCode`

これにより、実Backend + ChromiumのBrowser AcceptanceでSeller ApplicationフローがPASSした。

## CIで確認済み
### Backend Regression #572
Run: `33240799588`
対象コミット: `60335e3509308bd9d8c787637c4aee1783a89040`
結論: **success**

確認済み:
- npm install
- migration preflight / migration
- backup/restore
- `npm test` 187/187 PASS
- Authentication
- Payment Webhook
- Payment Failure
- Payment Refund
- Buyer Purchase
- Seller Product / Media
- Seller Earnings / Payout
- Admin payout concurrency
- Media authorization
- Media upload validation
- Media access HTTP

### Backend Browser Acceptance #25
Run: `33240799560`
対象コミット: `60335e3509308bd9d8c787637c4aee1783a89040`
結論: **success**

確認済み:
- dependency install
- Playwright / Chromium
- DB migration
- Backend起動
- Frontend proxy起動
- **real backend browser acceptance PASS**

### Seller Application Acceptance #3
Run: `33240799558`
対象コミット: `60335e3509308bd9d8c787637c4aee1783a89040`
結論: **success**

## 現在の注意点
- 上記PASSは `60335e35...` の実体に対するもの。
- 現在HEAD `72eb8749...` 自身については、これらのCI結果を自動的にPASS扱いしない。
- 最新HEADで再度CIが走ることを確認し、結果を確定する。
- テストが存在することと、CIでPASSしたことを混同しない。

## 残作業（優先順）
1. 現在HEAD `72eb8749...` に対する Backend Regression / Browser Acceptance のCI結果を確認。
2. Clean Install / Postgres系の最新HEAD CIを確認。
3. 購入→決済→Stream→Download→Refund→Entitlement revoke→Stream拒否→Download拒否の一連HTTP E2Eを最新HEADで完全確認。
4. Refund後Seller Earnings調整を確認。
5. Payout済み後Refundの残高・会計整合性・二重計上防止を確認。
6. Stripeイベントの金額・通貨・Order/Payment紐付け・冪等性を最終確認。
7. Media Upload Validationを最新HEADでPASS確認。
8. 最終セキュリティレビュー。
9. 全CIと最終条件がPASSするまで「完成」と判定しない。

## 再開手順
1. このファイルを最初に読む。
2. ブランチHEADを確認する。
3. 上記の最新HEADとCI対象SHAを照合する。
4. 最新HEADのCIがあればRun IDと結論を確認する。
5. FAILならログから原因を特定し、修正→CI再実行。
6. PASSなら残作業の上から1つずつ進める。
7. 進捗が変わるたび、このファイルの「現在地点」「CIで確認済み」「注意点」「残作業」を更新する。
8. 中断後は推測せず、このファイルと最新HEAD/CIを基準に再開する。

## 完成条件
- Commerce acceptanceを含むBackend Regression PASS
- Browser Acceptance PASS
- Postgres Acceptance PASS
- Clean Install PASS
- Media Upload Validation PASS
- 購入→返金→Stream/Download拒否HTTP E2E PASS
- Refund後Seller Earnings / Payout整合性PASS
- Stripe Webhookの署名・冪等性・金額・Order/Payment紐付けPASS
- 最終セキュリティレビュー完了
- 最新mainの実体で上記を確認済み
