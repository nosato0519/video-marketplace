# Video Marketplace — Commerce作業進捗・再開チェックポイント

最終更新: 2026-08-29
対象リポジトリ: `nosato0519/video-marketplace`

## 現在地点
- 作業ブランチ: `feat/seller-application-main-integration`
- **現在のブランチHEAD: `0c9a263b330cd4384dca93b55a2f0198bcf0786d`**
- `0c9a263...` は `60335e3509308bd9d8c787637c4aee1783a89040` の後続2コミットで、比較結果は `ahead_by=2 / behind_by=0`。
- 後続2コミットの差分は `PROGRESS-COMMERCE.md` の進捗記録のみ。したがって、Seller Application機能修正コード自体は `60335e35...` のPASS済み実体と同じ。
- `main` からは `ahead_by=33 / behind_by=0`。
- `main` のHEADは `72eb8749cc2ceaed7a95c9c120f75afec213aeb9`。

## Seller Application 修正
DBのsnake_caseをAPIのcamelCaseへ明示変換。
- `display_name` → `displayName`
- `legal_name` → `legalName`
- `country_code` → `countryCode`

修正コミット: `60335e3509308bd9d8c787637c4aee1783a89040`

## CIで確認済み
### Backend Regression #572
- Run: `33240799588`
- Job: `99069696788`
- 対象: `60335e35...`
- 結論: **success**
- npm test: **187/187 PASS**
- migration / backup-restore / Auth / Payment / Purchase / Seller / Payout / Media系 acceptance 全項目PASS

### Backend Browser Acceptance #25
- Run: `33240799560`
- Job: `99069696869`
- 対象: `60335e35...`
- 結論: **success**
- Playwright / Chromium / DB migration / Backend / Frontend proxy / real backend browser acceptance 全項目PASS

### Seller Application Acceptance #3
- Run: `33240799558`
- 対象: `60335e35...`
- 結論: **success**

## 現在の重要な判断
- `72eb8749...` は現在ブランチHEADではなく、`main`のHEAD。
- 現在ブランチHEADは **`0c9a263...`**。
- `60335e35...` は現在ブランチの祖先であり、その後は進捗ドキュメントだけが2コミット追加されている。
- よって上記3つのPASS結果は、現在ブランチの機能コードに対する有効な検証結果として扱える。
- ただし、mainへ統合済みとは扱わない。現在ブランチはmainより33コミットahead。

## 残作業
1. 現在ブランチHEAD `0c9a263...` に対する必要CIが発火済みか確認。
2. Clean Install / Postgres migration acceptanceを確認。
3. 購入→決済→Stream→Download→Refund→Entitlement revoke→Stream拒否→Download拒否の一連HTTP E2Eを確認。
4. Refund後Seller Earnings調整を確認。
5. Payout済み後Refundの残高・会計整合性・二重計上防止を確認。
6. Stripeイベントの署名・金額・通貨・Order/Payment紐付け・冪等性を最終確認。
7. Media Upload Validationを最新ブランチでPASS確認。
8. 最終セキュリティレビュー。
9. 全条件がPASSするまで完成判定しない。
10. 問題なければPR/merge準備。

## 再開手順
1. このファイルを読む。
2. `feat/seller-application-main-integration` のHEADを取得。
3. HEADが `0c9a263...` 以降に進んでいれば、そのSHAを新しい基準にする。
4. CIはテストの存在とPASSを分けて確認する。
5. FAILならログ→原因特定→最小修正→CI再実行。
6. PASSなら残作業を上から1つ進める。
7. 進捗が変わるたび、このファイルを更新する。
8. 中断後は推測せず、GitHub上のHEAD・CI Run・このファイルを照合して再開する。

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
- mainへの統合可否を確認
