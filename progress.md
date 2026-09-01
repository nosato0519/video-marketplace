# Video Marketplace – 開発進捗ログ

最終更新: 2026-09-01

## 現在の作業基準
- リポジトリ: `nosato0519/video-marketplace`
- 主要PR: #13
- 作業ブランチ: `ci/buyer-real-browser-acceptance`
- 最新コミット: `7e993b7c0edda70470970cd6a9a8c5c87b62cc6b`
- 作業方針: 必要な修正のみ。既存テスト・実装を重複して作り直さない。

## Buyer実Backend Browser Acceptance
- 実DB + Session + 商品表示 + Order + 決済Webhook + Entitlement + Library + Watch + Download の一連テストを実装済み。
- CI用 `DATABASE_URL`、media/payment secrets、FK cleanup 修正済み。
- SPA hash route 対応済み。
- Library見出し期待値を修正済み。
- 直近CIでBrowse/Watchが失敗。
- 原因を特定: catalog/product detail のSQLが `product_translations` のfallback行を必須としているため、Acceptance seedに翻訳がないと実商品が一覧・詳細から消える。
- 今回、英語 `product_translations` をAcceptance seedへ追加して修正。

## CI
- `.github/workflows/backend-browser-acceptance.yml` はBuyer実Backend Acceptanceを実行する構成。
- 直近実測ではDB、migration、backend、health、commerce、entitlement等は通過し、BrowserのBrowse/Watchで失敗した。
- 最新修正後のCI再実測が次の作業。

## 次の作業
1. 最新Buyer修正のCI結果を確認。
2. GREENならBuyer完了としてSeller/Adminへ移行。
3. FAILなら新しい失敗ログだけを修正。
4. Seller/Admin、決済・Refund/Payout、Security、Release Gateを確認。
